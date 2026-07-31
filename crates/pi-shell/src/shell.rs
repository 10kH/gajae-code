//! Runtime-agnostic brush shell execution.

#[cfg(test)]
use std::time::Instant;
use std::{
	collections::{HashMap, HashSet, VecDeque},
	fs,
	io::{self, Write},
	str,
	sync::{
		Arc, LazyLock, Mutex as StdMutex,
		atomic::{AtomicBool, AtomicUsize, Ordering},
	},
	time::Duration,
};

use anyhow::{Error, Result};
use brush_builtins::{BuiltinSet, default_builtins};
use brush_core::{
	ExecutionContext, ExecutionControlFlow, ExecutionExitCode, ExecutionResult,
	ExternalCommandProcessObserver, ProcessGroupPolicy, ProfileLoadBehavior, RcLoadBehavior,
	Shell as BrushShell, ShellValue, ShellVariable, SourceInfo, builtins,
	env::EnvironmentScope,
	openfiles::{self, OpenFile, OpenFiles},
};
use bytes::Bytes;
use clap::Parser;
#[cfg(not(unix))]
use tokio::io::AsyncReadExt as _;
use tokio::{
	sync::{Mutex as TokioMutex, Notify, Semaphore, mpsc},
	time,
};
use tokio_util::sync::CancellationToken;

#[cfg(windows)]
use crate::windows::configure_windows_path;
use crate::{
	cancel::{AbortReason, AbortToken, CancelToken},
	minimizer, process,
};

struct ShellSessionCore {
	shell: BrushShell,
}

const MAX_OWNED_COMMAND_PROCESSES: usize = 4096;
const MAX_PENDING_SHELL_RUNS: usize = 64;
const MAX_OWNED_PROCESS_GROUP_ANCHORS: usize = MAX_OWNED_COMMAND_PROCESSES;
const SNAPSHOT_BARRIER_YIELDS: usize = 16;
static SHELL_RUN_SLOTS: LazyLock<Arc<Semaphore>> =
	LazyLock::new(|| Arc::new(Semaphore::new(MAX_PENDING_SHELL_RUNS)));
// One GJC session owns one process; this process-wide semaphore is therefore
// the producer boundary shared by persistent and one-shot shell entrypoints.
const OWNERSHIP_SIGNAL_AMBIGUITY: usize = 1;
const OWNERSHIP_PIN_FAILED: usize = 1 << 1;
const OWNERSHIP_RETIRED_GROUP: usize = 1 << 2;
const OWNERSHIP_OBSERVED_WITHOUT_TARGET: usize = 1 << 3;
const OWNERSHIP_MISSING_PID: usize = 1 << 4;
const OWNERSHIP_NO_DURABLE_CONTAINMENT: usize = 1 << 5;
const OWNERSHIP_DESCENDANT_SCAN_FAILED: usize = 1 << 6;
const OWNERSHIP_LATE_SPAWN: usize = 1 << 7;
const OWNERSHIP_GROUP_ANCHOR_LIMIT: usize = 1 << 8;

#[cfg(unix)]
fn ambient_process_group_id() -> i32 {
	// SAFETY: `getpgrp` has no arguments and returns the caller's process group id.
	unsafe { libc::getpgrp() }
}

#[cfg(not(unix))]
const fn ambient_process_group_id() -> i32 {
	-1
}
#[derive(Default)]
struct CommandProcessState {
	processes:                StdMutex<HashMap<i32, process::Process>>,
	cancelled:                AtomicBool,
	finished:                 AtomicBool,
	monitor_started:          AtomicBool,
	overflowed:               AtomicBool,
	group_unproven:           AtomicBool,
	unsettled_spawns:         AtomicUsize,
	ownership_reasons:        AtomicUsize,
	spawn_observed:           AtomicBool,
	descendant_scan_failed:   AtomicBool,
	shutdown:                 CancellationToken,
	finalizing:               AtomicBool,
	inflight_spawn_callbacks: AtomicUsize,
	group_anchors:            StdMutex<HashMap<i32, (i32, String)>>,
	execution_cancel:         CancellationToken,
	settlement_changed:       Notify,
}

struct SpawnCallbackGuard(Arc<CommandProcessState>);

impl Drop for SpawnCallbackGuard {
	fn drop(&mut self) {
		self
			.0
			.inflight_spawn_callbacks
			.fetch_sub(1, Ordering::SeqCst);
		self.0.settlement_changed.notify_waiters();
	}
}

#[derive(Clone, Default)]
struct CommandProcessGroups {
	state: Arc<CommandProcessState>,
}

impl CommandProcessGroups {
	fn new(shutdown: CancellationToken, execution_cancel: CancellationToken) -> Self {
		Self {
			state: Arc::new(CommandProcessState { shutdown, execution_cancel, ..Default::default() }),
		}
	}

	fn shutdown_token(&self) -> CancellationToken {
		self.state.shutdown.clone()
	}

	fn mark_unproven(state: &CommandProcessState, reason: usize) {
		state.group_unproven.store(true, Ordering::SeqCst);
		state.ownership_reasons.fetch_or(reason, Ordering::SeqCst);
	}

	fn signal_process(state: &Arc<CommandProcessState>, process: &process::Process, signal: i32) {
		if process
			.kill_tree_exact_bounded(signal, MAX_OWNED_COMMAND_PROCESSES)
			.is_none()
		{
			Self::mark_unproven(state, OWNERSHIP_SIGNAL_AMBIGUITY);
			state.overflowed.store(true, Ordering::SeqCst);
		}
	}

	fn signal_all_state(state: &Arc<CommandProcessState>, signal: i32) {
		let processes = state
			.processes
			.lock()
			.unwrap_or_else(|poisoned| poisoned.into_inner());
		for process in processes.values() {
			Self::signal_process(state, process, signal);
		}
	}

	fn signal_group_anchors(state: &Arc<CommandProcessState>, signal: i32) {
		let anchors = state
			.group_anchors
			.lock()
			.unwrap_or_else(|poisoned| poisoned.into_inner())
			.iter()
			.map(|(pgid, anchor)| (*pgid, anchor.clone()))
			.take(MAX_OWNED_PROCESS_GROUP_ANCHORS)
			.collect::<Vec<_>>();
		let allowed = state
			.processes
			.lock()
			.unwrap_or_else(|poisoned| poisoned.into_inner())
			.values()
			.map(|process| (process.pid(), process.incarnation()))
			.take(MAX_OWNED_COMMAND_PROCESSES)
			.collect::<Vec<_>>();
		for (pgid, _) in anchors {
			let (members, incomplete) =
				process::Process::from_group_bounded(pgid, MAX_OWNED_COMMAND_PROCESSES, &allowed);
			if incomplete {
				Self::mark_unproven(state, OWNERSHIP_SIGNAL_AMBIGUITY);
				state.overflowed.store(true, Ordering::SeqCst);
			}
			for member in members {
				Self::signal_process(state, &member, signal);
			}
		}
	}

	fn signal_recorded(state: &Arc<CommandProcessState>, pid: i32, signal: i32) {
		let process = state
			.processes
			.lock()
			.unwrap_or_else(|poisoned| poisoned.into_inner())
			.get(&pid)
			.cloned();
		if let Some(process) = process {
			Self::signal_process(state, &process, signal);
		} else {
			Self::mark_unproven(state, OWNERSHIP_PIN_FAILED);
			state.overflowed.store(true, Ordering::SeqCst);
		}
	}

	fn fail_ownership(state: &Arc<CommandProcessState>) {
		state.overflowed.store(true, Ordering::SeqCst);
		state.cancelled.store(true, Ordering::SeqCst);
		Self::signal_all_state(state, process::KILL_SIGNAL);
		state.execution_cancel.cancel();
	}

	fn prune_group_anchors(state: &Arc<CommandProcessState>) -> bool {
		let processes = state
			.processes
			.lock()
			.unwrap_or_else(|poisoned| poisoned.into_inner());
		let mut anchors = state
			.group_anchors
			.lock()
			.unwrap_or_else(|poisoned| poisoned.into_inner());
		let before = anchors.len();
		anchors.retain(|pgid, (pid, incarnation)| {
			processes.get(pid).is_some_and(|process| {
				process.status() == process::ProcessStatus::Running
					&& process.group_id() == Some(*pgid)
					&& process.incarnation() == *incarnation
			}) || Self::group_has_recorded_member(&processes, *pgid)
		});
		before != anchors.len()
	}

	fn record_group_anchor(
		state: &Arc<CommandProcessState>,
		pgid: i32,
		pid: i32,
		incarnation: String,
	) -> bool {
		Self::prune_group_anchors(state);
		let mut anchors = state
			.group_anchors
			.lock()
			.unwrap_or_else(|poisoned| poisoned.into_inner());
		if !anchors.contains_key(&pgid) && anchors.len() >= MAX_OWNED_PROCESS_GROUP_ANCHORS {
			drop(anchors);
			Self::mark_unproven(state, OWNERSHIP_GROUP_ANCHOR_LIMIT);
			state.overflowed.store(true, Ordering::SeqCst);
			return false;
		}
		anchors.insert(pgid, (pid, incarnation));
		true
	}

	fn scan_descendants_once(state: &Arc<CommandProcessState>) {
		let roots = {
			let mut processes = state
				.processes
				.lock()
				.unwrap_or_else(|poisoned| poisoned.into_inner());
			processes.retain(|_, process| process.status() == process::ProcessStatus::Running);
			processes.values().cloned().collect::<Vec<_>>()
		};
		for process in roots {
			let mut descendants = Vec::new();
			let mut incomplete = true;
			for _ in 0..SNAPSHOT_BARRIER_YIELDS {
				let snapshot = process.descendants_exact_bounded(MAX_OWNED_COMMAND_PROCESSES);
				descendants = snapshot.0;
				incomplete = snapshot.1;
				if !incomplete || process.status() != process::ProcessStatus::Running {
					break;
				}
				std::thread::yield_now();
			}
			if incomplete && process.status() == process::ProcessStatus::Running {
				state.descendant_scan_failed.store(true, Ordering::SeqCst);
				Self::mark_unproven(state, OWNERSHIP_DESCENDANT_SCAN_FAILED);
				state.overflowed.store(true, Ordering::SeqCst);
			}
			for descendant in descendants {
				if !Self::record_process(state, descendant) {
					return;
				}
			}
		}
	}

	fn record_process(state: &Arc<CommandProcessState>, process: process::Process) -> bool {
		let pid = process.pid();
		let mut processes = state
			.processes
			.lock()
			.unwrap_or_else(|poisoned| poisoned.into_inner());
		processes.retain(|_, owned| owned.status() == process::ProcessStatus::Running);
		if processes.contains_key(&pid) {
			drop(processes);
			Self::prune_group_anchors(state);
			return true;
		}
		if processes.len() >= MAX_OWNED_COMMAND_PROCESSES {
			drop(processes);
			Self::signal_process(state, &process, process::KILL_SIGNAL);
			Self::fail_ownership(state);
			return false;
		}
		if state.cancelled.load(Ordering::SeqCst) {
			Self::signal_process(state, &process, process::KILL_SIGNAL);
		}
		processes.insert(pid, process);
		drop(processes);
		Self::prune_group_anchors(state);
		true
	}

	fn owned_group_anchor(state: &Arc<CommandProcessState>, pid: i32, pgid: i32) -> Option<String> {
		if pid != pgid || ambient_process_group_id() == pgid {
			return None;
		}
		let processes = state
			.processes
			.lock()
			.unwrap_or_else(|poisoned| poisoned.into_inner());
		processes.get(&pid).and_then(|process| {
			(process.status() == process::ProcessStatus::Running && process.group_id() == Some(pgid))
				.then(|| process.incarnation())
		})
	}

	fn group_anchor_is_current(state: &Arc<CommandProcessState>, pgid: i32) -> bool {
		let anchor = {
			let anchors = state
				.group_anchors
				.lock()
				.unwrap_or_else(|poisoned| poisoned.into_inner());
			anchors.get(&pgid).cloned()
		};
		let Some((pid, incarnation)) = anchor else {
			return false;
		};
		let processes = state
			.processes
			.lock()
			.unwrap_or_else(|poisoned| poisoned.into_inner());
		processes.get(&pid).is_some_and(|process| {
			process.status() == process::ProcessStatus::Running
				&& process.group_id() == Some(pgid)
				&& process.incarnation() == incarnation
		}) || Self::group_has_recorded_member(&processes, pgid)
	}

	/// A recorded, still-running process whose live kernel process group is
	/// `pgid` is exact proof that the group is still ours. A pipeline leader
	/// that exits normally while later members keep running does not retire the
	/// group, so leader liveness alone must not decide ownership.
	fn group_has_recorded_member(processes: &HashMap<i32, process::Process>, pgid: i32) -> bool {
		processes.values().any(|process| {
			process.status() == process::ProcessStatus::Running && process.group_id() == Some(pgid)
		})
	}

	fn record(&self, pid: i32) -> bool {
		let Some(process) = process::Process::from_pid(pid) else {
			return false;
		};
		let recorded = Self::record_process(&self.state, process);
		self.ensure_monitor();
		recorded
	}

	fn ensure_monitor(&self) {
		if self
			.state
			.monitor_started
			.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
			.is_err()
		{
			return;
		}
		let state = self.state.clone();
		tokio::spawn(async move {
			while !state.finished.load(Ordering::SeqCst) {
				Self::scan_descendants_once(&state);
				tokio::select! {
					() = state.shutdown.cancelled() => break,
					() = time::sleep(Duration::from_millis(5)) => {},
				}
			}
		});
	}

	fn cancel(&self) {
		self.state.cancelled.store(true, Ordering::SeqCst);
		let processes = self
			.state
			.processes
			.lock()
			.unwrap_or_else(|poisoned| poisoned.into_inner())
			.values()
			.cloned()
			.collect::<Vec<_>>();
		let any_running = processes
			.iter()
			.any(|process| process.status() == process::ProcessStatus::Running);
		let retired_group_unproven = Self::prune_group_anchors(&self.state);
		let observed_without_target =
			!any_running && self.state.unsettled_spawns.load(Ordering::SeqCst) > 0;
		if self.state.descendant_scan_failed.load(Ordering::SeqCst) {
			Self::mark_unproven(&self.state, OWNERSHIP_DESCENDANT_SCAN_FAILED);
			self.state.overflowed.store(true, Ordering::SeqCst);
		}
		if self.state.group_unproven.load(Ordering::SeqCst)
			|| retired_group_unproven
			|| observed_without_target
		{
			if retired_group_unproven {
				Self::mark_unproven(&self.state, OWNERSHIP_RETIRED_GROUP);
			}
			if observed_without_target {
				Self::mark_unproven(&self.state, OWNERSHIP_OBSERVED_WITHOUT_TARGET);
			}
			self.state.overflowed.store(true, Ordering::SeqCst);
		}
	}

	#[cfg(test)]
	fn finish(&self) {
		self.state.finalizing.store(true, Ordering::SeqCst);
		if self.ownership_incomplete() {
			self.state.overflowed.store(true, Ordering::SeqCst);
		}
		if self.state.inflight_spawn_callbacks.load(Ordering::SeqCst) != 0 {
			Self::mark_unproven(&self.state, OWNERSHIP_LATE_SPAWN);
			self.state.overflowed.store(true, Ordering::SeqCst);
		}
		self.state.finished.store(true, Ordering::SeqCst);
		if Self::prune_group_anchors(&self.state) {
			Self::mark_unproven(&self.state, OWNERSHIP_RETIRED_GROUP);
			self.state.overflowed.store(true, Ordering::SeqCst);
		}
	}

	async fn finish_snapshot(&self) {
		Self::scan_descendants_once(&self.state);
		self.state.finalizing.store(true, Ordering::SeqCst);
		if self.ownership_incomplete() {
			self.state.overflowed.store(true, Ordering::SeqCst);
		}
		for _ in 0..SNAPSHOT_BARRIER_YIELDS {
			if self.state.inflight_spawn_callbacks.load(Ordering::SeqCst) == 0 {
				break;
			}
			tokio::task::yield_now().await;
		}
		if self.state.inflight_spawn_callbacks.load(Ordering::SeqCst) != 0 {
			Self::mark_unproven(&self.state, OWNERSHIP_LATE_SPAWN);
			self.state.overflowed.store(true, Ordering::SeqCst);
		}
		self.state.finished.store(true, Ordering::SeqCst);
		Self::prune_group_anchors(&self.state);
		tokio::task::yield_now().await;
	}

	fn has_running_recorded_processes(&self) -> bool {
		self
			.state
			.processes
			.lock()
			.unwrap_or_else(|poisoned| poisoned.into_inner())
			.values()
			.any(|process| process.status() == process::ProcessStatus::Running)
	}

	async fn settle_spawn_barrier(&self) {
		for _ in 0..SNAPSHOT_BARRIER_YIELDS {
			let inflight = self.state.inflight_spawn_callbacks.load(Ordering::SeqCst);
			let unsettled = self.state.unsettled_spawns.load(Ordering::SeqCst);
			if inflight == 0 && (unsettled == 0 || self.has_running_recorded_processes()) {
				return;
			}
			let notified = self.state.settlement_changed.notified();
			let _ = time::timeout(Duration::from_millis(5), notified).await;
		}
		if self.state.unsettled_spawns.load(Ordering::SeqCst) > 0
			&& !self.has_running_recorded_processes()
		{
			Self::mark_unproven(&self.state, OWNERSHIP_OBSERVED_WITHOUT_TARGET);
			self.state.overflowed.store(true, Ordering::SeqCst);
		}
	}

	fn has_active_processes(&self) -> bool {
		self.state.unsettled_spawns.load(Ordering::SeqCst) > 0
			|| self
				.state
				.processes
				.lock()
				.unwrap_or_else(|poisoned| poisoned.into_inner())
				.values()
				.any(|process| process.status() == process::ProcessStatus::Running)
	}

	fn overflowed(&self) -> bool {
		self.state.overflowed.load(Ordering::SeqCst)
	}

	fn ownership_incomplete(&self) -> bool {
		self.state.group_unproven.load(Ordering::SeqCst)
			|| self.state.descendant_scan_failed.load(Ordering::SeqCst)
	}

	fn ownership_reasons(&self) -> usize {
		self.state.ownership_reasons.load(Ordering::SeqCst)
	}

	fn ownership_error_message(&self) -> String {
		if std::env::var_os("PI_SHELL_DEBUG_OWNERSHIP").is_some() {
			format!("Shell process ownership incomplete (reason={})", self.ownership_reasons())
		} else {
			"Shell process ownership incomplete".to_owned()
		}
	}

	fn signal_all(&self, signal: i32) {
		Self::signal_all_state(&self.state, signal);
	}
}

impl ExternalCommandProcessObserver for CommandProcessGroups {
	fn external_command_settled(&self, pid: Option<i32>) {
		if let Some(pid) = pid {
			let mut processes = self
				.state
				.processes
				.lock()
				.unwrap_or_else(|poisoned| poisoned.into_inner());
			if processes
				.get(&pid)
				.is_some_and(|process| process.status() != process::ProcessStatus::Running)
			{
				processes.remove(&pid);
			}
		}
		let _ =
			self
				.state
				.unsettled_spawns
				.fetch_update(Ordering::SeqCst, Ordering::SeqCst, |value| value.checked_sub(1));
		self.state.settlement_changed.notify_waiters();
	}

	fn external_command_spawned(&self, pid: Option<i32>, process_group_id: Option<i32>) {
		self
			.state
			.inflight_spawn_callbacks
			.fetch_add(1, Ordering::SeqCst);
		self.state.settlement_changed.notify_waiters();
		let _callback_guard = SpawnCallbackGuard(self.state.clone());
		let late =
			self.state.finalizing.load(Ordering::SeqCst) || self.state.finished.load(Ordering::SeqCst);
		self.state.spawn_observed.store(true, Ordering::SeqCst);
		if late {
			Self::mark_unproven(&self.state, OWNERSHIP_LATE_SPAWN);
			self.state.overflowed.store(true, Ordering::SeqCst);
			let Some(pid) = pid else {
				Self::mark_unproven(&self.state, OWNERSHIP_MISSING_PID);
				return;
			};
			self.state.unsettled_spawns.fetch_add(1, Ordering::SeqCst);
			self.state.settlement_changed.notify_waiters();
			if self.record(pid) {
				Self::signal_recorded(&self.state, pid, process::KILL_SIGNAL);
			} else {
				Self::fail_ownership(&self.state);
			}
			return;
		}
		if self.state.cancelled.load(Ordering::SeqCst) {
			Self::mark_unproven(&self.state, OWNERSHIP_NO_DURABLE_CONTAINMENT);
			self.state.overflowed.store(true, Ordering::SeqCst);
		}
		self.state.unsettled_spawns.fetch_add(1, Ordering::SeqCst);
		self.state.settlement_changed.notify_waiters();
		let Some(pid) = pid else {
			Self::mark_unproven(&self.state, OWNERSHIP_MISSING_PID);
			return;
		};
		if !self.record(pid) {
			return;
		}
		if let Some(pgid) = process_group_id.filter(|pgid| *pgid > 0) {
			if let Some(incarnation) = Self::owned_group_anchor(&self.state, pid, pgid) {
				if !Self::record_group_anchor(&self.state, pgid, pid, incarnation) {
					Self::signal_recorded(&self.state, pid, process::KILL_SIGNAL);
					Self::fail_ownership(&self.state);
					return;
				}
			} else if !Self::group_anchor_is_current(&self.state, pgid) {
				Self::mark_unproven(&self.state, OWNERSHIP_RETIRED_GROUP);
				self.state.overflowed.store(true, Ordering::SeqCst);
				Self::signal_recorded(&self.state, pid, process::KILL_SIGNAL);
				Self::fail_ownership(&self.state);
				return;
			}
			self.ensure_monitor();
		}
	}
}

#[derive(Default)]
struct ShellAbortInner {
	generation: usize,
	tokens:     HashMap<usize, AbortToken>,
	active:     HashSet<usize>,
	pending:    bool,
}

#[derive(Clone, Default)]
struct ShellAbortState(Arc<TokioMutex<ShellAbortInner>>);

impl ShellAbortState {
	async fn publish(&self, abort_token: AbortToken) -> usize {
		let mut inner = self.0.lock().await;
		inner.generation = inner.generation.wrapping_add(1);
		let generation = inner.generation;
		inner.tokens.insert(generation, abort_token);
		generation
	}

	async fn activate(&self, generation: usize) {
		let mut inner = self.0.lock().await;
		if inner.tokens.contains_key(&generation) {
			inner.active.insert(generation);
		}
		if inner.pending {
			if let Some(abort_token) = inner.tokens.get(&generation).cloned() {
				abort_token.abort(AbortReason::Signal);
			}
			inner.pending = false;
		}
	}

	async fn clear(&self, generation: usize) {
		let mut inner = self.0.lock().await;
		inner.tokens.remove(&generation);
		inner.active.remove(&generation);
	}

	async fn abort(&self) {
		let mut inner = self.0.lock().await;
		if inner.active.is_empty() {
			inner.pending = true;
			return;
		}
		let active = inner.active.clone();
		for generation in active {
			if let Some(abort_token) = inner.tokens.get(&generation).cloned() {
				abort_token.abort(AbortReason::Signal);
			}
		}
	}
}

#[derive(Clone)]
struct ShellConfig {
	session_env:   Option<HashMap<String, String>>,
	snapshot_path: Option<String>,
	minimizer:     Option<minimizer::MinimizerConfig>,
}

#[derive(Debug, Clone, Default)]
pub struct ShellOptions {
	pub session_env:   Option<HashMap<String, String>>,
	pub snapshot_path: Option<String>,
	pub minimizer:     Option<minimizer::MinimizerOptions>,
}

struct ShellRunConfig {
	command:   String,
	cwd:       Option<String>,
	env:       Option<HashMap<String, String>>,
	minimizer: Option<minimizer::MinimizerConfig>,
}

#[derive(Debug, Clone, Default)]
pub struct ShellRunOptions {
	pub command:    String,
	pub cwd:        Option<String>,
	pub env:        Option<HashMap<String, String>>,
	pub timeout_ms: Option<u32>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MinimizerResult {
	pub filter:        String,
	pub text:          String,
	pub original_text: String,
	pub input_bytes:   u32,
	pub output_bytes:  u32,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ShellRunResult {
	pub exit_code:                 Option<i32>,
	pub cancelled:                 bool,
	pub timed_out:                 bool,
	pub minimized:                 Option<MinimizerResult>,
	pub output_truncated:          bool,
	#[serde(default)]
	pub output_capture_incomplete: bool,
	#[serde(default)]
	pub output_truncated_chunks:   u64,
	pub output_truncated_bytes:    u64,
	pub stdout_truncated:          bool,
	pub stdout_truncated_bytes:    u64,
	pub stderr_truncated:          bool,
	pub stderr_truncated_bytes:    u64,
}

#[derive(Debug, Clone)]
pub struct ShellOutputChunk {
	pub text:                  String,
	pub synthetic_loss_marker: bool,
}

impl ShellOutputChunk {
	const fn source(text: String) -> Self {
		Self { text, synthetic_loss_marker: false }
	}

	const fn loss_marker(text: String) -> Self {
		Self { text, synthetic_loss_marker: true }
	}
}

#[derive(Debug, Clone, Default)]
pub struct ShellExecuteOptions {
	pub command:       String,
	pub cwd:           Option<String>,
	pub env:           Option<HashMap<String, String>>,
	pub session_env:   Option<HashMap<String, String>>,
	pub timeout_ms:    Option<u32>,
	pub snapshot_path: Option<String>,
	pub minimizer:     Option<minimizer::MinimizerOptions>,
}

pub type ShellExecuteResult = ShellRunResult;

pub struct Shell {
	session:     Arc<TokioMutex<Option<ShellSessionCore>>>,
	abort_state: ShellAbortState,
	run_slots:   Arc<Semaphore>,
	config:      ShellConfig,
}

impl Shell {
	#[must_use]
	pub fn new(options: Option<ShellOptions>) -> Self {
		let config = match options {
			None => ShellConfig { session_env: None, snapshot_path: None, minimizer: None },
			Some(opt) => {
				let minimizer = opt
					.minimizer
					.as_ref()
					.map(minimizer::MinimizerConfig::from_options);
				ShellConfig {
					session_env: opt.session_env,
					snapshot_path: opt.snapshot_path,
					minimizer,
				}
			},
		};
		Self {
			session: Arc::new(TokioMutex::new(None)),
			abort_state: ShellAbortState::default(),
			run_slots: SHELL_RUN_SLOTS.clone(),
			config,
		}
	}

	pub async fn run(
		&self,
		options: ShellRunOptions,
		on_chunk: Option<mpsc::Sender<ShellOutputChunk>>,
		mut cancel_token: CancelToken,
	) -> Result<ShellRunResult> {
		let _run_slot = self
			.run_slots
			.clone()
			.try_acquire_owned()
			.map_err(|_| Error::msg("Shell pending run limit reached"))?;
		let run_config = ShellRunConfig {
			command:   options.command,
			cwd:       options.cwd,
			env:       options.env,
			minimizer: self.config.minimizer.clone(),
		};
		run_shell_session(
			self.session.clone(),
			self.abort_state.clone(),
			self.config.clone(),
			run_config,
			on_chunk,
			&mut cancel_token,
		)
		.await
	}

	pub async fn abort(&self) {
		self.abort_state.abort().await;
	}
}

pub async fn execute_shell(
	options: ShellExecuteOptions,
	on_chunk: Option<mpsc::Sender<ShellOutputChunk>>,
	cancel_token: CancelToken,
) -> Result<ShellExecuteResult> {
	let _run_slot = SHELL_RUN_SLOTS
		.clone()
		.try_acquire_owned()
		.map_err(|_| Error::msg("Shell pending run limit reached"))?;
	let minimizer = options
		.minimizer
		.as_ref()
		.map(minimizer::MinimizerConfig::from_options);
	let config = ShellConfig {
		session_env:   options.session_env,
		snapshot_path: options.snapshot_path,
		minimizer:     minimizer.clone(),
	};
	let run_config =
		ShellRunConfig { command: options.command, cwd: options.cwd, env: options.env, minimizer };
	run_shell_oneshot(config, run_config, on_chunk, cancel_token).await
}

/// Optional per-stream raw byte sinks for [`execute_shell_streams`].
///
/// When a sink is `Some`, that stream's pipe is drained directly into the
/// channel with no UTF-8 decoding and no merging. When `None`, the
/// corresponding pipe is still drained (to avoid blocking the child) but
/// its bytes are dropped.
#[derive(Default)]
pub struct StreamSinks {
	pub stdout: Option<mpsc::UnboundedSender<Bytes>>,
	pub stderr: Option<mpsc::UnboundedSender<Bytes>>,
}

/// One-shot execution that delivers stdout/stderr as raw byte chunks.
///
/// Bytes are delivered on separate channels with no UTF-8 decoding and no
/// merging. The minimizer is intentionally disabled — its
/// `MinimizerResult.text` contract presumes a single merged transcript.
pub async fn execute_shell_streams(
	options: ShellExecuteOptions,
	streams: StreamSinks,
	cancel_token: CancelToken,
) -> Result<ShellExecuteResult> {
	let _run_slot = SHELL_RUN_SLOTS
		.clone()
		.try_acquire_owned()
		.map_err(|_| Error::msg("Shell pending run limit reached"))?;
	let config = ShellConfig {
		session_env:   options.session_env,
		snapshot_path: options.snapshot_path,
		minimizer:     None,
	};
	let run_config = ShellRunConfig {
		command:   options.command,
		cwd:       options.cwd,
		env:       options.env,
		minimizer: None,
	};
	run_shell_oneshot_streams(config, run_config, streams, cancel_token).await
}

async fn run_shell_session(
	session: Arc<TokioMutex<Option<ShellSessionCore>>>,
	abort_state: ShellAbortState,
	config: ShellConfig,
	run_config: ShellRunConfig,
	on_chunk: Option<mpsc::Sender<ShellOutputChunk>>,
	ct: &mut CancelToken,
) -> Result<ShellRunResult> {
	let tokio_cancel = CancellationToken::new();
	let abort_generation = abort_state.publish(ct.emplace_abort_token()).await;

	let mut run_task = tokio::spawn({
		let session = session.clone();
		let tokio_cancel = tokio_cancel.clone();
		let run_abort_state = abort_state.clone();
		async move {
			let mut session_guard = session.lock().await;
			run_abort_state.activate(abort_generation).await;

			let session = match &mut *session_guard {
				Some(session) => session,
				None => session_guard.insert(create_session(&config, tokio_cancel.clone()).await?),
			};
			let result = run_shell_command(session, &run_config, on_chunk, tokio_cancel).await;
			run_abort_state.clear(abort_generation).await;
			result
		}
	});

	let res = tokio::select! {
		res = &mut run_task => res,
		reason = ct.wait() => {
			tokio_cancel.cancel();
			// Per-command cancellation handles descendant termination after the
			// serialized session lock is acquired; do not use a queued run baseline.
			let graceful = time::timeout(Duration::from_secs(2), &mut run_task).await;
			let truncation = match graceful {
				Ok(Ok(Ok((_, _, truncation)))) => Ok(truncation),
				Ok(Ok(Err(error))) => Err(error),
				Ok(Err(error)) => Err(Error::msg(format!("Shell execution task failed: {error}"))),
				Err(_) => {
					run_task.abort();
					let _ = run_task.await;
					Err(Error::msg("Shell process ownership incomplete: cancellation cleanup deadline exceeded"))
				},
			};
			abort_state.clear(abort_generation).await;
			// Use try_lock to avoid deadlocking if another task holds the session.
			// If we can't acquire the lock, the session will be cleaned up when the
			// holding task finishes.
			if let Ok(mut guard) = session.try_lock() {
				*guard = None;
			}
			let truncation = truncation?;
			return Ok(interrupted_shell_result(reason, truncation));
		}
	};
	let res =
		res.unwrap_or_else(|err| Err(Error::msg(format!("Shell execution task failed: {err}"))));
	abort_state.clear(abort_generation).await;

	let keepalive = res.as_ref().is_ok_and(|pair| session_keepalive(&pair.0));
	if !keepalive {
		*session.lock().await = None;
	}
	let (exec, minimized, truncation) = res?;
	Ok(ShellRunResult {
		exit_code: Some(exit_code(&exec)),
		cancelled: false,
		timed_out: false,
		minimized,
		output_truncated: truncation.output_truncated,
		output_capture_incomplete: truncation.output_capture_incomplete,
		output_truncated_chunks: truncation.output_truncated_chunks,
		output_truncated_bytes: truncation.output_truncated_bytes,
		stdout_truncated: truncation.stdout_truncated,
		stdout_truncated_bytes: truncation.stdout_truncated_bytes,
		stderr_truncated: truncation.stderr_truncated,
		stderr_truncated_bytes: truncation.stderr_truncated_bytes,
	})
}

async fn run_shell_oneshot(
	config: ShellConfig,
	run_config: ShellRunConfig,
	on_chunk: Option<mpsc::Sender<ShellOutputChunk>>,
	ct: CancelToken,
) -> Result<ShellExecuteResult> {
	let tokio_cancel = CancellationToken::new();

	let mut task = tokio::spawn({
		let tokio_cancel = tokio_cancel.clone();
		async move {
			let mut session = create_session(&config, tokio_cancel.clone()).await?;
			run_shell_command(&mut session, &run_config, on_chunk, tokio_cancel).await
		}
	});

	let run_result = tokio::select! {
		result = &mut task => result,
		reason = ct.wait() => {
			tokio_cancel.cancel();
			let graceful = time::timeout(Duration::from_secs(1), &mut task).await;
			let truncation = match graceful {
				Ok(Ok(Ok((_, _, truncation)))) => truncation,
				Ok(Ok(Err(error))) => return Err(error),
				Ok(Err(error)) => return Err(Error::msg(format!("Shell execution task failed: {error}"))),
				Err(_) => {
					task.abort();
					let _ = task.await;
					return Err(Error::msg("Shell process ownership incomplete: cancellation cleanup deadline exceeded"));
				},
			};
			return Ok(interrupted_shell_result(reason, truncation));
		},
	};

	let res = run_result
		.unwrap_or_else(|err| Err(Error::msg(format!("Shell execution task failed: {err}"))));
	let (exec, minimized, truncation) = res?;
	Ok(ShellExecuteResult {
		exit_code: Some(exit_code(&exec)),
		cancelled: false,
		timed_out: false,
		minimized,
		output_truncated: truncation.output_truncated,
		output_capture_incomplete: truncation.output_capture_incomplete,
		output_truncated_chunks: truncation.output_truncated_chunks,
		output_truncated_bytes: truncation.output_truncated_bytes,
		stdout_truncated: truncation.stdout_truncated,
		stdout_truncated_bytes: truncation.stdout_truncated_bytes,
		stderr_truncated: truncation.stderr_truncated,
		stderr_truncated_bytes: truncation.stderr_truncated_bytes,
	})
}

async fn run_shell_oneshot_streams(
	config: ShellConfig,
	run_config: ShellRunConfig,
	streams: StreamSinks,
	ct: CancelToken,
) -> Result<ShellExecuteResult> {
	let tokio_cancel = CancellationToken::new();

	let mut task = tokio::spawn({
		let tokio_cancel = tokio_cancel.clone();
		async move {
			let mut session = create_session(&config, tokio_cancel.clone()).await?;
			run_shell_command_streams(&mut session, &run_config, streams, tokio_cancel).await
		}
	});

	let run_result = tokio::select! {
		result = &mut task => result,
		reason = ct.wait() => {
			tokio_cancel.cancel();
			let graceful = time::timeout(Duration::from_secs(1), &mut task).await;
			let truncation = match graceful {
				Ok(Ok(Ok((_, truncation)))) => truncation,
				Ok(Ok(Err(error))) => return Err(error),
				Ok(Err(error)) => return Err(Error::msg(format!("Shell execution task failed: {error}"))),
				Err(_) => {
					task.abort();
					let _ = task.await;
					return Err(Error::msg("Shell process ownership incomplete: cancellation cleanup deadline exceeded"));
				},
			};
			return Ok(interrupted_shell_result(reason, truncation));
		},
	};

	let res = run_result
		.unwrap_or_else(|err| Err(Error::msg(format!("Shell execution task failed: {err}"))));
	let (exec, truncation) = res?;
	Ok(ShellExecuteResult {
		exit_code:                 Some(exit_code(&exec)),
		cancelled:                 false,
		timed_out:                 false,
		minimized:                 None,
		output_truncated:          truncation.output_truncated,
		output_capture_incomplete: truncation.output_capture_incomplete,
		output_truncated_chunks:   truncation.output_truncated_chunks,
		output_truncated_bytes:    truncation.output_truncated_bytes,
		stdout_truncated:          truncation.stdout_truncated,
		stdout_truncated_bytes:    truncation.stdout_truncated_bytes,
		stderr_truncated:          truncation.stderr_truncated,
		stderr_truncated_bytes:    truncation.stderr_truncated_bytes,
	})
}

fn null_file() -> Result<OpenFile> {
	openfiles::null().map_err(|err| Error::msg(format!("Failed to create null file: {err}")))
}

const fn exit_code(result: &ExecutionResult) -> i32 {
	match result.exit_code {
		ExecutionExitCode::Success => 0,
		ExecutionExitCode::GeneralError => 1,
		ExecutionExitCode::InvalidUsage => 2,
		ExecutionExitCode::Unimplemented => 99,
		ExecutionExitCode::CannotExecute => 126,
		ExecutionExitCode::NotFound => 127,
		ExecutionExitCode::Interrupted => 130,
		ExecutionExitCode::BrokenPipe => 141,
		ExecutionExitCode::Custom(code) => code as i32,
	}
}

const fn interrupted_shell_result(
	reason: AbortReason,
	truncation: OutputTruncation,
) -> ShellRunResult {
	ShellRunResult {
		exit_code:                 None,
		cancelled:                 matches!(reason, AbortReason::Signal),
		timed_out:                 matches!(reason, AbortReason::Timeout),
		minimized:                 None,
		output_truncated:          truncation.output_truncated,
		output_capture_incomplete: truncation.output_capture_incomplete,
		output_truncated_chunks:   truncation.output_truncated_chunks,
		output_truncated_bytes:    truncation.output_truncated_bytes,
		stdout_truncated:          truncation.stdout_truncated,
		stdout_truncated_bytes:    truncation.stdout_truncated_bytes,
		stderr_truncated:          truncation.stderr_truncated,
		stderr_truncated_bytes:    truncation.stderr_truncated_bytes,
	}
}

#[cfg(windows)]
const fn normalize_env_key(key: &str) -> &str {
	if key.eq_ignore_ascii_case("PATH") {
		"PATH"
	} else {
		key
	}
}

#[cfg(not(windows))]
const fn normalize_env_key(key: &str) -> &str {
	key
}

#[cfg(windows)]
fn merge_path_values(existing: &str, incoming: &str) -> String {
	let mut merged = Vec::new();
	let mut seen = HashSet::new();
	push_unique_paths(&mut merged, &mut seen, existing);
	push_unique_paths(&mut merged, &mut seen, incoming);

	std::env::join_paths(merged.iter())
		.map_or_else(|_| merged.join(";"), |paths| paths.to_string_lossy().into_owned())
}

#[cfg(windows)]
fn push_unique_paths(merged: &mut Vec<String>, seen: &mut HashSet<String>, value: &str) {
	for segment in std::env::split_paths(value) {
		let segment_str = segment.to_string_lossy().into_owned();
		let normalized = normalize_path_segment(&segment_str);
		if normalized.is_empty() {
			continue;
		}
		if seen.insert(normalized) {
			merged.push(segment_str);
		}
	}
}

#[cfg(windows)]
fn normalize_path_segment(segment: &str) -> String {
	let trimmed = segment.trim().trim_matches('"');
	if trimmed.is_empty() {
		return String::new();
	}

	let mut normalized = std::path::PathBuf::new();
	for component in std::path::Path::new(trimmed).components() {
		normalized.push(component.as_os_str());
	}

	normalized.to_string_lossy().to_ascii_lowercase()
}

#[cfg(not(windows))]
fn merge_path_values(_existing: &str, incoming: &str) -> String {
	incoming.to_string()
}

async fn create_session(
	config: &ShellConfig,
	execution_cancel: CancellationToken,
) -> Result<ShellSessionCore> {
	let mut shell = BrushShell::builder()
		.do_not_inherit_env(true)
		.profile(ProfileLoadBehavior::Skip)
		.rc(RcLoadBehavior::Skip)
		.builtins(default_builtins(BuiltinSet::BashMode))
		.build()
		.await
		.map_err(|err| Error::msg(format!("Failed to initialize shell: {err}")))?;

	if let Some(exec_builtin) = shell.builtin_mut("exec") {
		exec_builtin.disabled = true;
	}
	if let Some(suspend_builtin) = shell.builtin_mut("suspend") {
		suspend_builtin.disabled = true;
	}
	shell.register_builtin("sleep", builtins::builtin::<SleepCommand, _>());
	shell.register_builtin("timeout", builtins::builtin::<TimeoutCommand, _>());

	let mut merged_path: Option<String> = None;
	for (key, value) in std::env::vars() {
		let normalized_key = normalize_env_key(&key);
		if should_skip_env_var(normalized_key) {
			continue;
		}
		if normalized_key == "PATH" {
			merged_path = Some(match merged_path {
				Some(existing) => merge_path_values(&existing, &value),
				None => value,
			});
			continue;
		}
		let mut var = ShellVariable::new(ShellValue::String(value));
		var.export();
		shell
			.env_mut()
			.set_global(normalized_key, var)
			.map_err(|err| Error::msg(format!("Failed to set env: {err}")))?;
	}

	#[cfg(windows)]
	if merged_path.is_none()
		&& let Some(value) = std::env::var_os("Path").or_else(|| std::env::var_os("PATH"))
	{
		merged_path = Some(value.to_string_lossy().into_owned());
	}

	if let Some(path_value) = merged_path {
		let mut var = ShellVariable::new(ShellValue::String(path_value));
		var.export();
		shell
			.env_mut()
			.set_global("PATH", var)
			.map_err(|err| Error::msg(format!("Failed to set env: {err}")))?;
	}

	if let Some(env) = config.session_env.as_ref() {
		for (key, value) in env {
			let normalized_key = normalize_env_key(key);
			if should_skip_env_var(normalized_key) {
				continue;
			}
			let mut var = ShellVariable::new(ShellValue::String(value.clone()));
			var.export();
			shell
				.env_mut()
				.set_global(normalized_key, var)
				.map_err(|err| Error::msg(format!("Failed to set env: {err}")))?;
		}
	}
	apply_env_fallback(&mut shell)?;

	#[cfg(windows)]
	configure_windows_path(&mut shell)?;

	if let Some(snapshot_path) = config.snapshot_path.as_ref() {
		source_snapshot(&mut shell, snapshot_path, execution_cancel).await?;
	}

	Ok(ShellSessionCore { shell })
}

async fn source_snapshot(
	shell: &mut BrushShell,
	snapshot_path: &str,
	execution_cancel: CancellationToken,
) -> Result<()> {
	let snapshot_cancel = execution_cancel.child_token();
	let mut params = shell.default_exec_params();
	let source_info = SourceInfo::from("pi-natives:snapshot");
	params.set_fd(OpenFiles::STDIN_FD, null_file()?);
	params.set_fd(OpenFiles::STDOUT_FD, null_file()?);
	params.set_fd(OpenFiles::STDERR_FD, null_file()?);
	params.process_group_policy = ProcessGroupPolicy::NewProcessGroup;
	params.set_cancel_token(snapshot_cancel.clone());
	let process_shutdown = CancellationToken::new();
	let _process_shutdown_guard = process_shutdown.clone().drop_guard();
	let command_groups = CommandProcessGroups::new(process_shutdown, snapshot_cancel.clone());
	params.set_process_group_observer(Arc::new(command_groups.clone()));

	let escaped = snapshot_path.replace('\'', "'\\''");
	let command = format!("source '{escaped}'");
	let result = shell.run_string(command, &source_info, &params).await;
	command_groups.settle_spawn_barrier().await;
	let background_jobs = shell
		.jobs()
		.jobs
		.iter()
		.any(|job| !matches!(&job.state, brush_core::jobs::JobState::Done));
	CommandProcessGroups::scan_descendants_once(&command_groups.state);
	let needs_cleanup = execution_cancel.is_cancelled()
		|| background_jobs
		|| command_groups.has_active_processes()
		|| command_groups.ownership_incomplete();
	snapshot_cancel.cancel();
	if needs_cleanup {
		terminate_owned_process_groups(&command_groups).await;
	}
	command_groups.finish_snapshot().await;
	if needs_cleanup
		|| command_groups.has_active_processes()
		|| command_groups.overflowed()
		|| command_groups.ownership_incomplete()
	{
		return Err(Error::msg(if command_groups.ownership_incomplete() {
			command_groups.ownership_error_message()
		} else {
			"Shell process ownership incomplete: snapshot execution did not settle".to_owned()
		}));
	}
	result.map_err(|err| Error::msg(format!("Failed to source snapshot: {err}")))?;
	Ok(())
}

async fn run_shell_command(
	session: &mut ShellSessionCore,
	options: &ShellRunConfig,
	on_chunk: Option<mpsc::Sender<ShellOutputChunk>>,
	cancel_token: CancellationToken,
) -> Result<(ExecutionResult, Option<MinimizerResult>, OutputTruncation)> {
	if let Some(cwd) = options.cwd.as_deref() {
		session
			.shell
			.set_working_dir(cwd)
			.map_err(|err| Error::msg(format!("Failed to set cwd: {err}")))?;
	}

	let env_scope_pushed = apply_command_env(&mut session.shell, options.env.as_ref())?;

	let minimizer_mode = if let Some(config) = options.minimizer.as_ref() {
		minimizer::engine::mode_for(&options.command, config)
	} else {
		minimizer::engine::MinimizerMode::None
	};
	let should_minimize = !matches!(minimizer_mode, minimizer::engine::MinimizerMode::None);
	let max_capture_bytes = if let Some(config) = options.minimizer.as_ref() {
		config.max_capture_bytes as usize
	} else {
		0
	};

	let (reader_file, writer_file) = pipe_to_files("output")?;

	let stdout_file = OpenFile::from(
		writer_file
			.try_clone()
			.map_err(|err| Error::msg(format!("Failed to clone pipe: {err}")))?,
	);
	let stderr_file = OpenFile::from(writer_file);

	let mut params = session.shell.default_exec_params();
	params.set_fd(OpenFiles::STDIN_FD, null_file()?);
	params.set_fd(OpenFiles::STDOUT_FD, stdout_file);
	params.set_fd(OpenFiles::STDERR_FD, stderr_file);
	params.process_group_policy = ProcessGroupPolicy::NewProcessGroup;
	params.set_cancel_token(cancel_token.clone());
	let process_shutdown = CancellationToken::new();
	let _process_shutdown_guard = process_shutdown.clone().drop_guard();
	let command_groups = Arc::new(CommandProcessGroups::new(process_shutdown, cancel_token.clone()));
	params.set_process_group_observer(command_groups.clone());
	let reader_cancel = CancellationToken::new();
	let (activity_tx, mut activity_rx) = mpsc::channel::<()>(1);
	// Stream every raw chunk to the caller live, regardless of whether
	// minimization is enabled. When minimization actually transforms the
	// output, we propagate the replacement text via `MinimizerResult.text`
	// so the caller can swap their accumulated buffer for the minimized
	// version without losing intermediate progress updates.
	let reader_callback = on_chunk;
	let output_budget = OutputBudget::new(OutputBudget::DEFAULT_LIMIT);
	let mut reader_handle = tokio::spawn({
		let reader_cancel = reader_cancel.clone();
		let output_budget = output_budget.clone();
		async move {
			if should_minimize {
				let output = read_output_buffered(
					reader_file,
					reader_callback,
					reader_cancel,
					activity_tx,
					max_capture_bytes,
					output_budget,
				)
				.await;
				Result::<OutputRead>::Ok(OutputRead::Buffered(output))
			} else {
				Box::pin(read_output(
					reader_file,
					reader_callback,
					reader_cancel,
					activity_tx,
					output_budget,
				))
				.await;
				Result::<OutputRead>::Ok(OutputRead::Streaming)
			}
		}
	});
	let cancel_bridge = tokio::spawn({
		let cancel_token = cancel_token.clone();
		let reader_cancel = reader_cancel.clone();
		async move {
			cancel_token.cancelled().await;
			reader_cancel.cancel();
		}
	});
	let process_cancel_bridge = tokio::spawn({
		let cancel_token = cancel_token.clone();
		let command_groups = command_groups.clone();
		let shutdown = command_groups.shutdown_token();
		async move {
			tokio::select! {
				() = cancel_token.cancelled() => terminate_owned_process_groups(&command_groups).await,
				() = shutdown.cancelled() => {},
			}
		}
	});
	let baseline_job_id = session
		.shell
		.jobs()
		.jobs
		.iter()
		.map(|job| job.id)
		.max()
		.unwrap_or(0);
	let source_info = SourceInfo::from("pi-natives:command");
	let result = session
		.shell
		.run_string(options.command.clone(), &source_info, &params)
		.await;

	let cleanup_error = if env_scope_pushed {
		session
			.shell
			.env_mut()
			.pop_scope(EnvironmentScope::Command)
			.err()
			.map(|err| Error::msg(format!("Failed to pop env scope: {err}")))
	} else {
		None
	};

	drop(params);

	// The foreground command can complete while background jobs keep the
	// stdout/stderr pipe open. Don't hang forever waiting for EOF; drain output
	// for a short period, then cancel.
	const POST_EXIT_IDLE: Duration = Duration::from_millis(250);
	const POST_EXIT_MAX: Duration = Duration::from_secs(2);
	const READER_SHUTDOWN_TIMEOUT: Duration = Duration::from_millis(250);

	let mut reader_finished = false;
	let mut reader_output = None;
	let mut idle_timer = Box::pin(time::sleep(POST_EXIT_IDLE));
	let mut max_timer = Box::pin(time::sleep(POST_EXIT_MAX));
	let mut activity_open = true;

	loop {
		tokio::select! {
			res = &mut reader_handle => {
				if let Ok(Ok(output)) = res {
					reader_output = Some(output);
				}
				reader_finished = true;
				break;
			}
			msg = activity_rx.recv(), if activity_open => {
				if msg.is_none() {
					activity_open = false;
					continue;
				}
				idle_timer.as_mut().reset(time::Instant::now() + POST_EXIT_IDLE);
			}
			() = &mut idle_timer => break,
			() = &mut max_timer => break,
		}
	}

	if !reader_finished {
		reader_output = shutdown_reader_task(
			&reader_cancel,
			&mut reader_handle,
			reader_finished,
			READER_SHUTDOWN_TIMEOUT,
		)
		.await;
	}
	cancel_bridge.abort();
	let _ = cancel_bridge.await;
	if cancel_token.is_cancelled() {
		// Cancel fired — the bridge is actively running its rescan-and-signal
		// loop. Let it run to completion so all three waves get a chance to
		// reach stragglers; aborting here would cut the kill loop short.
		let _ = process_cancel_bridge.await;
	} else {
		// Happy path — the bridge is still parked on `cancel_token.cancelled()`
		// and would never exit on its own. Tear it down.
		process_cancel_bridge.abort();
		let _ = process_cancel_bridge.await;
	}

	command_groups.settle_spawn_barrier().await;
	let background_jobs = session.shell.jobs().jobs.iter().any(|job| {
		job.id > baseline_job_id && !matches!(&job.state, brush_core::jobs::JobState::Done)
	});
	let ownership_cleanup = cancel_token.is_cancelled()
		|| command_groups.overflowed()
		|| command_groups.ownership_incomplete();
	if ownership_cleanup && (background_jobs || command_groups.has_active_processes()) {
		terminate_owned_process_groups(&command_groups).await;
	}
	command_groups.finish_snapshot().await;
	let cleanup_unsettled =
		ownership_cleanup && (background_jobs || command_groups.has_active_processes());
	if cleanup_unsettled || command_groups.overflowed() || command_groups.ownership_incomplete() {
		return Err(Error::msg(if command_groups.ownership_incomplete() || cleanup_unsettled {
			command_groups.ownership_error_message()
		} else {
			"Shell process ownership limit reached".to_owned()
		}));
	}
	if let Some(err) = cleanup_error {
		return Err(err);
	}
	let result = result.map_err(|err| Error::msg(format!("Shell execution failed: {err}")))?;
	let output_capture_incomplete = reader_output.is_none() || output_budget.capture_incomplete();
	let mut minimized_out: Option<MinimizerResult> = None;
	if let Some(OutputRead::Buffered(output)) = reader_output
		&& let Some(config) = options.minimizer.as_ref()
		&& !output.exceeded
	{
		let minimized = match minimizer_mode {
			minimizer::engine::MinimizerMode::WholeCommand => {
				minimizer::apply(&options.command, &output.text, exit_code(&result), config)
			},
			minimizer::engine::MinimizerMode::None => {
				minimizer::MinimizerOutput::passthrough(&output.text)
			},
		};
		if minimized.changed
			&& let Some(original) = minimized.original_text
		{
			let output_bytes = u32::try_from(minimized.text.len()).unwrap_or(u32::MAX);
			minimized_out = Some(MinimizerResult {
				filter: minimized.filter.to_string(),
				text: minimized.text,
				original_text: original,
				input_bytes: u32::try_from(minimized.input_bytes).unwrap_or(u32::MAX),
				output_bytes,
			});
		}
	}
	let truncated_chunks = output_budget.truncated_chunks();
	let truncated_bytes = output_budget.truncated_bytes();
	Ok((result, minimized_out, OutputTruncation {
		output_truncated: truncated_bytes > 0,
		output_capture_incomplete,
		output_truncated_chunks: truncated_chunks,
		output_truncated_bytes: truncated_bytes,
		..Default::default()
	}))
}

async fn run_shell_command_streams(
	session: &mut ShellSessionCore,
	options: &ShellRunConfig,
	streams: StreamSinks,
	cancel_token: CancellationToken,
) -> Result<(ExecutionResult, OutputTruncation)> {
	if let Some(cwd) = options.cwd.as_deref() {
		session
			.shell
			.set_working_dir(cwd)
			.map_err(|err| Error::msg(format!("Failed to set cwd: {err}")))?;
	}

	let env_scope_pushed = apply_command_env(&mut session.shell, options.env.as_ref())?;

	let (stdout_reader, stdout_writer) = pipe_to_files("stdout")?;
	let (stderr_reader, stderr_writer) = pipe_to_files("stderr")?;

	let stdout_file = OpenFile::from(stdout_writer);
	let stderr_file = OpenFile::from(stderr_writer);

	let mut params = session.shell.default_exec_params();
	params.set_fd(OpenFiles::STDIN_FD, null_file()?);
	params.set_fd(OpenFiles::STDOUT_FD, stdout_file);
	params.set_fd(OpenFiles::STDERR_FD, stderr_file);
	params.process_group_policy = ProcessGroupPolicy::NewProcessGroup;
	params.set_cancel_token(cancel_token.clone());
	let process_shutdown = CancellationToken::new();
	let _process_shutdown_guard = process_shutdown.clone().drop_guard();
	let command_groups = Arc::new(CommandProcessGroups::new(process_shutdown, cancel_token.clone()));
	params.set_process_group_observer(command_groups.clone());
	let reader_cancel = CancellationToken::new();
	let (activity_tx, mut activity_rx) = mpsc::channel::<()>(1);

	let StreamSinks { stdout: stdout_sink, stderr: stderr_sink } = streams;
	let stdout_budget = OutputBudget::new(OutputBudget::DEFAULT_LIMIT);
	let stderr_budget = OutputBudget::new(OutputBudget::DEFAULT_LIMIT);
	let mut stdout_handle = tokio::spawn(Box::pin(read_output_bytes(
		stdout_reader,
		stdout_sink,
		reader_cancel.clone(),
		activity_tx.clone(),
		stdout_budget.clone(),
	)));
	let mut stderr_handle = tokio::spawn(Box::pin(read_output_bytes(
		stderr_reader,
		stderr_sink,
		reader_cancel.clone(),
		activity_tx,
		stderr_budget.clone(),
	)));

	let cancel_bridge = tokio::spawn({
		let cancel_token = cancel_token.clone();
		let reader_cancel = reader_cancel.clone();
		async move {
			cancel_token.cancelled().await;
			reader_cancel.cancel();
		}
	});
	let process_cancel_bridge = tokio::spawn({
		let cancel_token = cancel_token.clone();
		let command_groups = command_groups.clone();
		let shutdown = command_groups.shutdown_token();
		async move {
			tokio::select! {
				() = cancel_token.cancelled() => terminate_owned_process_groups(&command_groups).await,
				() = shutdown.cancelled() => {},
			}
		}
	});
	let baseline_job_id = session
		.shell
		.jobs()
		.jobs
		.iter()
		.map(|job| job.id)
		.max()
		.unwrap_or(0);
	let source_info = SourceInfo::from("pi-shell:streams");
	let result = session
		.shell
		.run_string(options.command.clone(), &source_info, &params)
		.await;

	let cleanup_error = if env_scope_pushed {
		session
			.shell
			.env_mut()
			.pop_scope(EnvironmentScope::Command)
			.err()
			.map(|err| Error::msg(format!("Failed to pop env scope: {err}")))
	} else {
		None
	};

	drop(params);

	const POST_EXIT_IDLE: Duration = Duration::from_millis(250);
	const POST_EXIT_MAX: Duration = Duration::from_secs(2);
	const READER_SHUTDOWN_TIMEOUT: Duration = Duration::from_millis(250);

	let mut stdout_finished = false;
	let mut stderr_finished = false;
	let mut idle_timer = Box::pin(time::sleep(POST_EXIT_IDLE));
	let mut max_timer = Box::pin(time::sleep(POST_EXIT_MAX));
	let mut activity_open = true;

	loop {
		if stdout_finished && stderr_finished {
			break;
		}
		tokio::select! {
			res = &mut stdout_handle, if !stdout_finished => {
				if res.is_err() {
					stdout_budget.mark_capture_incomplete();
				}
				stdout_finished = true;
			}
			res = &mut stderr_handle, if !stderr_finished => {
				if res.is_err() {
					stderr_budget.mark_capture_incomplete();
				}
				stderr_finished = true;
			}
			msg = activity_rx.recv(), if activity_open => {
				if msg.is_none() {
					activity_open = false;
					continue;
				}
				idle_timer.as_mut().reset(time::Instant::now() + POST_EXIT_IDLE);
			}
			() = &mut idle_timer => break,
			() = &mut max_timer => break,
		}
	}

	if !stdout_finished {
		stdout_budget.mark_capture_incomplete();
	}
	if !stderr_finished {
		stderr_budget.mark_capture_incomplete();
	}
	shutdown_reader_unit_task(
		&reader_cancel,
		&mut stdout_handle,
		stdout_finished,
		READER_SHUTDOWN_TIMEOUT,
	)
	.await;
	shutdown_reader_unit_task(
		&reader_cancel,
		&mut stderr_handle,
		stderr_finished,
		READER_SHUTDOWN_TIMEOUT,
	)
	.await;
	cancel_bridge.abort();
	let _ = cancel_bridge.await;
	if cancel_token.is_cancelled() {
		// Let the kill-wave bridge finish all three signal passes so stragglers
		// have a chance to receive SIGKILL.
		let _ = process_cancel_bridge.await;
	} else {
		process_cancel_bridge.abort();
		let _ = process_cancel_bridge.await;
	}

	command_groups.settle_spawn_barrier().await;
	let background_jobs = session.shell.jobs().jobs.iter().any(|job| {
		job.id > baseline_job_id && !matches!(&job.state, brush_core::jobs::JobState::Done)
	});
	let ownership_cleanup = cancel_token.is_cancelled()
		|| command_groups.overflowed()
		|| command_groups.ownership_incomplete();
	if ownership_cleanup && (background_jobs || command_groups.has_active_processes()) {
		terminate_owned_process_groups(&command_groups).await;
	}
	command_groups.finish_snapshot().await;
	let cleanup_unsettled =
		ownership_cleanup && (background_jobs || command_groups.has_active_processes());
	if cleanup_unsettled || command_groups.overflowed() || command_groups.ownership_incomplete() {
		return Err(Error::msg(if command_groups.ownership_incomplete() || cleanup_unsettled {
			command_groups.ownership_error_message()
		} else {
			"Shell process ownership limit reached".to_owned()
		}));
	}
	if let Some(err) = cleanup_error {
		return Err(err);
	}
	let result = result.map_err(|err| Error::msg(format!("Shell execution failed: {err}")))?;
	let stdout_truncated_bytes = stdout_budget.truncated_bytes();
	let stderr_truncated_bytes = stderr_budget.truncated_bytes();
	Ok((result, OutputTruncation {
		output_capture_incomplete: stdout_budget.capture_incomplete()
			|| stderr_budget.capture_incomplete(),
		stdout_truncated: stdout_truncated_bytes > 0,
		stdout_truncated_bytes,
		stderr_truncated: stderr_truncated_bytes > 0,
		stderr_truncated_bytes,
		..Default::default()
	}))
}

async fn read_output_bytes(
	reader: fs::File,
	sink: Option<mpsc::UnboundedSender<Bytes>>,
	cancel_token: CancellationToken,
	activity: mpsc::Sender<()>,
	budget: OutputBudget,
) {
	const BUF: usize = 65536;

	#[cfg(unix)]
	let Ok(reader) = register_nonblocking_pipe(reader) else {
		budget.mark_capture_incomplete();
		return;
	};
	#[cfg(not(unix))]
	let mut reader = tokio::fs::File::from_std(reader);

	loop {
		let mut buf = vec![0u8; BUF];
		#[cfg(unix)]
		let n = {
			let Ok(mut readiness) = (tokio::select! {
				ready = reader.readable() => ready,
				() = cancel_token.cancelled() => {
					budget.mark_capture_incomplete();
					break;
				},
			}) else {
				budget.mark_capture_incomplete();
				break;
			};
			match readiness.try_io(|inner| read_nonblocking(inner.get_ref(), &mut buf)) {
				Ok(Ok(0)) => break,
				Ok(Ok(n)) => n,
				Ok(Err(e)) if e.kind() == io::ErrorKind::Interrupted => continue,
				Ok(Err(_)) => {
					budget.mark_capture_incomplete();
					break;
				},
				Err(_would_block) => continue,
			}
		};
		#[cfg(not(unix))]
		let n = {
			let read_future = reader.read(&mut buf);
			tokio::pin!(read_future);
			match tokio::select! {
				res = &mut read_future => res,
				() = cancel_token.cancelled() => {
					budget.mark_capture_incomplete();
					break;
				},
			} {
				Ok(0) => break,
				Ok(n) => n,
				Err(e) if e.kind() == io::ErrorKind::Interrupted => continue,
				Err(_) => {
					budget.mark_capture_incomplete();
					break;
				},
			}
		};
		let _ = activity.try_send(());
		buf.truncate(n);
		if let Some(sink) = sink.as_ref() {
			let allowed = budget
				.remaining
				.fetch_update(Ordering::SeqCst, Ordering::SeqCst, |remaining| {
					Some(remaining.saturating_sub(buf.len()))
				})
				.unwrap_or(0)
				.min(buf.len());
			if allowed > 0 && sink.send(Bytes::copy_from_slice(&buf[..allowed])).is_err() {
				budget.mark_capture_incomplete();
				break;
			}
			if allowed < buf.len() {
				budget.mark_truncated(1, buf.len() - allowed);
			}
		}
	}
}

async fn terminate_owned_process_groups(command_groups: &CommandProcessGroups) {
	CommandProcessGroups::scan_descendants_once(&command_groups.state);
	if command_groups.ownership_incomplete() {
		command_groups
			.state
			.overflowed
			.store(true, Ordering::SeqCst);
	}
	command_groups.cancel();
	const WAVES: u32 = 3;
	for wave in 0..WAVES {
		let signal = if wave == 0 {
			process::TERM_SIGNAL
		} else {
			process::KILL_SIGNAL
		};
		command_groups.signal_all(signal);
		CommandProcessGroups::signal_group_anchors(&command_groups.state, signal);
		if wave + 1 < WAVES {
			let pause = if wave == 0 {
				Duration::from_millis(75)
			} else {
				Duration::from_millis(150)
			};
			time::sleep(pause).await;
		}
	}
}

/// Apply per-command environment variables onto a freshly pushed
/// `Command` scope. Returns `true` when a scope was pushed (so the caller
/// can pop it after the command runs), `false` when there were no vars and
/// the existing scopes remain untouched.
fn apply_command_env(
	shell: &mut BrushShell,
	env: Option<&HashMap<String, String>>,
) -> Result<bool> {
	let Some(env) = env else {
		return Ok(false);
	};
	shell.env_mut().push_scope(EnvironmentScope::Command);
	for (key, value) in env {
		let normalized_key = normalize_env_key(key);
		if should_skip_env_var(normalized_key) {
			continue;
		}
		let mut var = ShellVariable::new(ShellValue::String(value.clone()));
		var.export();
		if let Err(err) = shell
			.env_mut()
			.add(normalized_key, var, EnvironmentScope::Command)
		{
			let _ = shell.env_mut().pop_scope(EnvironmentScope::Command);
			return Err(Error::msg(format!("Failed to set env: {err}")));
		}
	}
	Ok(true)
}

/// Define `env` as a shell variable expanding to the literal `$env` so that
/// brush-core's POSIX parameter expansion preserves PowerShell-style
/// `$env:NAME` references when commands are dispatched through brush to a
/// PowerShell (or any) subprocess. The variable is not exported, so it only
/// influences brush's own expansion; the child process environment is
/// unaffected.
///
/// User-driven assignments (`env=prod; echo "$env:8080"`) push their own
/// binding in the command scope and shadow this global default, preserving
/// the bash POSIX contract for callers that genuinely use a variable named
/// `env`.
fn apply_env_fallback(shell: &mut BrushShell) -> Result<()> {
	if shell.env().get("env").is_some() {
		return Ok(());
	}
	let var = ShellVariable::new(ShellValue::String("$env".to_string()));
	shell
		.env_mut()
		.set_global("env", var)
		.map_err(|err| Error::msg(format!("Failed to set env fallback: {err}")))
}

fn should_skip_env_var(key: &str) -> bool {
	if key.starts_with("BASH_FUNC_") && key.ends_with("%%") {
		return true;
	}

	matches!(
		key,
		"BASH_ENV"
			| "ENV"
			| "HISTFILE"
			| "GJC_SESSION_FILE"
			| "GJC_MANAGED_OWNER_TRANSCRIPT_PATH"
			| "HISTTIMEFORMAT"
			| "HISTCMD"
			| "PS0"
			| "PS1"
			| "PS2"
			| "PS4"
			| "BRUSH_PS_ALT"
			| "READLINE_LINE"
			| "READLINE_POINT"
			| "BRUSH_VERSION"
			| "BASH"
			| "BASHOPTS"
			| "BASH_ALIASES"
			| "BASH_ARGV0"
			| "BASH_CMDS"
			| "BASH_SOURCE"
			| "BASH_SUBSHELL"
			| "BASH_VERSINFO"
			| "BASH_VERSION"
			| "SHELLOPTS"
			| "SHLVL"
			| "SHELL"
			| "COMP_WORDBREAKS"
			| "DIRSTACK"
			| "EPOCHREALTIME"
			| "EPOCHSECONDS"
			| "FUNCNAME"
			| "GROUPS"
			| "IFS"
			| "LINENO"
			| "MACHTYPE"
			| "OSTYPE"
			| "OPTERR"
			| "OPTIND"
			| "PIPESTATUS"
			| "PPID"
			| "PWD"
			| "OLDPWD"
			| "RANDOM"
			| "SRANDOM"
			| "SECONDS"
			| "UID"
			| "EUID"
			| "HOSTNAME"
			| "HOSTTYPE"
	)
}

const fn session_keepalive(result: &ExecutionResult) -> bool {
	match result.next_control_flow {
		ExecutionControlFlow::Normal => true,
		ExecutionControlFlow::BreakLoop { .. } => false,
		ExecutionControlFlow::ContinueLoop { .. } => false,
		ExecutionControlFlow::ReturnFromFunctionOrScript => false,
		ExecutionControlFlow::ExitShell => false,
	}
}

enum OutputRead {
	Streaming,
	Buffered(BufferedOutput),
}

struct BufferedOutput {
	text:     String,
	exceeded: bool,
}

const OUTPUT_CALLBACK_TAIL_BYTES: usize = 64 * 1024;
const OUTPUT_LOSS_MARKER_PREFIX: &str = "\n[Shell output truncated: ";

#[derive(Debug)]
struct OutputTailChunk {
	text:            String,
	offset:          usize,
	counted_dropped: bool,
}

#[derive(Debug)]
struct OutputTail {
	chunks:         VecDeque<OutputTailChunk>,
	bytes:          usize,
	max_bytes:      usize,
	dropped_chunks: usize,
	dropped_bytes:  usize,
}

impl OutputTail {
	const fn new(max_bytes: usize) -> Self {
		Self { chunks: VecDeque::new(), bytes: 0, max_bytes, dropped_chunks: 0, dropped_bytes: 0 }
	}

	fn push(&mut self, text: &str) {
		if text.is_empty() {
			return;
		}
		self.bytes = self.bytes.saturating_add(text.len());
		self.chunks.push_back(OutputTailChunk {
			text:            text.to_string(),
			offset:          0,
			counted_dropped: false,
		});

		while self.bytes > self.max_bytes {
			let overflow = self.bytes - self.max_bytes;
			let Some(front) = self.chunks.front() else {
				break;
			};
			let remaining = front.text.len() - front.offset;
			let mut dropped = remaining.min(overflow);
			if dropped < remaining {
				let mut cut = front.offset + dropped;
				while cut < front.text.len() && !front.text.is_char_boundary(cut) {
					cut += 1;
				}
				dropped = cut - front.offset;
			}
			let drop_whole = dropped == remaining;
			let count_chunk = !front.counted_dropped;

			if count_chunk {
				self.dropped_chunks = self.dropped_chunks.saturating_add(1);
			}
			self.dropped_bytes = self.dropped_bytes.saturating_add(dropped);
			self.bytes -= dropped;
			if drop_whole {
				self.chunks.pop_front();
			} else if let Some(front) = self.chunks.front_mut() {
				front.offset += dropped;
				front.counted_dropped = true;
			}
		}
	}

	fn pop_front(&mut self) -> Option<String> {
		let chunk = self.chunks.pop_front()?;
		let retained = chunk.text[chunk.offset..].to_string();
		self.bytes -= retained.len();
		Some(retained)
	}
}
#[derive(Debug, Clone, Copy, Default)]
struct OutputTruncation {
	output_truncated:          bool,
	output_capture_incomplete: bool,
	output_truncated_chunks:   u64,
	output_truncated_bytes:    u64,
	stdout_truncated:          bool,
	stdout_truncated_bytes:    u64,
	stderr_truncated:          bool,
	stderr_truncated_bytes:    u64,
}

#[derive(Clone)]
struct OutputBudget {
	remaining:          Arc<AtomicUsize>,
	truncated:          Arc<AtomicUsize>,
	truncated_chunks:   Arc<AtomicUsize>,
	capture_incomplete: Arc<AtomicBool>,
}

impl OutputBudget {
	const DEFAULT_LIMIT: usize = 8 * 1024 * 1024;

	fn new(limit: usize) -> Self {
		Self {
			remaining:          Arc::new(AtomicUsize::new(limit)),
			truncated:          Arc::new(AtomicUsize::new(0)),
			truncated_chunks:   Arc::new(AtomicUsize::new(0)),
			capture_incomplete: Arc::new(AtomicBool::new(false)),
		}
	}

	fn mark_truncated(&self, chunks: usize, bytes: usize) {
		self.saturating_add(&self.truncated_chunks, chunks);
		self.saturating_add(&self.truncated, bytes);
	}

	fn saturating_add(&self, counter: &AtomicUsize, value: usize) {
		if let Ok(previous) = counter.fetch_update(Ordering::SeqCst, Ordering::SeqCst, |current| {
			Some(current.saturating_add(value))
		}) && previous.checked_add(value).is_none()
		{
			self.mark_capture_incomplete();
		}
	}

	fn mark_capture_incomplete(&self) {
		self.capture_incomplete.store(true, Ordering::SeqCst);
	}

	fn capture_incomplete(&self) -> bool {
		self.capture_incomplete.load(Ordering::SeqCst)
	}

	fn truncated_bytes(&self) -> u64 {
		u64::try_from(self.truncated.load(Ordering::SeqCst)).unwrap_or(u64::MAX)
	}

	fn truncated_chunks(&self) -> u64 {
		u64::try_from(self.truncated_chunks.load(Ordering::SeqCst)).unwrap_or(u64::MAX)
	}
}

async fn shutdown_reader_task<T>(
	reader_cancel: &CancellationToken,
	reader_handle: &mut tokio::task::JoinHandle<Result<T>>,
	reader_finished: bool,
	timeout: Duration,
) -> Option<T> {
	if reader_finished {
		return None;
	}
	reader_cancel.cancel();
	match time::timeout(timeout, &mut *reader_handle).await {
		Ok(Ok(Ok(output))) => Some(output),
		Ok(_) => None,
		Err(_) => {
			reader_handle.abort();
			let _ = reader_handle.await;
			None
		},
	}
}

async fn shutdown_reader_unit_task(
	reader_cancel: &CancellationToken,
	reader_handle: &mut tokio::task::JoinHandle<()>,
	reader_finished: bool,
	timeout: Duration,
) {
	if reader_finished {
		return;
	}
	reader_cancel.cancel();
	if time::timeout(timeout, &mut *reader_handle).await.is_err() {
		reader_handle.abort();
		let _ = reader_handle.await;
	}
}

async fn read_output(
	reader: fs::File,
	on_chunk: Option<mpsc::Sender<ShellOutputChunk>>,
	cancel_token: CancellationToken,
	activity: mpsc::Sender<()>,
	budget: OutputBudget,
) {
	const REPLACEMENT: &str = "\u{FFFD}";
	const BUF: usize = 65536;
	let mut buf = vec![0u8; BUF + 4]; // +4 for max UTF-8 char
	let mut it = 0;
	let mut callback_tail = OutputTail::new(OUTPUT_CALLBACK_TAIL_BYTES);

	#[cfg(unix)]
	let Ok(reader) = register_nonblocking_pipe(reader) else {
		budget.mark_capture_incomplete();
		return;
	};
	#[cfg(not(unix))]
	let reader = tokio::fs::File::from_std(reader);
	#[cfg(not(unix))]
	tokio::pin!(reader);

	loop {
		#[cfg(unix)]
		let n = {
			let Ok(mut readiness) = (tokio::select! {
				ready = reader.readable() => ready,
				() = cancel_token.cancelled() => {
					budget.mark_capture_incomplete();
					break;
				},
			}) else {
				budget.mark_capture_incomplete();
				break;
			};
			match readiness.try_io(|inner| read_nonblocking(inner.get_ref(), &mut buf[it..BUF])) {
				Ok(Ok(0)) => break,
				Ok(Ok(n)) => n,
				Ok(Err(e)) if e.kind() == io::ErrorKind::Interrupted => continue,
				Ok(Err(_)) => {
					budget.mark_capture_incomplete();
					break;
				},
				Err(_would_block) => continue,
			}
		};
		#[cfg(not(unix))]
		let n = {
			let read_future = reader.read(&mut buf[it..BUF]);
			tokio::pin!(read_future);
			match tokio::select! {
				res = &mut read_future => res,
				() = cancel_token.cancelled() => {
					budget.mark_capture_incomplete();
					break;
				},
			} {
				Ok(0) => break, // EOF
				Ok(n) => n,
				Err(e) if e.kind() == io::ErrorKind::Interrupted => continue,
				Err(_) => {
					budget.mark_capture_incomplete();
					break;
				},
			}
		};
		if n > 0 {
			let _ = activity.try_send(());
		}
		it += n;

		// Consume as much of `pending` as is decodable *right now*.
		while it > 0 {
			let pending = &buf[..it];
			match str::from_utf8(pending) {
				Ok(text) => {
					emit_chunk(text, on_chunk.as_ref(), &budget, &mut callback_tail).await;
					it = 0;
					break;
				},
				Err(err) => {
					let p = err.valid_up_to();
					if p > 0 {
						// SAFETY: [..p] is guaranteed valid UTF-8 by valid_up_to().
						let text = unsafe { str::from_utf8_unchecked(&pending[..p]) };
						emit_chunk(text, on_chunk.as_ref(), &budget, &mut callback_tail).await;
						// copy p..it to the beginning of the buffer
						buf.copy_within(p..it, 0);
						it -= p;
					}

					match err.error_len() {
						Some(p) => {
							// Invalid byte sequence: emit replacement and drop those bytes.
							emit_chunk(REPLACEMENT, on_chunk.as_ref(), &budget, &mut callback_tail).await;
							// copy p..it to the beginning of the buffer
							buf.copy_within(p..it, 0);
							it -= p;
							// continue loop in case more bytes remain after the
							// invalid sequence
						},
						None => {
							// Incomplete UTF-8 sequence at end: keep bytes for next read.
							break;
						},
					}
				},
			}
		}
	}

	// Flush whatever is left at EOF (including an incomplete final sequence).
	for chunk in buf[..it].utf8_chunks() {
		let valid = chunk.valid();
		if !valid.is_empty() {
			emit_chunk(valid, on_chunk.as_ref(), &budget, &mut callback_tail).await;
		}
		if !chunk.invalid().is_empty() {
			emit_chunk(REPLACEMENT, on_chunk.as_ref(), &budget, &mut callback_tail).await;
		}
	}
	flush_output_tail(on_chunk.as_ref(), &budget, &mut callback_tail).await;
}

async fn read_output_buffered(
	reader: fs::File,
	on_chunk: Option<mpsc::Sender<ShellOutputChunk>>,
	cancel_token: CancellationToken,
	activity: mpsc::Sender<()>,
	max_capture_bytes: usize,
	budget: OutputBudget,
) -> BufferedOutput {
	const REPLACEMENT: &str = "\u{FFFD}";
	const BUF: usize = 65536;
	let mut buf = vec![0u8; BUF];
	let mut captured = Vec::new();
	let mut exceeded = false;
	// Pending bytes from a prior read that ended mid-UTF-8 sequence. We hold
	// them back so we emit only valid UTF-8 to the streaming callback while
	// still capturing every byte into `captured` for post-processing.
	let mut pending = Vec::<u8>::new();
	let mut callback_tail = OutputTail::new(OUTPUT_CALLBACK_TAIL_BYTES);

	#[cfg(unix)]
	let Ok(reader) = register_nonblocking_pipe(reader) else {
		budget.mark_capture_incomplete();
		return BufferedOutput { text: String::new(), exceeded: true };
	};
	#[cfg(not(unix))]
	let reader = tokio::fs::File::from_std(reader);
	#[cfg(not(unix))]
	tokio::pin!(reader);

	loop {
		#[cfg(unix)]
		let n = {
			let Ok(mut readiness) = (tokio::select! {
				ready = reader.readable() => ready,
				() = cancel_token.cancelled() => {
					budget.mark_capture_incomplete();
					break;
				},
			}) else {
				budget.mark_capture_incomplete();
				break;
			};
			match readiness.try_io(|inner| read_nonblocking(inner.get_ref(), &mut buf)) {
				Ok(Ok(0)) => break,
				Ok(Ok(n)) => n,
				Ok(Err(e)) if e.kind() == io::ErrorKind::Interrupted => continue,
				Ok(Err(_)) => {
					budget.mark_capture_incomplete();
					break;
				},
				Err(_would_block) => continue,
			}
		};
		#[cfg(not(unix))]
		let n = {
			let read_future = reader.read(&mut buf);
			tokio::pin!(read_future);
			match tokio::select! {
				res = &mut read_future => res,
				() = cancel_token.cancelled() => {
					budget.mark_capture_incomplete();
					break;
				},
			} {
				Ok(0) => break,
				Ok(n) => n,
				Err(e) if e.kind() == io::ErrorKind::Interrupted => continue,
				Err(_) => {
					budget.mark_capture_incomplete();
					break;
				},
			}
		};
		if n > 0 {
			let _ = activity.try_send(());
		}
		// Once `exceeded`, the post-process minimizer is bypassed (see the
		// `!output.exceeded` gate at the call site), so further appends just
		// grow `captured` without serving any purpose. Stop accumulating to
		// bound peak memory on commands that produce very large output.
		if !exceeded {
			if captured.len().saturating_add(n) > max_capture_bytes {
				exceeded = true;
			} else {
				captured.extend_from_slice(&buf[..n]);
			}
		}

		// Stream whatever is validly decodable *right now* to the callback,
		// carrying incomplete trailing UTF-8 bytes over to the next iteration.
		if let Some(cb) = on_chunk.as_ref() {
			pending.extend_from_slice(&buf[..n]);
			while !pending.is_empty() {
				match str::from_utf8(&pending) {
					Ok(text) => {
						emit_chunk(text, Some(cb), &budget, &mut callback_tail).await;
						pending.clear();
						break;
					},
					Err(err) => {
						let p = err.valid_up_to();
						if p > 0 {
							// SAFETY: [..p] is valid UTF-8 per valid_up_to().
							let text = unsafe { str::from_utf8_unchecked(&pending[..p]) };
							emit_chunk(text, Some(cb), &budget, &mut callback_tail).await;
							pending.drain(..p);
						}
						match err.error_len() {
							Some(skip) => {
								emit_chunk(REPLACEMENT, Some(cb), &budget, &mut callback_tail).await;
								pending.drain(..skip);
							},
							None => break,
						}
					},
				}
			}
		}
	}

	// Flush any trailing bytes the streaming decoder held back at EOF.
	if let Some(cb) = on_chunk.as_ref() {
		for chunk in pending.utf8_chunks() {
			let valid = chunk.valid();
			if !valid.is_empty() {
				emit_chunk(valid, Some(cb), &budget, &mut callback_tail).await;
			}
			if !chunk.invalid().is_empty() {
				emit_chunk(REPLACEMENT, Some(cb), &budget, &mut callback_tail).await;
			}
		}
	}
	flush_output_tail(on_chunk.as_ref(), &budget, &mut callback_tail).await;

	BufferedOutput { text: String::from_utf8_lossy(&captured).into_owned(), exceeded }
}

#[cfg(unix)]
fn register_nonblocking_pipe(reader: fs::File) -> io::Result<tokio::io::unix::AsyncFd<fs::File>> {
	set_nonblocking(&reader)?;
	tokio::io::unix::AsyncFd::new(reader)
}

#[cfg(unix)]
fn set_nonblocking<T: std::os::fd::AsRawFd>(file: &T) -> io::Result<()> {
	let fd = file.as_raw_fd();
	// SAFETY: `fd` is owned by `file` and remains valid for the duration of
	// these `fcntl` calls.
	let flags = unsafe { libc::fcntl(fd, libc::F_GETFL) };
	if flags < 0 {
		return Err(io::Error::last_os_error());
	}
	if flags & libc::O_NONBLOCK != 0 {
		return Ok(());
	}

	// SAFETY: `fd` remains valid here and we are only toggling `O_NONBLOCK`.
	let result = unsafe { libc::fcntl(fd, libc::F_SETFL, flags | libc::O_NONBLOCK) };
	if result < 0 {
		Err(io::Error::last_os_error())
	} else {
		Ok(())
	}
}

#[cfg(unix)]
fn read_nonblocking<T: std::os::fd::AsRawFd>(file: &T, buf: &mut [u8]) -> io::Result<usize> {
	// SAFETY: `buf` is writable for `buf.len()` bytes, and the raw fd obtained
	// from `file` stays valid for the duration of the syscall.
	let read = unsafe { libc::read(file.as_raw_fd(), buf.as_mut_ptr().cast(), buf.len()) };
	if read < 0 {
		Err(io::Error::last_os_error())
	} else {
		Ok(read as usize)
	}
}

async fn emit_chunk(
	text: &str,
	callback: Option<&mpsc::Sender<ShellOutputChunk>>,
	budget: &OutputBudget,
	tail: &mut OutputTail,
) {
	if text.is_empty() {
		return;
	}
	let Some(callback) = callback else {
		return;
	};
	let allowed = budget
		.remaining
		.fetch_update(Ordering::SeqCst, Ordering::SeqCst, |remaining| {
			Some(remaining.saturating_sub(text.len()))
		})
		.unwrap_or(0)
		.min(text.len());
	let mut end = allowed;
	while !text.is_char_boundary(end) {
		end -= 1;
	}
	if end > 0
		&& callback
			.send(ShellOutputChunk::source(text[..end].to_string()))
			.await
			.is_err()
	{
		budget.mark_capture_incomplete();
		return;
	}
	if end < text.len() {
		tail.push(&text[end..]);
	}
}

async fn flush_output_tail(
	callback: Option<&mpsc::Sender<ShellOutputChunk>>,
	budget: &OutputBudget,
	tail: &mut OutputTail,
) {
	let Some(callback) = callback else {
		return;
	};
	if tail.dropped_bytes > 0 {
		budget.mark_truncated(tail.dropped_chunks, tail.dropped_bytes);
		let marker = format!(
			"{OUTPUT_LOSS_MARKER_PREFIX}{} chunks / {} bytes dropped]\n",
			tail.dropped_chunks, tail.dropped_bytes
		);
		if callback
			.send(ShellOutputChunk::loss_marker(marker))
			.await
			.is_err()
		{
			budget.mark_capture_incomplete();
			return;
		}
	}
	while let Some(chunk) = tail.pop_front() {
		if callback
			.send(ShellOutputChunk::source(chunk))
			.await
			.is_err()
		{
			budget.mark_capture_incomplete();
			break;
		}
	}
}

fn pipe_to_files(label: &str) -> Result<(fs::File, fs::File)> {
	let (r, w) =
		os_pipe::pipe().map_err(|err| Error::msg(format!("Failed to create {label} pipe: {err}")))?;

	#[cfg(unix)]
	let (r, w): (fs::File, fs::File) = {
		use std::os::unix::io::{FromRawFd, IntoRawFd};
		let r = r.into_raw_fd();
		let w = w.into_raw_fd();
		// SAFETY: We just obtained these fds from os_pipe and own them exclusively.
		unsafe { (FromRawFd::from_raw_fd(r), FromRawFd::from_raw_fd(w)) }
	};

	#[cfg(windows)]
	let (r, w): (fs::File, fs::File) = {
		use std::os::windows::io::{FromRawHandle, IntoRawHandle};
		let r = r.into_raw_handle();
		let w = w.into_raw_handle();
		// SAFETY: We just obtained these handles from os_pipe and own them exclusively.
		unsafe { (FromRawHandle::from_raw_handle(r), FromRawHandle::from_raw_handle(w)) }
	};

	Ok((r, w))
}

#[derive(Parser)]
#[command(disable_help_flag = true)]
struct SleepCommand {
	#[arg(required = true)]
	durations: Vec<String>,
}

impl builtins::Command for SleepCommand {
	type Error = brush_core::Error;

	fn execute<SE: brush_core::ShellExtensions>(
		&self,
		context: ExecutionContext<'_, SE>,
	) -> impl Future<Output = std::result::Result<ExecutionResult, brush_core::Error>> + Send {
		let durations = self.durations.clone();
		async move {
			if context.is_cancelled() {
				return Ok(ExecutionExitCode::Interrupted.into());
			}
			let mut total = Duration::from_millis(0);
			for duration in &durations {
				let Some(parsed) = parse_duration(duration) else {
					let _ = writeln!(context.stderr(), "sleep: invalid time interval '{duration}'");
					return Ok(ExecutionResult::new(1));
				};
				total += parsed;
			}
			let sleep = time::sleep(total);
			tokio::pin!(sleep);
			if let Some(cancel_token) = context.cancel_token() {
				tokio::select! {
					() = &mut sleep => Ok(ExecutionResult::success()),
					() = cancel_token.cancelled() => Ok(ExecutionExitCode::Interrupted.into()),
				}
			} else {
				sleep.await;
				Ok(ExecutionResult::success())
			}
		}
	}
}

#[derive(Parser)]
#[command(disable_help_flag = true)]
struct TimeoutCommand {
	#[arg(required = true)]
	duration: String,
	#[arg(required = true, num_args = 1.., trailing_var_arg = true)]
	command:  Vec<String>,
}

impl builtins::Command for TimeoutCommand {
	type Error = brush_core::Error;

	fn execute<SE: brush_core::ShellExtensions>(
		&self,
		context: ExecutionContext<'_, SE>,
	) -> impl Future<Output = std::result::Result<ExecutionResult, brush_core::Error>> + Send {
		let duration = self.duration.clone();
		let command = self.command.clone();
		async move {
			if context.is_cancelled() {
				return Ok(ExecutionExitCode::Interrupted.into());
			}
			let Some(timeout) = parse_duration(&duration) else {
				let _ = writeln!(context.stderr(), "timeout: invalid time interval '{duration}'");
				return Ok(ExecutionResult::new(125));
			};
			if command.is_empty() {
				let _ = writeln!(context.stderr(), "timeout: missing command");
				return Ok(ExecutionResult::new(125));
			}

			let child_cancel = CancellationToken::new();
			let mut params = context.params.clone();
			params.process_group_policy = ProcessGroupPolicy::NewProcessGroup;
			params.set_cancel_token(child_cancel.clone());
			let process_shutdown = CancellationToken::new();
			let _process_shutdown_guard = process_shutdown.clone().drop_guard();
			let command_groups =
				Arc::new(CommandProcessGroups::new(process_shutdown, child_cancel.clone()));
			params.set_process_group_observer(command_groups.clone());

			let mut command_line = String::new();
			for (idx, arg) in command.iter().enumerate() {
				if idx > 0 {
					command_line.push(' ');
				}
				command_line.push_str(&quote_arg(arg));
			}

			let cancel_token = context.cancel_token();
			let source_info = SourceInfo::from("pi-natives:timeout");
			let baseline_job_id = context
				.shell
				.jobs()
				.jobs
				.iter()
				.map(|job| job.id)
				.max()
				.unwrap_or(0);
			let result = {
				let run_future = context
					.shell
					.run_string(command_line, &source_info, &params);
				tokio::pin!(run_future);

				if let Some(cancel_token) = cancel_token {
					tokio::select! {
						result = &mut run_future => result,
						() = time::sleep(timeout) => {
							child_cancel.cancel();
							terminate_owned_process_groups(&command_groups).await;
							let _ = time::timeout(Duration::from_secs(2), &mut run_future).await;
							terminate_owned_process_groups(&command_groups).await;
							Ok(ExecutionResult::new(124))
						},
						() = cancel_token.cancelled() => {
							child_cancel.cancel();
							terminate_owned_process_groups(&command_groups).await;
							let _ = time::timeout(Duration::from_secs(2), &mut run_future).await;
							terminate_owned_process_groups(&command_groups).await;
							Ok(ExecutionExitCode::Interrupted.into())
						},
					}
				} else {
					tokio::select! {
						result = &mut run_future => result,
						() = time::sleep(timeout) => {
							child_cancel.cancel();
							terminate_owned_process_groups(&command_groups).await;
							let _ = time::timeout(Duration::from_secs(2), &mut run_future).await;
							terminate_owned_process_groups(&command_groups).await;
							Ok(ExecutionResult::new(124))
						},
					}
				}
			};
			command_groups.settle_spawn_barrier().await;
			let background_jobs = context.shell.jobs().jobs.iter().any(|job| {
				job.id > baseline_job_id && !matches!(&job.state, brush_core::jobs::JobState::Done)
			});
			if background_jobs || command_groups.has_active_processes() {
				terminate_owned_process_groups(&command_groups).await;
			}
			command_groups.finish_snapshot().await;
			if background_jobs
				|| command_groups.has_active_processes()
				|| command_groups.overflowed()
				|| command_groups.ownership_incomplete()
			{
				let message = if command_groups.ownership_incomplete() {
					command_groups.ownership_error_message()
				} else {
					"Shell process ownership limit reached".to_owned()
				};
				return Err(brush_core::ErrorKind::InternalError(message).into());
			}
			result
		}
	}
}
fn parse_duration(input: &str) -> Option<Duration> {
	let trimmed = input.trim();
	if trimmed.is_empty() {
		return None;
	}
	let (number, multiplier) = match trimmed.chars().last()? {
		's' => (&trimmed[..trimmed.len() - 1], 1.0),
		'm' => (&trimmed[..trimmed.len() - 1], 60.0),
		'h' => (&trimmed[..trimmed.len() - 1], 3600.0),
		'd' => (&trimmed[..trimmed.len() - 1], 86400.0),
		ch if ch.is_ascii_alphabetic() => return None,
		_ => (trimmed, 1.0),
	};
	let value = number.parse::<f64>().ok()?;
	if value.is_sign_negative() {
		return None;
	}
	let millis = value * multiplier * 1000.0;
	if !millis.is_finite() || millis < 0.0 {
		return None;
	}
	Some(Duration::from_millis(millis.round() as u64))
}

fn quote_arg(arg: &str) -> String {
	if arg.is_empty() {
		return "''".to_string();
	}
	let safe = arg
		.chars()
		.all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.' | '/' | ':' | '+'));
	if safe {
		return arg.to_string();
	}
	let escaped = arg.replace('\'', "'\"'\"'");
	format!("'{escaped}'")
}

#[cfg(test)]
mod tests {
	use super::*;

	#[cfg(any(unix, windows))]
	static PROCESS_TEST_LOCK: TokioMutex<()> = TokioMutex::const_new(());
	#[cfg(unix)]
	async fn wait_until_descendant_visible(pid: i32) {
		for _ in 0..100 {
			if process::current_descendant_pids().contains(&pid) {
				return;
			}
			time::sleep(Duration::from_millis(10)).await;
		}

		panic!("descendant {pid} did not become visible to process discovery");
	}

	/// Truth-table coverage for `brush_core::commands::child_session_action`.
	///
	/// Lives in `pi-natives` because the brush-core crate is excluded from the
	/// workspace (vendored upstream) and cannot be tested standalone — its tokio
	/// dependency only resolves the `net` feature via feature-unification with
	/// other workspace members.
	mod child_session_action {
		use brush_core::commands::{ChildSessionAction, child_session_action};

		/// Interactive brush, leading its own pgroup, terminal stdin: foreground.
		#[test]
		fn interactive_with_terminal_stdin_takes_foreground() {
			assert_eq!(child_session_action(true, true, false), ChildSessionAction::TakeForeground,);
			// Terminal foregrounding wins even when this is the first stage of a
			// pipeline; no detach is attempted.
			assert_eq!(child_session_action(true, true, true), ChildSessionAction::TakeForeground,);
		}

		/// Brush leading a new pgroup with non-terminal stdin detaches only when
		/// it is not part of a multi-command pipeline. Pipeline leaders must stay
		/// in the parent session so later stages can join their process group.
		#[test]
		fn non_terminal_stdin_leading_new_pgroup_detaches_unless_pipeline() {
			assert_eq!(child_session_action(true, false, false), ChildSessionAction::DetachSession,);
			assert_eq!(child_session_action(true, false, true), ChildSessionAction::None,);
		}

		/// Non-interactive brush, terminal stdin, no pipeline: nothing to do.
		#[test]
		fn non_interactive_with_terminal_stdin_does_nothing() {
			assert_eq!(child_session_action(false, true, false), ChildSessionAction::None,);
		}

		/// Non-interactive brush, terminal stdin, joining a pipeline pgroup:
		/// nothing to do (parent already wired pgroup membership).
		#[test]
		fn non_interactive_terminal_stdin_in_pipeline_does_nothing() {
			assert_eq!(child_session_action(false, true, true), ChildSessionAction::None,);
		}

		/// **Embedded host bug fix.** Non-interactive brush, non-terminal stdin,
		/// no pipeline pgroup: detach so the child cannot SIGTTIN/SIGTTOU the
		/// host. This is the case that regressed before this fix and is the
		/// motivating bug for PR #895.
		#[test]
		fn embedded_host_with_non_terminal_stdin_detaches() {
			assert_eq!(child_session_action(false, false, false), ChildSessionAction::DetachSession,);
		}

		/// **Pipeline carve-out.** Non-interactive brush, non-terminal stdin
		/// (pipe), and a multi-command pipeline: MUST NOT detach. For the first
		/// external stage, `setsid()` puts the process-group leader into a
		/// different session, so later stages fail to join its group with
		/// EPERM. For later stages, `setsid()` would either fail with EPERM or
		/// move the child into a new session, breaking the pipeline's shared
		/// process group and job-control signal propagation.
		#[test]
		fn pipeline_stage_does_not_detach() {
			assert_eq!(child_session_action(false, false, true), ChildSessionAction::None,);
		}
	}

	/// End-to-end verification that brush, when embedded as a non-interactive
	/// library (`interactive: false`, exactly what `create_session` produces),
	/// spawns external commands in a **separate session** from the host.
	///
	/// The truth-table tests in `child_session_action` cover the decision in
	/// isolation. This test covers the wiring: it boots a real `BrushShell`,
	/// runs a child that prints its PID then sleeps, and asks the kernel for
	/// that PID's session via `getsid(2)` while the child is still alive.
	/// Pre-fix (`new_pg=false` skipped `detach_session`), the child inherited
	/// the host's session, so `getsid(child_pid) == getsid(0)`. Post-fix,
	/// `setsid` ran and the child is its own session leader
	/// (`getsid(child_pid) == child_pid`).
	#[cfg(unix)]
	#[tokio::test(flavor = "multi_thread")]
	async fn embedded_external_command_runs_in_its_own_session() {
		use std::io::Read as _;
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;

		// SAFETY: `getsid(0)` only queries the current process session; the return
		// value is checked.
		let host_sid = unsafe { libc::getsid(0) };
		assert!(host_sid > 0, "getsid(0) failed: {}", std::io::Error::last_os_error());

		// Build the same kind of session pi-natives uses in production.
		let config = ShellConfig { session_env: None, snapshot_path: None, minimizer: None };
		let mut session = create_session(&config, CancellationToken::new())
			.await
			.expect("create_session");

		// Output pipe shared between the brush child and a concurrent reader. The
		// reader runs on a blocking thread because `os_pipe` reads are blocking.
		let (mut reader, writer) = pipe_to_files("e2e").expect("pipe");
		let stdout_file = OpenFile::from(writer.try_clone().expect("clone"));
		let stderr_file = OpenFile::from(writer);

		let mut params = session.shell.default_exec_params();
		params.set_fd(OpenFiles::STDIN_FD, null_file().expect("null stdin"));
		params.set_fd(OpenFiles::STDOUT_FD, stdout_file);
		params.set_fd(OpenFiles::STDERR_FD, stderr_file);

		// (pid_tx, pid_rx) — reader task signals the test as soon as it has the PID.
		let (pid_tx, pid_rx) = tokio::sync::oneshot::channel::<i32>();
		let reader_handle = tokio::task::spawn_blocking(move || {
			let mut buf = Vec::new();
			// Read just enough to capture the PID line. The child sleeps after
			// printing so the pipe will not back-pressure.
			let mut chunk = [0u8; 64];
			let mut pid_tx = Some(pid_tx);
			while let Ok(n) = reader.read(&mut chunk)
				&& n > 0
			{
				buf.extend_from_slice(&chunk[..n]);
				if pid_tx.is_some()
					&& let Some(line_end) = buf.iter().position(|&byte| byte == b'\n')
					&& let Ok(line) = std::str::from_utf8(&buf[..line_end])
					&& let Ok(pid) = line.trim().parse::<i32>()
				{
					let _ = pid_tx
						.take()
						.expect("pid sender should be present")
						.send(pid);
				}
			}
			buf
		});

		// Run brush in the background so we can call `getsid(child_pid)` while
		// the child is still alive.
		let shell_handle = tokio::spawn(async move {
			let source_info = SourceInfo::from("pi-natives:test");
			// `printf '%d\n' "$$"` then `sleep 0.5`. Long enough for our `getsid`.
			let exec = session
				.shell
				.run_string("/bin/sh -c 'printf \"%d\\n\" \"$$\"; sleep 0.5'", &source_info, &params)
				.await
				.expect("run_string");
			drop(params);
			(session, exec)
		});

		let child_pid = time::timeout(Duration::from_secs(5), pid_rx)
			.await
			.expect("timed out waiting for child PID")
			.expect("reader closed pid channel without sending");
		assert!(child_pid > 0, "got non-positive child pid: {child_pid}");

		// Snapshot the child's session ID immediately, while the child is still
		// in `sleep`. POSIX guarantees `getsid` against a live PID returns the
		// session of that process.
		// SAFETY: `child_pid` is a positive PID from the child; errors are reported via
		// the checked return value.
		let child_sid = unsafe { libc::getsid(child_pid) };
		assert!(
			child_sid > 0,
			"getsid({child_pid}) failed: {} (child may have already exited)",
			std::io::Error::last_os_error(),
		);

		// Drain the brush task and the pipe reader.
		let (_session, exec) = time::timeout(Duration::from_secs(5), shell_handle)
			.await
			.expect("shell timed out")
			.expect("shell task panicked");
		assert!(
			matches!(exec.exit_code, ExecutionExitCode::Success),
			"unexpected exit: {}",
			exit_code(&exec),
		);
		let _ = time::timeout(Duration::from_secs(2), reader_handle).await;

		assert_ne!(
			child_sid, host_sid,
			"child PID {child_pid} inherited host session {host_sid}; setsid() did not run — the \
			 embedded-host bug is back",
		);
		assert_eq!(
			child_sid, child_pid,
			"child PID {child_pid} should be its own session leader after setsid",
		);
	}

	#[tokio::test]
	async fn abort_state_signals_cancel_token() {
		let abort_state = ShellAbortState::default();
		let mut cancel_token = CancelToken::default();
		let abort_token = cancel_token.emplace_abort_token();

		let generation = abort_state.publish(abort_token).await;
		abort_state.activate(generation).await;
		abort_state.abort().await;

		let reason = time::timeout(Duration::from_millis(100), cancel_token.wait())
			.await
			.expect("cancel token should be signalled");
		assert!(matches!(reason, AbortReason::Signal));
	}

	#[tokio::test]
	async fn abort_state_latches_abort_before_token_publication() {
		let abort_state = ShellAbortState::default();
		let mut cancel_token = CancelToken::default();

		abort_state.abort().await;
		let abort_token = cancel_token.emplace_abort_token();
		let generation = abort_state.publish(abort_token).await;
		abort_state.activate(generation).await;

		let reason = time::timeout(Duration::from_millis(100), cancel_token.wait())
			.await
			.expect("latched abort should signal token after publication");
		assert!(matches!(reason, AbortReason::Signal));
	}

	#[tokio::test]
	async fn abort_state_latches_abort_after_stale_generation_cleared() {
		let abort_state = ShellAbortState::default();
		let mut stale_cancel = CancelToken::default();
		let stale_abort = stale_cancel.emplace_abort_token();
		let stale_generation = abort_state.publish(stale_abort).await;
		abort_state.activate(stale_generation).await;
		abort_state.clear(stale_generation).await;

		abort_state.abort().await;

		let mut next_cancel = CancelToken::default();
		let next_abort = next_cancel.emplace_abort_token();
		let next_generation = abort_state.publish(next_abort).await;
		abort_state.activate(next_generation).await;

		let reason = time::timeout(Duration::from_millis(100), next_cancel.wait())
			.await
			.expect("handoff-window abort should latch for the next active token");
		assert!(matches!(reason, AbortReason::Signal));
		assert!(
			time::timeout(Duration::from_millis(20), stale_cancel.wait())
				.await
				.is_err(),
			"stale generation should already be cleared, not signalled again"
		);
	}

	#[test]
	fn stale_group_anchors_are_pruned_before_capacity_admission() {
		let groups = CommandProcessGroups::default();
		{
			let mut anchors = groups
				.state
				.group_anchors
				.lock()
				.unwrap_or_else(|poisoned| poisoned.into_inner());
			anchors.insert(17, (17, "stale".to_owned()));
		}
		assert!(CommandProcessGroups::prune_group_anchors(&groups.state));
		assert!(
			groups
				.state
				.group_anchors
				.lock()
				.unwrap_or_else(|poisoned| poisoned.into_inner())
				.is_empty()
		);
	}

	#[tokio::test]
	async fn latent_ownership_uncertainty_rejects_snapshot_finalization() {
		let groups = CommandProcessGroups::default();
		groups.external_command_spawned(None, None);
		groups.finish_snapshot().await;
		assert!(groups.overflowed());
		assert!(groups.ownership_incomplete());
	}

	#[cfg(unix)]
	#[tokio::test]
	async fn late_spawn_after_snapshot_finalization_is_killed() {
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;
		let groups = CommandProcessGroups::default();
		groups.finish_snapshot().await;
		let mut child = std::process::Command::new("sleep")
			.arg("30")
			.spawn()
			.expect("late child should spawn");
		let pid = i32::try_from(child.id()).expect("late child PID should fit i32");
		groups.external_command_spawned(Some(pid), None);
		let exited = child
			.try_wait()
			.expect("late child status should be readable")
			.is_some();
		if !exited {
			let _ = child.kill();
			let _ = child.wait();
		}
		assert!(groups.overflowed());
		assert!(groups.ownership_incomplete());
	}

	#[cfg(unix)]
	#[tokio::test]
	async fn bounded_descendant_snapshot_reports_fanout_without_over_materialization() {
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;
		let mut children = (0..4)
			.map(|_| {
				std::process::Command::new("sleep")
					.arg("30")
					.spawn()
					.expect("fanout child should spawn")
			})
			.collect::<Vec<_>>();
		let root = process::Process::from_pid(
			i32::try_from(std::process::id()).expect("root PID should fit"),
		)
		.expect("test root should be pinnable");
		let (descendants, incomplete) = root.descendants_exact_bounded(1);
		let (zero_descendants, zero_incomplete) = root.descendants_exact_bounded(0);
		for child in &mut children {
			let _ = child.kill();
			let _ = child.wait();
		}
		assert!(descendants.len() <= 1);
		assert!(zero_descendants.is_empty());
		assert!(
			incomplete || zero_incomplete || descendants.is_empty(),
			"fanout beyond the bound must be incomplete"
		);
	}

	#[cfg(unix)]
	#[tokio::test]
	async fn cancellation_latch_kills_a_process_registered_after_cancel() {
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;
		let groups = CommandProcessGroups::default();
		groups.cancel();
		let mut child = std::process::Command::new("sleep")
			.arg("5")
			.spawn()
			.expect("sleep child should spawn");
		groups.record(i32::try_from(child.id()).expect("child PID should fit i32"));
		for _ in 0..50 {
			if child
				.try_wait()
				.expect("child status should be readable")
				.is_some()
			{
				break;
			}
			time::sleep(Duration::from_millis(10)).await;
		}
		let exited = child
			.try_wait()
			.expect("child status should be readable")
			.is_some();
		if !exited {
			let _ = child.kill();
			let _ = child.wait();
		}
		groups.finish();
		assert!(exited, "late registered child survived cancellation latch");
	}

	#[tokio::test]
	async fn missing_spawn_identity_is_ownership_incomplete() {
		let groups = CommandProcessGroups::default();
		groups.external_command_spawned(None, None);
		groups.cancel();
		assert!(groups.overflowed());
		assert!(groups.ownership_incomplete());
	}

	#[cfg(unix)]
	#[tokio::test]
	async fn later_pinned_spawn_does_not_clear_missing_spawn_identity() {
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;
		let groups = CommandProcessGroups::default();
		groups.external_command_spawned(None, None);
		let mut child = std::process::Command::new("sleep")
			.arg("30")
			.spawn()
			.expect("spawn unrelated pinned child");
		let pid = i32::try_from(child.id()).expect("child PID should fit i32");
		groups.external_command_spawned(Some(pid), None);
		groups.cancel();
		assert!(groups.overflowed());
		assert!(groups.ownership_incomplete());
		let _ = process::Process::from_pid(pid)
			.map(|process| process.kill_tree(Some(process::KILL_SIGNAL)));
		let _ = child.wait();
		groups.finish();
	}

	#[tokio::test]
	async fn persistent_shell_rejects_runs_beyond_admission_limit() {
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;
		let shell = Shell::new(None);
		let _permits = (0..MAX_PENDING_SHELL_RUNS)
			.map(|_| {
				shell
					.run_slots
					.clone()
					.try_acquire_owned()
					.expect("slot should be available")
			})
			.collect::<Vec<_>>();
		let error = shell
			.run(
				ShellRunOptions { command: "printf unreachable".to_string(), ..Default::default() },
				None,
				CancelToken::default(),
			)
			.await
			.expect_err("the sixty-fifth run must be rejected before queueing");
		assert!(error.to_string().contains("pending run limit reached"));
	}

	#[tokio::test]
	async fn one_shot_shell_rejects_runs_beyond_shared_admission_limit() {
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;
		let shell = Shell::new(None);
		let _permits = (0..MAX_PENDING_SHELL_RUNS)
			.map(|_| {
				shell
					.run_slots
					.clone()
					.try_acquire_owned()
					.expect("slot should be available")
			})
			.collect::<Vec<_>>();
		let error = execute_shell(
			ShellExecuteOptions { command: "printf unreachable".to_string(), ..Default::default() },
			None,
			CancelToken::default(),
		)
		.await
		.expect_err("the shared sixty-fifth run must be rejected before spawning");
		assert!(error.to_string().contains("pending run limit reached"));
	}

	#[tokio::test]
	async fn one_shot_shell_releases_shared_admission_after_each_result() {
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;
		let shell = Shell::new(None);
		let baseline = shell.run_slots.available_permits();
		for _ in 0..(MAX_PENDING_SHELL_RUNS + 8) {
			let result = execute_shell(
				ShellExecuteOptions { command: "printf ok".to_string(), ..Default::default() },
				None,
				CancelToken::default(),
			)
			.await
			.expect("sequential one-shot run should remain admitted");
			assert_eq!(result.exit_code, Some(0));
			assert_eq!(shell.run_slots.available_permits(), baseline);
		}
	}

	#[cfg(unix)]
	#[tokio::test(flavor = "multi_thread")]
	async fn shell_abort_before_run_token_publication_interrupts_command() {
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;
		let shell = Shell::new(None);
		shell.abort().await;

		let started = std::time::Instant::now();
		let outcome = time::timeout(
			Duration::from_secs(2),
			shell.run(
				ShellRunOptions { command: "/bin/sh -c 'sleep 5'".to_string(), ..Default::default() },
				None,
				CancelToken::default(),
			),
		)
		.await
		.expect("latched abort should interrupt instead of hanging");
		match outcome {
			Ok(result) => {
				assert!(result.cancelled, "latched Shell::abort should surface as cancellation");
				assert_eq!(result.exit_code, None);
				assert_eq!(result.output_truncated_chunks, 0);
				assert_eq!(result.output_truncated_bytes, 0);
			},
			Err(error) => {
				assert!(error.to_string().contains("ownership incomplete"), "error={error:#}");
			},
		}
		assert!(started.elapsed() < Duration::from_secs(2), "command was not interrupted promptly");
	}

	#[cfg(unix)]
	#[tokio::test(flavor = "multi_thread")]
	async fn overlapping_shell_abort_interrupts_active_run_not_queued_run() {
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;
		let shell = Arc::new(Shell::new(None));
		let (first_tx, mut first_rx) = mpsc::channel::<ShellOutputChunk>(1024);
		let (second_tx, mut second_rx) = mpsc::channel::<ShellOutputChunk>(1024);

		let first = tokio::spawn({
			let shell = shell.clone();
			async move {
				shell
					.run(
						ShellRunOptions {
							command: "printf first-started; sleep 5".to_string(),
							..Default::default()
						},
						Some(first_tx),
						CancelToken::default(),
					)
					.await
			}
		});

		// Output may arrive in multiple chunks: the reader emits whatever bytes
		// are decodable per pipe read, so a logical marker can be split across
		// chunks (e.g. a lone "f"). Accumulate until the full marker is present.
		let mut first_seen = String::new();
		while !first_seen.starts_with("first-started") {
			let chunk = time::timeout(Duration::from_secs(2), first_rx.recv())
				.await
				.expect("first command should emit startup marker")
				.expect("first output channel should remain open");
			first_seen.push_str(&chunk.text);
		}
		assert!(first_seen.starts_with("first-started"), "unexpected first output: {first_seen:?}");

		let second = tokio::spawn({
			let shell = shell.clone();
			async move {
				shell
					.run(
						ShellRunOptions {
							command: "printf second-ran".to_string(),
							..Default::default()
						},
						Some(second_tx),
						CancelToken::default(),
					)
					.await
			}
		});
		time::sleep(Duration::from_millis(50)).await;

		shell.abort().await;

		let first_result = time::timeout(Duration::from_secs(2), first)
			.await
			.expect("active run should finish promptly after abort")
			.expect("active run task should not panic")
			.expect("active run should return a result");
		assert!(first_result.cancelled, "abort should target the active first run");
		assert_eq!(first_result.exit_code, None);
		while let Some(chunk) = time::timeout(Duration::from_secs(2), first_rx.recv())
			.await
			.expect("first callback channel should settle after active abort")
		{
			first_seen.push_str(&chunk.text);
		}
		assert_eq!(first_seen, "first-started");
		assert!(!first_result.output_truncated);
		assert_eq!(first_result.output_truncated_chunks, 0);
		assert_eq!(first_result.output_truncated_bytes, 0);

		let second_result = time::timeout(Duration::from_secs(2), second)
			.await
			.expect("queued run should finish after active run releases session")
			.expect("queued run task should not panic")
			.expect("queued run should return a result");
		assert!(!second_result.cancelled, "queued run must not steal the abort target");
		assert_eq!(second_result.exit_code, Some(0));

		// The queued run's `printf second-ran` output can likewise be split
		// across chunks; accumulate until the full marker is received.
		let mut second_seen = String::new();
		while second_seen != "second-ran" {
			let chunk = time::timeout(Duration::from_secs(2), second_rx.recv())
				.await
				.expect("second command should emit after active abort")
				.expect("second output channel should remain open");
			second_seen.push_str(&chunk.text);
		}
		assert_eq!(second_seen, "second-ran");
	}

	#[cfg(unix)]
	#[tokio::test(flavor = "multi_thread")]
	async fn successful_group_leader_exit_fails_closed_without_descendant_closure() {
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;
		let result = execute_shell(
			ShellExecuteOptions {
				command: "sh -c 'sleep 30 & exit'".to_owned(),
				..Default::default()
			},
			None,
			CancelToken::default(),
		)
		.await;
		assert!(
			result
				.as_ref()
				.is_ok_and(|value| value.output_capture_incomplete)
				|| result
					.as_ref()
					.err()
					.is_some_and(|error| error.to_string().contains("ownership incomplete")),
			"root exit without descendant closure was neither disclosed nor rejected: {result:?}"
		);
	}
	#[cfg(unix)]
	#[tokio::test(flavor = "multi_thread")]
	async fn cancelling_after_group_leader_exit_fails_closed_without_anchor() {
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;
		let marker =
			std::env::temp_dir().join(format!("pi-shell-group-member-{}", std::process::id()));
		let _ = fs::remove_file(&marker);
		let shell = Arc::new(Shell::new(None));
		let (tx, mut rx) = mpsc::channel::<ShellOutputChunk>(32);
		let run = tokio::spawn({
			let shell = shell.clone();
			let command = format!(
				"sh -c 'sleep 0.2; sleep 30 & echo $! > \"{}\"'; printf leader-exited; sleep 30",
				marker.display()
			);
			async move {
				shell
					.run(
						ShellRunOptions { command, ..Default::default() },
						Some(tx),
						CancelToken::default(),
					)
					.await
			}
		});
		let mut output = String::new();
		while !output.contains("leader-exited") {
			output.push_str(
				&time::timeout(Duration::from_secs(2), rx.recv())
					.await
					.expect("leader-exit marker should arrive")
					.expect("leader-exit output should remain open")
					.text,
			);
		}
		let background_pid: i32 = fs::read_to_string(&marker)
			.expect("group leader should publish background PID")
			.trim()
			.parse()
			.expect("background PID should parse");
		shell.abort().await;
		let outcome = time::timeout(Duration::from_secs(3), run)
			.await
			.expect("group cancellation should settle")
			.expect("group task should not panic");
		let ownership_settled = match outcome {
			Ok(result) => {
				assert!(result.cancelled);
				true
			},
			Err(error) => {
				assert!(error.to_string().contains("ownership incomplete"), "error={error:#}");
				false
			},
		};
		if ownership_settled {
			let background_dead = process::Process::from_pid(background_pid)
				.is_none_or(|process| process.status() != process::ProcessStatus::Running);
			assert!(background_dead, "settled cancellation left group member {background_pid} alive");
		}
		if let Some(process) = process::Process::from_pid(background_pid) {
			let _ = process.kill_tree(Some(process::KILL_SIGNAL));
		}
		let _ = fs::remove_file(&marker);
	}

	#[cfg(unix)]
	#[tokio::test(flavor = "multi_thread")]
	async fn cancelling_command_substitution_settles_or_reports_background_ownership_uncertainty() {
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;
		let marker =
			std::env::temp_dir().join(format!("pi-shell-substitution-{}", std::process::id()));
		let _ = fs::remove_file(&marker);
		let shell = Arc::new(Shell::new(None));
		let (tx, mut rx) = mpsc::channel::<ShellOutputChunk>(32);
		let run = tokio::spawn({
			let shell = shell.clone();
			let command = format!(
				"printf substitution-started; value=$(sh -c 'sleep 30 & echo $! > \"{}\"; wait')",
				marker.display()
			);
			async move {
				shell
					.run(
						ShellRunOptions { command, ..Default::default() },
						Some(tx),
						CancelToken::default(),
					)
					.await
			}
		});
		let mut output = String::new();
		while !output.contains("substitution-started") {
			output.push_str(
				&time::timeout(Duration::from_secs(2), rx.recv())
					.await
					.expect("substitution command should start")
					.expect("substitution output should remain open")
					.text,
			);
		}
		for _ in 0..100 {
			if marker.exists() {
				break;
			}
			time::sleep(Duration::from_millis(10)).await;
		}
		let background_pid: i32 = fs::read_to_string(&marker)
			.expect("substitution should publish background PID")
			.trim()
			.parse()
			.expect("background PID should parse");
		time::sleep(Duration::from_millis(50)).await;
		shell.abort().await;
		let outcome = time::timeout(Duration::from_secs(3), run)
			.await
			.expect("substitution cancellation should settle")
			.expect("substitution task should not panic");
		match outcome {
			Ok(result) => {
				assert!(result.cancelled);
				assert!(result.output_capture_incomplete);
			},
			Err(error) => {
				assert!(error.to_string().contains("ownership incomplete"), "error={error:#}");
			},
		}
		if let Some(process) = process::Process::from_pid(background_pid) {
			let _ = process.kill_tree(Some(process::KILL_SIGNAL));
		}
		let _ = fs::remove_file(&marker);
	}

	#[cfg(unix)]
	#[tokio::test(flavor = "multi_thread")]
	async fn cancelling_later_run_preserves_prior_persistent_background_job() {
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;
		let shell = Arc::new(Shell::new(None));
		let (background_tx, mut background_rx) = mpsc::channel::<ShellOutputChunk>(32);
		let background_result = shell
			.run(
				ShellRunOptions {
					command: "sh -c 'sleep 10 >/dev/null 2>&1 & echo $!'".to_string(),
					..Default::default()
				},
				Some(background_tx),
				CancelToken::default(),
			)
			.await
			.expect("background job launch should succeed");
		assert_eq!(background_result.exit_code, Some(0));
		let mut background_output = String::new();
		while let Some(chunk) = background_rx.recv().await {
			background_output.push_str(&chunk.text);
		}
		let background_pid: i32 = background_output
			.trim()
			.parse()
			.expect("background PID should be printed");

		let (active_tx, mut active_rx) = mpsc::channel::<ShellOutputChunk>(32);
		let active = tokio::spawn({
			let shell = shell.clone();
			async move {
				shell
					.run(
						ShellRunOptions {
							command: "printf active-started; sleep 5".to_string(),
							..Default::default()
						},
						Some(active_tx),
						CancelToken::default(),
					)
					.await
			}
		});
		let mut active_output = String::new();
		while !active_output.contains("active-started") {
			active_output.push_str(
				&time::timeout(Duration::from_secs(2), active_rx.recv())
					.await
					.expect("active command should start")
					.expect("active output should remain open")
					.text,
			);
		}
		shell.abort().await;
		let active_result = time::timeout(Duration::from_secs(2), active)
			.await
			.expect("active command should cancel")
			.expect("active command task should not panic")
			.expect("active command should return a result");
		assert!(active_result.cancelled);
		let background_alive = process::Process::from_pid(background_pid)
			.is_some_and(|process| process.status() == process::ProcessStatus::Running);
		let _ = process::Process::from_pid(background_pid)
			.map(|process| process.kill_tree(Some(process::KILL_SIGNAL)));
		assert!(background_alive, "later cancellation killed prior background PID {background_pid}");
	}

	#[cfg(unix)]
	#[tokio::test(flavor = "multi_thread")]
	async fn cancelling_one_shell_does_not_signal_a_concurrent_shell_group() {
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;
		let shell_a = Arc::new(Shell::new(None));
		let shell_b = Arc::new(Shell::new(None));
		let (a_tx, mut a_rx) = mpsc::channel::<ShellOutputChunk>(32);
		let (b_tx, mut b_rx) = mpsc::channel::<ShellOutputChunk>(32);

		let run_a = tokio::spawn({
			let shell = shell_a.clone();
			async move {
				shell
					.run(
						ShellRunOptions {
							command: "printf a-started; sleep 5".to_string(),
							..Default::default()
						},
						Some(a_tx),
						CancelToken::default(),
					)
					.await
			}
		});
		let mut a_output = String::new();
		while !a_output.contains("a-started") {
			a_output.push_str(
				&time::timeout(Duration::from_secs(2), a_rx.recv())
					.await
					.expect("shell A should start")
					.expect("shell A output should remain open")
					.text,
			);
		}

		let run_b = tokio::spawn({
			let shell = shell_b.clone();
			async move {
				shell
					.run(
						ShellRunOptions {
							command: "printf b-started; sleep 0.5; printf b-done".to_string(),
							..Default::default()
						},
						Some(b_tx),
						CancelToken::default(),
					)
					.await
			}
		});
		let mut b_output = String::new();
		while !b_output.contains("b-started") {
			b_output.push_str(
				&time::timeout(Duration::from_secs(2), b_rx.recv())
					.await
					.expect("shell B should start")
					.expect("shell B output should remain open")
					.text,
			);
		}

		shell_a.abort().await;
		let a_result = time::timeout(Duration::from_secs(2), run_a)
			.await
			.expect("shell A should cancel promptly")
			.expect("shell A task should not panic")
			.expect("shell A should return a result");
		assert!(a_result.cancelled);

		let b_result = time::timeout(Duration::from_secs(3), run_b)
			.await
			.expect("shell B should finish independently")
			.expect("shell B task should not panic")
			.expect("shell B should return a result");
		assert!(!b_result.cancelled);
		assert_eq!(b_result.exit_code, Some(0));
		while let Some(chunk) = b_rx.recv().await {
			b_output.push_str(&chunk.text);
		}
		assert!(b_output.contains("b-done"), "peer shell output was interrupted: {b_output:?}");
	}

	#[cfg(unix)]
	#[tokio::test(flavor = "multi_thread")]
	async fn cancelling_one_oneshot_does_not_signal_a_concurrent_oneshot_group() {
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;
		let mut cancel_a = CancelToken::default();
		let abort_a = cancel_a.emplace_abort_token();
		let (a_tx, mut a_rx) = mpsc::channel::<ShellOutputChunk>(32);
		let (b_tx, mut b_rx) = mpsc::channel::<ShellOutputChunk>(32);
		let run_a = tokio::spawn(execute_shell(
			ShellExecuteOptions {
				command: "printf a-started; sleep 5".to_string(),
				..Default::default()
			},
			Some(a_tx),
			cancel_a,
		));
		let mut a_output = String::new();
		while !a_output.contains("a-started") {
			a_output.push_str(
				&time::timeout(Duration::from_secs(2), a_rx.recv())
					.await
					.expect("oneshot A should start")
					.expect("oneshot A output should remain open")
					.text,
			);
		}
		let run_b = tokio::spawn(execute_shell(
			ShellExecuteOptions {
				command: "printf b-started; sleep 0.5; printf b-done".to_string(),
				..Default::default()
			},
			Some(b_tx),
			CancelToken::default(),
		));
		let mut b_output = String::new();
		while !b_output.contains("b-started") {
			b_output.push_str(
				&time::timeout(Duration::from_secs(2), b_rx.recv())
					.await
					.expect("oneshot B should start")
					.expect("oneshot B output should remain open")
					.text,
			);
		}
		abort_a.abort(AbortReason::Signal);
		let a_result = time::timeout(Duration::from_secs(2), run_a)
			.await
			.expect("oneshot A should cancel promptly")
			.expect("oneshot A task should not panic")
			.expect("oneshot A should return a result");
		assert!(a_result.cancelled);
		let b_result = time::timeout(Duration::from_secs(3), run_b)
			.await
			.expect("oneshot B should finish independently")
			.expect("oneshot B task should not panic")
			.expect("oneshot B should return a result");
		assert!(!b_result.cancelled);
		assert_eq!(b_result.exit_code, Some(0));
		while let Some(chunk) = b_rx.recv().await {
			b_output.push_str(&chunk.text);
		}
		assert!(b_output.contains("b-done"), "peer oneshot output was interrupted: {b_output:?}");
	}

	#[tokio::test(flavor = "multi_thread")]
	async fn cancelled_output_reader_marks_capture_incomplete_before_eof() {
		let (reader, mut writer) = pipe_to_files("cancelled-reader").expect("pipe should be created");
		let budget = OutputBudget::new(1024);
		let (tx, mut rx) = mpsc::channel::<ShellOutputChunk>(8);
		let (activity_tx, _activity_rx) = mpsc::channel(1);
		let cancel = CancellationToken::new();
		let handle =
			tokio::spawn(read_output(reader, Some(tx), cancel.clone(), activity_tx, budget.clone()));

		writer
			.write_all(b"before-cancel")
			.expect("write before cancellation");
		let mut received = String::new();
		while !received.contains("before-cancel") {
			let chunk = time::timeout(Duration::from_secs(2), rx.recv())
				.await
				.expect("reader should publish bytes before cancellation")
				.expect("reader callback channel should remain open");
			received.push_str(&chunk.text);
		}

		cancel.cancel();
		time::timeout(Duration::from_secs(2), handle)
			.await
			.expect("cancelled reader should settle")
			.expect("reader task should not panic");
		drop(writer);

		assert!(budget.capture_incomplete());
		assert_eq!(budget.truncated_chunks(), 0);
		assert_eq!(budget.truncated_bytes(), 0);
	}

	#[tokio::test(flavor = "multi_thread")]
	async fn output_reader_decodes_multibyte_utf8_across_single_byte_reads() {
		let (reader, mut writer) = pipe_to_files("utf8-byte-splits").expect("pipe should be created");
		let budget = OutputBudget::new(1024);
		let (tx, mut rx) = mpsc::channel::<ShellOutputChunk>(32);
		let (activity_tx, mut activity_rx) = mpsc::channel(1);
		let cancel = CancellationToken::new();
		let handle = tokio::spawn(read_output(reader, Some(tx), cancel, activity_tx, budget.clone()));
		let expected = "A😀界🚀Z";

		for byte in expected.as_bytes() {
			writer.write_all(&[*byte]).expect("write one UTF-8 byte");
			writer.flush().expect("flush one UTF-8 byte");
			time::timeout(Duration::from_secs(2), activity_rx.recv())
				.await
				.expect("reader should observe each byte write")
				.expect("reader activity channel should remain open");
		}
		drop(writer);
		time::timeout(Duration::from_secs(2), handle)
			.await
			.expect("reader should settle at EOF")
			.expect("reader task should not panic");

		let mut received = String::new();
		while let Some(chunk) = rx.recv().await {
			received.push_str(&chunk.text);
		}
		assert_eq!(received, expected);
		assert!(!received.contains('\u{FFFD}'));
		assert!(!budget.capture_incomplete());
	}

	#[tokio::test]
	async fn output_budget_caps_streaming_chunks() {
		let budget = OutputBudget::new(5);
		let mut tail = OutputTail::new(3);
		let (tx, mut rx) = mpsc::channel::<ShellOutputChunk>(1024);

		emit_chunk("hello", Some(&tx), &budget, &mut tail).await;
		emit_chunk("world", Some(&tx), &budget, &mut tail).await;
		flush_output_tail(Some(&tx), &budget, &mut tail).await;
		drop(tx);

		let mut received = String::new();
		while let Some(chunk) = rx.recv().await {
			received.push_str(&chunk.text);
		}
		assert!(received.contains("1 chunks / 2 bytes dropped"));
		assert!(received.ends_with("rld"));
		assert_eq!(budget.truncated_chunks(), 1);
		assert_eq!(budget.truncated_bytes(), 2);
	}

	#[tokio::test]
	async fn output_callback_channel_applies_backpressure() {
		let budget = OutputBudget::new(16);
		let mut first_tail = OutputTail::new(4);
		let (tx, mut rx) = mpsc::channel::<ShellOutputChunk>(1);
		emit_chunk("first", Some(&tx), &budget, &mut first_tail).await;

		let second = tokio::spawn({
			let tx = tx.clone();
			let budget = budget.clone();
			async move {
				let mut tail = OutputTail::new(4);
				emit_chunk("second", Some(&tx), &budget, &mut tail).await;
			}
		});
		tokio::task::yield_now().await;
		assert!(!second.is_finished(), "second send should wait for channel capacity");

		assert_eq!(rx.recv().await.expect("first chunk").text, "first");
		time::timeout(Duration::from_secs(1), second)
			.await
			.expect("second send should unblock")
			.expect("second sender should not panic");
		assert_eq!(rx.recv().await.expect("second chunk").text, "second");
	}

	#[test]
	fn output_chunk_provenance_distinguishes_user_marker_text() {
		let text = format!("{OUTPUT_LOSS_MARKER_PREFIX}1 chunks / 1 bytes dropped]\n");
		assert!(!ShellOutputChunk::source(text.clone()).synthetic_loss_marker);
		assert!(ShellOutputChunk::loss_marker(text).synthetic_loss_marker);
	}

	#[test]
	fn output_budget_saturates_loss_counters_and_marks_uncertainty() {
		let budget = OutputBudget::new(0);
		budget.truncated.store(usize::MAX - 1, Ordering::SeqCst);
		budget
			.truncated_chunks
			.store(usize::MAX - 1, Ordering::SeqCst);

		budget.mark_truncated(2, 2);

		assert_eq!(budget.truncated_bytes(), u64::try_from(usize::MAX).unwrap_or(u64::MAX));
		assert_eq!(budget.truncated_chunks(), u64::try_from(usize::MAX).unwrap_or(u64::MAX));
		assert!(budget.capture_incomplete());
	}

	#[test]
	fn output_tail_counts_partial_source_chunk_once() {
		let mut tail = OutputTail::new(4);
		tail.push("abcdef");
		tail.push("g");

		assert_eq!(tail.dropped_chunks, 1);
		assert_eq!(tail.dropped_bytes, 3);
		assert_eq!(tail.pop_front().as_deref(), Some("def"));
		assert_eq!(tail.pop_front().as_deref(), Some("g"));
	}

	#[test]
	fn output_tail_trims_at_utf8_boundaries() {
		let mut tail = OutputTail::new(5);
		tail.push("🙂🙂");
		tail.push("x");

		assert_eq!(tail.dropped_chunks, 1);
		assert_eq!(tail.dropped_bytes, 4);
		assert_eq!(tail.pop_front().as_deref(), Some("🙂"));
		assert_eq!(tail.pop_front().as_deref(), Some("x"));
	}

	#[cfg(unix)]
	#[tokio::test]
	async fn very_large_stdout_caps_output_and_surfaces_truncation() {
		let (reader, mut writer) = pipe_to_files("large-output").expect("pipe should be created");
		let budget = OutputBudget::new(1024);
		let (tx, mut rx) = mpsc::channel::<ShellOutputChunk>(1024);
		let (activity_tx, _activity_rx) = mpsc::channel(1);
		let handle = tokio::spawn(read_output(
			reader,
			Some(tx),
			CancellationToken::new(),
			activity_tx,
			budget.clone(),
		));

		let writer_handle = tokio::task::spawn_blocking(move || {
			let chunk = vec![b'x'; 1024 + OUTPUT_CALLBACK_TAIL_BYTES + 4096];
			writer
				.write_all(&chunk)
				.expect("large write should succeed");
		});
		writer_handle.await.expect("writer task should not panic");

		let mut received = String::new();
		while let Some(chunk) = rx.recv().await {
			received.push_str(&chunk.text);
		}
		time::timeout(Duration::from_secs(2), handle)
			.await
			.expect("reader should finish after writer closes")
			.expect("reader task should not panic");

		assert!(received.contains(OUTPUT_LOSS_MARKER_PREFIX));
		assert!(received.ends_with(&"x".repeat(OUTPUT_CALLBACK_TAIL_BYTES)));
		assert_eq!(budget.truncated_bytes(), 4096);
		assert!(budget.truncated_chunks() > 0);
	}

	#[cfg(unix)]
	#[tokio::test(flavor = "multi_thread")]
	async fn execute_shell_reports_text_truncation() {
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;
		let (tx, mut rx) = mpsc::channel::<ShellOutputChunk>(1024);
		let result = execute_shell(
			ShellExecuteOptions {
				command: format!(
					"python3 -c 'import sys; sys.stdout.write(\"x\" * {} + \"\\nTAIL\\n\")'",
					OutputBudget::DEFAULT_LIMIT + OUTPUT_CALLBACK_TAIL_BYTES + 4096
				),
				..Default::default()
			},
			Some(tx),
			CancelToken::default(),
		)
		.await
		.expect("execute_shell should succeed");

		let mut received = String::new();
		while let Some(chunk) = rx.recv().await {
			received.push_str(&chunk.text);
		}

		assert_eq!(result.exit_code, Some(0));
		assert!(result.output_truncated);
		assert!(result.output_truncated_chunks > 0);
		assert_eq!(result.output_truncated_bytes, 4102);
		assert_eq!(received.matches(OUTPUT_LOSS_MARKER_PREFIX).count(), 1);
		assert!(received.ends_with("TAIL\n"));
	}

	#[cfg(unix)]
	#[tokio::test(flavor = "multi_thread")]
	async fn execute_shell_streams_reports_raw_truncation() {
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;
		let (tx, mut rx) = mpsc::unbounded_channel::<Bytes>();
		let result = execute_shell_streams(
			ShellExecuteOptions {
				command: format!(
					"python3 -c 'import sys; sys.stdout.buffer.write(b\"x\" * {})'",
					OutputBudget::DEFAULT_LIMIT + 4096
				),
				..Default::default()
			},
			StreamSinks { stdout: Some(tx), stderr: None },
			CancelToken::default(),
		)
		.await
		.expect("execute_shell_streams should succeed");

		let mut received = 0usize;
		while let Some(chunk) = rx.recv().await {
			received += chunk.len();
		}

		assert_eq!(result.exit_code, Some(0));
		assert!(result.stdout_truncated);
		assert!(result.stdout_truncated_bytes > 0);
		assert!(!result.stderr_truncated);
		assert_eq!(received, OutputBudget::DEFAULT_LIMIT);
	}

	#[cfg(unix)]
	#[tokio::test(flavor = "multi_thread")]
	async fn execute_shell_streams_marks_closed_sink_incomplete() {
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;
		let (tx, rx) = mpsc::unbounded_channel::<Bytes>();
		drop(rx);

		let result = execute_shell_streams(
			ShellExecuteOptions { command: "printf lost".to_string(), ..Default::default() },
			StreamSinks { stdout: Some(tx), stderr: None },
			CancelToken::default(),
		)
		.await
		.expect("execute_shell_streams should succeed");

		// A closed downstream may race the short-lived writer and surface SIGPIPE;
		// the contract under test is deterministic capture incompleteness.
		assert!(result.output_capture_incomplete);
	}

	#[cfg(unix)]
	#[tokio::test(flavor = "multi_thread")]
	async fn timeout_builtin_fails_closed_on_unprovable_reparenting_and_preserves_sibling() {
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;
		let mut sibling = std::process::Command::new("sleep")
			.arg("30")
			.spawn()
			.expect("spawn unrelated sibling");
		let sibling_pid = i32::try_from(sibling.id()).expect("sibling pid should fit i32");
		wait_until_descendant_visible(sibling_pid).await;
		let (tx, mut rx) = mpsc::channel::<ShellOutputChunk>(1024);
		let command = "timeout 0.2 perl -e 'if (($pid = fork()) == 0) { $SIG{TERM} = \"IGNORE\"; \
		               print qq(grandchild=$$ ppid=) . getppid() . qq( pgid=) . getpgrp() . \
		               qq(\\n); $| = 1; sleep 30; exit 0; } print qq(parent=$$ child=$pid pgid=) . \
		               getpgrp() . qq(\\n); $| = 1; sleep 30;'";
		let result = execute_shell(
			ShellExecuteOptions { command: command.to_string(), ..Default::default() },
			Some(tx),
			CancelToken::default(),
		)
		.await
		.expect("timeout command should execute");

		let mut output = String::new();
		while let Ok(Some(chunk)) = time::timeout(Duration::from_millis(50), rx.recv()).await {
			output.push_str(&chunk.text);
		}
		let grandchild_pid = parse_marker_pid(&output, "grandchild=")
			.expect("grandchild marker should be emitted before timeout");
		let ownership_incomplete =
			result.exit_code == Some(1) && output.contains("ownership incomplete");
		if !ownership_incomplete {
			assert_eq!(result.exit_code, Some(124), "output={output:?}");
			let mut grandchild_dead = false;
			for _ in 0..100 {
				if process::Process::from_pid(grandchild_pid)
					.is_none_or(|process| process.status() != process::ProcessStatus::Running)
				{
					grandchild_dead = true;
					break;
				}
				time::sleep(Duration::from_millis(10)).await;
			}
			assert!(
				grandchild_dead,
				"settled timeout left reparented grandchild {grandchild_pid} alive"
			);
		}

		// The unrelated sibling lives in the *test's* process group, so the
		// timeout's group-targeted reaping never targets it; whether it was hit
		// is fully decided by the time `execute_shell` returns. Check (and reap)
		// it now instead of racing its liveness against the asynchronous death
		// of the reparented grandchild — coupling the two previously let a slow
		// runner fail spuriously when the sibling's sleep elapsed first.
		let sibling_alive = process::Process::from_pid(sibling_pid)
			.is_some_and(|process| process.status() == process::ProcessStatus::Running);
		let _ = process::Process::from_pid(sibling_pid)
			.map(|process| process.kill_tree(Some(process::KILL_SIGNAL)));
		let _ = sibling.wait();
		assert!(sibling_alive, "timeout killed unrelated sibling {sibling_pid}; output={output:?}");

		if let Some(process) = process::Process::from_pid(grandchild_pid) {
			let _ = process.kill_tree(Some(process::KILL_SIGNAL));
		}
	}

	#[cfg(unix)]
	#[tokio::test(flavor = "multi_thread")]
	async fn cancelled_fast_setsid_escape_settles_or_reports_ownership_incomplete_and_preserves_sibling()
	 {
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;
		let mut sibling = std::process::Command::new("sleep")
			.arg("30")
			.spawn()
			.expect("spawn unrelated sibling");
		let sibling_pid = i32::try_from(sibling.id()).expect("sibling pid should fit i32");
		let mut cancel = CancelToken::default();
		let abort = cancel.emplace_abort_token();
		let pid_file = std::env::temp_dir().join(format!(
			"pi-shell-setsid-{}-{}.pid",
			std::process::id(),
			Instant::now().elapsed().as_nanos()
		));
		let _ = fs::remove_file(&pid_file);
		let command = format!(
			r#"python3 -c 'import os,time; pid=os.fork(); (os.setsid(), open(r"{}", "w").write(str(os.getpid())), os.close(1), os.close(2), time.sleep(30), os._exit(0)) if pid == 0 else os._exit(0)'; sleep 30"#,
			pid_file.display()
		);
		let run = tokio::spawn(execute_shell(
			ShellExecuteOptions { command, ..Default::default() },
			None,
			cancel,
		));
		let escaped_pid = time::timeout(Duration::from_secs(5), async {
			loop {
				if let Ok(value) = fs::read_to_string(&pid_file)
					&& let Ok(pid) = value.trim().parse::<i32>()
				{
					return pid;
				}
				time::sleep(Duration::from_millis(10)).await;
			}
		})
		.await
		.expect("escaped child pid file");
		abort.abort(AbortReason::Signal);
		let outcome = run.await.expect("execute_shell task should join");
		let ownership_settled = match outcome {
			Ok(result) => {
				assert!(result.cancelled);
				true
			},
			Err(error) => {
				assert!(error.to_string().contains("ownership incomplete"), "error={error:#}");
				false
			},
		};
		let sibling_alive = process::Process::from_pid(sibling_pid)
			.is_some_and(|process| process.status() == process::ProcessStatus::Running);
		if ownership_settled {
			let escaped_dead = process::Process::from_pid(escaped_pid)
				.is_none_or(|process| process.status() != process::ProcessStatus::Running);
			assert!(escaped_dead, "settled cancellation left setsid child {escaped_pid} alive");
		}
		let _ = process::Process::from_pid(escaped_pid)
			.map(|process| process.kill_tree(Some(process::KILL_SIGNAL)));
		let _ = process::Process::from_pid(sibling_pid)
			.map(|process| process.kill_tree(Some(process::KILL_SIGNAL)));
		let _ = sibling.wait();
		let _ = fs::remove_file(&pid_file);
		assert!(sibling_alive, "cancellation killed unrelated sibling {sibling_pid}");
	}

	#[cfg(unix)]
	#[tokio::test(flavor = "multi_thread")]
	async fn delayed_root_lived_setsid_escape_is_reaped_and_preserves_sibling() {
		let _process_test_guard = PROCESS_TEST_LOCK.lock().await;
		let mut sibling = std::process::Command::new("sleep")
			.arg("30")
			.spawn()
			.expect("spawn unrelated sibling");
		let sibling_pid = i32::try_from(sibling.id()).expect("sibling pid should fit i32");
		let pid_file = std::env::temp_dir().join(format!(
			"pi-shell-delayed-setsid-{}-{}.pid",
			std::process::id(),
			Instant::now().elapsed().as_nanos()
		));
		let _ = fs::remove_file(&pid_file);
		let command = format!(
			r#"perl -MPOSIX=setsid -e '$|=1; sleep 1; if (fork() == 0) {{ if (fork() == 0) {{ setsid(); open(my $fh, ">", "{}") or die $!; print $fh $$; close $fh; close STDOUT; close STDERR; sleep 30; exit 0; }} sleep 1; exit 0; }} sleep 30;'"#,
			pid_file.display()
		);
		let mut cancel = CancelToken::default();
		let abort = cancel.emplace_abort_token();
		let run = tokio::spawn(execute_shell(
			ShellExecuteOptions { command, ..Default::default() },
			None,
			cancel,
		));
		let escaped_pid = time::timeout(Duration::from_secs(5), async {
			loop {
				if let Ok(value) = fs::read_to_string(&pid_file)
					&& let Ok(pid) = value.trim().parse::<i32>()
				{
					return pid;
				}
				time::sleep(Duration::from_millis(10)).await;
			}
		})
		.await
		.expect("delayed escaped child pid file");
		abort.abort(AbortReason::Signal);
		let outcome = time::timeout(Duration::from_secs(3), run)
			.await
			.expect("delayed escape cancellation should settle")
			.expect("execute_shell task should join");
		let ownership_settled = match outcome {
			Ok(result) => {
				assert!(result.cancelled);
				true
			},
			Err(error) => {
				assert!(error.to_string().contains("ownership incomplete"), "error={error:#}");
				false
			},
		};
		let mut escaped_dead = false;
		for _ in 0..100 {
			if process::Process::from_pid(escaped_pid)
				.is_none_or(|process| process.status() != process::ProcessStatus::Running)
			{
				escaped_dead = true;
				break;
			}
			time::sleep(Duration::from_millis(10)).await;
		}
		let sibling_alive = process::Process::from_pid(sibling_pid)
			.is_some_and(|process| process.status() == process::ProcessStatus::Running);
		let _ = process::Process::from_pid(escaped_pid)
			.map(|process| process.kill_tree(Some(process::KILL_SIGNAL)));
		let _ = process::Process::from_pid(sibling_pid)
			.map(|process| process.kill_tree(Some(process::KILL_SIGNAL)));
		let _ = sibling.wait();
		let _ = fs::remove_file(&pid_file);
		if ownership_settled {
			assert!(
				escaped_dead,
				"settled cancellation left delayed escaped child {escaped_pid} alive"
			);
		}
		assert!(sibling_alive, "cancellation killed unrelated sibling {sibling_pid}");
	}

	#[cfg(unix)]
	fn parse_marker_pid(output: &str, marker: &str) -> Option<i32> {
		let start = output.find(marker)? + marker.len();
		let rest = &output[start..];
		let end = rest
			.find(|ch: char| !ch.is_ascii_digit())
			.unwrap_or(rest.len());
		rest[..end].parse().ok()
	}

	#[cfg(unix)]
	#[tokio::test]
	async fn read_output_stops_when_cancelled_before_pipe_eof() {
		let (reader, _writer) = pipe_to_files("test").expect("test pipe should be created");
		let cancel = CancellationToken::new();
		let (activity_tx, _activity_rx) = mpsc::channel(1);
		let handle = tokio::spawn(read_output(
			reader,
			None,
			cancel.clone(),
			activity_tx,
			OutputBudget::new(usize::MAX),
		));

		time::sleep(Duration::from_millis(10)).await;
		cancel.cancel();

		time::timeout(Duration::from_millis(100), handle)
			.await
			.expect("reader task should stop after cancellation")
			.expect("reader task should not panic");
	}

	#[cfg(unix)]
	#[tokio::test]
	async fn env_scope_pop_error_cleanup_cancels_reader_and_bridges() {
		let (reader, writer) = pipe_to_files("env-pop-error").expect("pipe should be created");
		let stdout_file = OpenFile::from(writer.try_clone().expect("clone writer"));
		let stderr_file = OpenFile::from(writer);
		let reader_cancel = CancellationToken::new();
		let command_cancel = CancellationToken::new();
		let (activity_tx, _activity_rx) = mpsc::channel::<()>(1);
		let mut reader_handle = tokio::spawn(read_output(
			reader,
			None,
			reader_cancel.clone(),
			activity_tx,
			OutputBudget::new(usize::MAX),
		));
		let cancel_bridge = tokio::spawn({
			let command_cancel = command_cancel.clone();
			let reader_cancel = reader_cancel.clone();
			async move {
				command_cancel.cancelled().await;
				reader_cancel.cancel();
			}
		});
		let process_cancel_bridge = tokio::spawn({
			let command_cancel = command_cancel.clone();
			async move {
				command_cancel.cancelled().await;
			}
		});

		let config = ShellConfig { session_env: None, snapshot_path: None, minimizer: None };
		let mut session = create_session(&config, CancellationToken::new())
			.await
			.expect("create_session");
		let mut env = HashMap::new();
		env.insert("U3_POP_ERROR".to_string(), "1".to_string());
		assert!(apply_command_env(&mut session.shell, Some(&env)).expect("push command env"));

		let mut params = session.shell.default_exec_params();
		params.set_fd(OpenFiles::STDIN_FD, null_file().expect("null stdin"));
		params.set_fd(OpenFiles::STDOUT_FD, stdout_file);
		params.set_fd(OpenFiles::STDERR_FD, stderr_file);
		params.set_cancel_token(command_cancel.clone());
		let source_info = SourceInfo::from("pi-natives:env-pop-error-test");
		let exec = session
			.shell
			.run_string("printf done", &source_info, &params)
			.await
			.expect("command should run before forced cleanup error");
		assert!(matches!(exec.exit_code, ExecutionExitCode::Success));

		session.shell.env_mut().push_scope(EnvironmentScope::Local);
		let cleanup_error = session.shell.env_mut().pop_scope(EnvironmentScope::Command);
		assert!(cleanup_error.is_err(), "forced local scope should make command pop fail");
		drop(params);

		reader_cancel.cancel();
		time::timeout(Duration::from_secs(2), &mut reader_handle)
			.await
			.expect("reader must stop even when env cleanup errors")
			.expect("reader task should not panic");
		command_cancel.cancel();
		time::timeout(Duration::from_secs(2), cancel_bridge)
			.await
			.expect("reader cancel bridge should not leak")
			.expect("reader cancel bridge should not panic");
		time::timeout(Duration::from_secs(2), process_cancel_bridge)
			.await
			.expect("process cancel bridge should not leak")
			.expect("process cancel bridge should not panic");
	}

	#[cfg(unix)]
	#[tokio::test(flavor = "multi_thread")]
	async fn execute_shell_streams_separates_stdout_and_stderr() {
		let (stdout_tx, mut stdout_rx) = mpsc::unbounded_channel::<Bytes>();
		let (stderr_tx, mut stderr_rx) = mpsc::unbounded_channel::<Bytes>();
		let options = ShellExecuteOptions {
			command: "echo out; echo err 1>&2".to_string(),
			..Default::default()
		};
		let streams = StreamSinks { stdout: Some(stdout_tx), stderr: Some(stderr_tx) };
		let result = execute_shell_streams(options, streams, CancelToken::default())
			.await
			.expect("execute should succeed");
		assert_eq!(result.exit_code, Some(0));
		assert!(!result.cancelled);

		let mut stdout = Vec::new();
		while let Some(chunk) = stdout_rx.recv().await {
			stdout.extend_from_slice(&chunk);
		}
		let mut stderr = Vec::new();
		while let Some(chunk) = stderr_rx.recv().await {
			stderr.extend_from_slice(&chunk);
		}
		assert_eq!(stdout, b"out\n");
		assert_eq!(stderr, b"err\n");
		assert!(!result.output_capture_incomplete);
	}

	#[cfg(unix)]
	#[tokio::test(flavor = "multi_thread")]
	async fn execute_shell_streams_works_when_sinks_are_none() {
		// Both sinks `None` — pipes must still drain so the child can exit.
		let options = ShellExecuteOptions {
			command: "yes done | head -n 100 1>&2; echo final".to_string(),
			..Default::default()
		};
		let result = execute_shell_streams(options, StreamSinks::default(), CancelToken::default())
			.await
			.expect("execute should succeed");
		assert_eq!(result.exit_code, Some(0));
	}

	/// Brush expands `$env:NAME` against the `env` shell variable by default,
	/// collapsing PowerShell references like `Write-Host $env:GJCCODE` to
	/// `:GJCCODE`. The session-level fallback below defines `env=$env` so the
	/// expansion is the literal `$env:GJCCODE`, preserving the PowerShell
	/// token when the command is forwarded to a child shell.
	#[cfg(unix)]
	#[tokio::test(flavor = "multi_thread")]
	async fn powershell_env_reference_survives_brush_expansion() {
		let (tx, mut rx) = mpsc::unbounded_channel::<Bytes>();
		let options = ShellExecuteOptions {
			command: "printf '%s' \"$env:SystemRoot\"".to_string(),
			..Default::default()
		};
		let streams = StreamSinks { stdout: Some(tx), stderr: None };
		let result = execute_shell_streams(options, streams, CancelToken::default())
			.await
			.expect("execute should succeed");
		assert_eq!(result.exit_code, Some(0));

		let mut stdout = Vec::new();
		while let Some(chunk) = rx.recv().await {
			stdout.extend_from_slice(&chunk);
		}
		assert_eq!(stdout, b"$env:SystemRoot");
	}

	/// A user assignment to `env` in the command itself must shadow the
	/// session-level fallback so callers that genuinely use a POSIX variable
	/// named `env` see their value, not the literal `$env`.
	#[cfg(unix)]
	#[tokio::test(flavor = "multi_thread")]
	async fn user_env_assignment_shadows_powershell_fallback() {
		let (tx, mut rx) = mpsc::unbounded_channel::<Bytes>();
		let options = ShellExecuteOptions {
			command: "env=prod; printf '%s' \"$env:8080\"".to_string(),
			..Default::default()
		};
		let streams = StreamSinks { stdout: Some(tx), stderr: None };
		let result = execute_shell_streams(options, streams, CancelToken::default())
			.await
			.expect("execute should succeed");
		assert_eq!(result.exit_code, Some(0));

		let mut stdout = Vec::new();
		while let Some(chunk) = rx.recv().await {
			stdout.extend_from_slice(&chunk);
		}
		assert_eq!(stdout, b"prod:8080");
	}
	/// Regression test for fast-exiting external pipelines being misreported
	/// as "Shell process ownership incomplete". The second pipeline member
	/// joins the first member's process group; when the leader exits before
	/// the member's spawn callback validates the anchor, the group was wrongly
	/// treated as retired (OWNERSHIP_RETIRED_GROUP) and ownership failed.
	/// `cat <file> | grep -c <pat>` exits both members almost instantly; every
	/// run must succeed.
	#[cfg(unix)]
	#[tokio::test(flavor = "multi_thread")]
	async fn fast_external_pipeline_settles_ownership() {
		let dir = std::env::temp_dir().join(format!("pi-shell-pipe-{}", std::process::id()));
		std::fs::create_dir_all(&dir).expect("temp dir");
		let file = dir.join("input.txt");
		std::fs::write(&file, "alpha\nsession one\nsession two\nomega\n").expect("write input");
		let command = format!("cat {} | grep -c session", file.display());

		for attempt in 0..40 {
			let options = ShellExecuteOptions { command: command.clone(), ..Default::default() };
			let (tx, mut rx) = mpsc::channel::<ShellOutputChunk>(64);
			let result = execute_shell(options, Some(tx), CancelToken::default())
				.await
				.unwrap_or_else(|err| {
					panic!("attempt {attempt}: fast pipeline must not fail ownership: {err}")
				});
			assert_eq!(result.exit_code, Some(0), "attempt {attempt}");
			let mut output = String::new();
			while let Some(chunk) = rx.recv().await {
				output.push_str(&chunk.text);
			}
			assert!(output.contains('2'), "attempt {attempt}: output={output:?}");
		}
		let _ = std::fs::remove_dir_all(&dir);
	}
}
