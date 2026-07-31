//! Process management

use futures::FutureExt;
use std::{io::Write, sync::Arc, time::Duration};

#[cfg(windows)]
use std::os::windows::io::{AsRawHandle, FromRawHandle, OwnedHandle, RawHandle};

use tokio_util::sync::CancellationToken;

use crate::{error, interp::ExternalCommandProcessObserver, openfiles::OpenFile, sys};

struct CompletionMarker {
	output:            OpenFile,
	end_marker_prefix: String,
	end_marker_suffix: String,
}

/// A waitable future that will yield the results of a child process's
/// execution.
pub(crate) type WaitableChildProcess = std::pin::Pin<
	Box<dyn futures::Future<Output = Result<std::process::Output, std::io::Error>> + Send + Sync>,
>;

/// Tracks a child process being awaited.
pub struct ChildProcess {
	/// A waitable future that will yield the results of a child process's
	/// execution.
	exec_future: WaitableChildProcess,
	/// Tracks whether this process has already been reaped.
	reaped:      bool,
	/// If available, the process ID of the child.
	pid:         Option<sys::process::ProcessId>,
	/// If available, the process group ID of the child.
	pgid:        Option<sys::process::ProcessId>,
	/// Windows handle duplicated from the child process for safe termination.
	#[cfg(windows)]
	kill_handle: Option<OwnedHandle>,
	completion_marker: Option<CompletionMarker>,
	observer: Option<Arc<dyn ExternalCommandProcessObserver>>,
	/// Whether settlement has already been reported to the ownership observer.
	settled_notified: bool,
}

impl ChildProcess {
	/// Wraps a child process and its future.
	pub fn new(
		child: sys::process::Child,
		pid: Option<sys::process::ProcessId>,
		pgid: Option<sys::process::ProcessId>,
		observer: Option<Arc<dyn ExternalCommandProcessObserver>>,
	) -> Self {
		#[cfg(windows)]
		let kill_handle = child.raw_handle().and_then(duplicate_handle);

		Self {
			exec_future: Box::pin(child.wait_with_output()),
			pid,
			pgid,
			reaped: false,
			#[cfg(windows)]
			kill_handle,
			completion_marker: None,
			observer,
			settled_notified: false,
		}
	}

	/// Returns the process's ID.
	pub const fn pid(&self) -> Option<sys::process::ProcessId> {
		self.pid
	}

	/// Returns the process's group ID.
	pub const fn pgid(&self) -> Option<sys::process::ProcessId> {
		self.pgid
	}

	/// Duplicates the process handle for termination use on Windows.
	#[cfg(windows)]
	pub fn duplicate_kill_handle(&self) -> Option<OwnedHandle> {
		let handle = self.kill_handle.as_ref()?;
		duplicate_handle(handle.as_raw_handle())
	}

	pub(crate) fn set_completion_marker(
		&mut self,
		output: OpenFile,
		end_marker_prefix: String,
		end_marker_suffix: String,
	) {
		self.completion_marker =
			Some(CompletionMarker { output, end_marker_prefix, end_marker_suffix });
	}

	fn notify_settled(&mut self) {
		if self.settled_notified {
			return;
		}
		self.settled_notified = true;
		if let Some(observer) = &self.observer {
			observer.external_command_settled(self.pid);
		}
	}

	/// Waits for the process to exit.
	///
	/// If a cancellation token is provided and triggered, the process will be killed.
	pub async fn wait(
		&mut self,
		cancel_token: Option<CancellationToken>,
	) -> Result<ProcessWaitResult, error::Error> {
		#[allow(unused_mut, reason = "only mutated on some platforms")]
		let mut sigtstp = sys::signal::tstp_signal_listener()?;
		#[allow(unused_mut, reason = "only mutated on some platforms")]
		let mut sigchld = sys::signal::chld_signal_listener()?;

		let cancelled = async {
			match &cancel_token {
				Some(token) => token.cancelled().await,
				None => std::future::pending().await,
			}
		};
		tokio::pin!(cancelled);

		#[allow(clippy::ignored_unit_patterns)]
		loop {
			tokio::select! {
				output = &mut self.exec_future => {
					match output {
						Ok(output) => {
							let marker_exit_code = completion_exit_code(&output.status);
							self.reaped = true;
							self.notify_settled();
							self.write_completion_marker(marker_exit_code);
							break Ok(ProcessWaitResult::Completed(output));
						}
						Err(error) => {
							break Err(error.into());
						}
					}
				},
				_ = &mut cancelled => {
					if self.observer.is_none() {
						// The exact observer owns cancellation signalling for observed children.
						// Do not issue a portable/raw-PID fallback here.
						self.kill();
					}
					match tokio::time::timeout(Duration::from_millis(500), &mut self.exec_future).await {
						Ok(Ok(output)) => {
							let _output = output;
							self.reaped = true;
							self.notify_settled();
						}
						Ok(Err(error)) => {
							return Err(error.into());
						}
						Err(_) => {}
					}
					self.write_completion_marker(130);
					break Ok(ProcessWaitResult::Cancelled)
				},
				_ = sigtstp.recv() => {
					break Ok(ProcessWaitResult::Stopped)
				},
				_ = sigchld.recv() => {
					if sys::signal::poll_for_stopped_children()? {
						break Ok(ProcessWaitResult::Stopped);
					}
				},
				_ = sys::signal::await_ctrl_c() => {
					// SIGINT got thrown. Handle it and continue looping. The child should
					// have received it as well, and either handled it or ended up getting
					// terminated (in which case we'll see the child exit).
				},
			}
		}
	}

	/// Sends a kill signal if the process has not already been reaped.
	fn kill(&mut self) {
		if self.reaped || self.observer.is_some() {
			return;
		}
		#[cfg(unix)]
		{
			let Some(pid) = self.pid else { return };
			let _ = nix::sys::signal::kill(
				nix::unistd::Pid::from_raw(pid),
				nix::sys::signal::Signal::SIGKILL,
			);
		}

		#[cfg(windows)]
		{
			let terminated = self
				.kill_handle
				.as_ref()
				.is_some_and(|handle| terminate_raw_handle(handle.as_raw_handle()));
			if !terminated {
				if let Some(pid) = self.pid {
					let _ = terminate_process_id(pid);
				}
			}
		}
	}

	fn write_completion_marker(&mut self, exit_code: i32) {
		if let Some(mut marker) = self.completion_marker.take() {
			let _ = write!(
				marker.output,
				"{}{}{}",
				marker.end_marker_prefix, exit_code, marker.end_marker_suffix
			);
			let _ = marker.output.flush();
		}
	}

	pub(crate) fn poll(&mut self) -> Option<Result<std::process::Output, error::Error>> {
		let result = self.exec_future.as_mut().now_or_never()?;
		Some(match result {
			Ok(output) => {
				let marker_exit_code = completion_exit_code(&output.status);
				self.reaped = true;
				self.notify_settled();
				self.write_completion_marker(marker_exit_code);
				Ok(output)
			},
			Err(err) => Err(err.into()),
		})
	}
}

impl Drop for ChildProcess {
	fn drop(&mut self) {
		// Observed children are owned by the exact observer. Dropping this handle
		// must not fall back to a raw PID signal, which could target a recycled
		// process after the observer has already signaled its pinned reference.
		if self.observer.is_none() {
			self.kill();
		} else if !self.reaped {
			// Dropping an observed but unreaped child is not settlement. The exact
			// observer retains its unsettled ownership record so shell cleanup must
			// terminate the pinned process or fail closed.
		}
	}
}

#[cfg(test)]
mod tests {
	use std::sync::{
		atomic::{AtomicUsize, Ordering},
		Arc,
	};

	use super::{sys, ChildProcess};
	use crate::interp::ExternalCommandProcessObserver;

	#[derive(Default)]
	struct TestObserver {
		settled: AtomicUsize,
	}

	impl ExternalCommandProcessObserver for TestObserver {
		fn external_command_spawned(&self, _pid: Option<i32>, _process_group_id: Option<i32>) {}

		fn external_command_settled(&self, _pid: Option<i32>) {
			self.settled.fetch_add(1, Ordering::SeqCst);
		}
	}

	fn successful_command() -> std::process::Command {
		#[cfg(windows)]
		{
			let mut command = std::process::Command::new("cmd");
			command.args(["/C", "exit", "0"]);
			command
		}
		#[cfg(not(windows))]
		{
			std::process::Command::new("true")
		}
	}

	#[tokio::test]
	async fn poll_settles_observer_once() {
		let child = sys::process::spawn(successful_command()).expect("spawn test child");
		let pid = child.id().and_then(|id| i32::try_from(id).ok());
		let observer = Arc::new(TestObserver::default());
		let mut process = ChildProcess::new(child, pid, None, Some(observer.clone()));

		for _ in 0..1_000 {
			if process.poll().is_some() {
				break;
			}
			tokio::task::yield_now().await;
		}

		assert!(process.reaped, "poll should reap the completed child");
		assert_eq!(observer.settled.load(Ordering::SeqCst), 1);
		drop(process);
		assert_eq!(observer.settled.load(Ordering::SeqCst), 1);
	}
}

#[cfg(windows)]
fn duplicate_handle(handle: RawHandle) -> Option<OwnedHandle> {
	use windows_sys::Win32::{
		Foundation::{DUPLICATE_SAME_ACCESS, DuplicateHandle},
		System::Threading::GetCurrentProcess,
	};

	// SAFETY: GetCurrentProcess returns a pseudo-handle for the current process
	// and has no preconditions.
	let current = unsafe { GetCurrentProcess() };
	let mut out_handle = std::ptr::null_mut();
	// SAFETY: `current` is a valid current-process pseudo-handle, `handle` is
	// an OS process handle owned by Tokio's child process object, and
	// `out_handle` is a valid out pointer checked below before ownership is
	// transferred to OwnedHandle.
	let ok = unsafe {
		DuplicateHandle(
			current,
			handle,
			current,
			&mut out_handle,
			0,
			0,
			DUPLICATE_SAME_ACCESS,
		)
	};
	if ok == 0 || out_handle.is_null() {
		return None;
	}

	// SAFETY: DuplicateHandle succeeded and returned a non-null owned duplicate
	// in `out_handle`, so transferring ownership to OwnedHandle is valid.
	Some(unsafe { OwnedHandle::from_raw_handle(out_handle) })
}

#[cfg(windows)]
fn terminate_raw_handle(handle: RawHandle) -> bool {
	use windows_sys::Win32::System::Threading::TerminateProcess;

	// SAFETY: The caller provides a process handle opened/duplicated for process
	// termination. The handle remains owned by its original owner.
	unsafe { TerminateProcess(handle, 1) != 0 }
}

#[cfg(windows)]
fn terminate_process_id(pid: sys::process::ProcessId) -> bool {
	use windows_sys::Win32::Foundation::CloseHandle;
	use windows_sys::Win32::System::Threading::{OpenProcess, PROCESS_TERMINATE};

	let Ok(pid) = u32::try_from(pid) else {
		return false;
	};

	// SAFETY: OpenProcess is called with PROCESS_TERMINATE for a numeric process id.
	// A null handle is handled below.
	let handle = unsafe { OpenProcess(PROCESS_TERMINATE, 0, pid) };
	if handle.is_null() {
		return false;
	}

	let terminated = terminate_raw_handle(handle);
	// SAFETY: The handle was returned by OpenProcess and is closed exactly once here.
	let _close_result = unsafe { CloseHandle(handle) };
	terminated
}

fn completion_exit_code(status: &std::process::ExitStatus) -> i32 {
	if let Some(code) = status.code() {
		return code;
	}

	#[cfg(unix)]
	{
		use std::os::unix::process::ExitStatusExt as _;
		if let Some(signal) = status.signal() {
			return 128 + signal;
		}
	}

	127
}

/// Represents the result of waiting for an executing process.
pub enum ProcessWaitResult {
	/// The process completed.
	Completed(std::process::Output),
	/// The process stopped and has not yet completed.
	Stopped,
	/// The process was killed due to cancellation.
	Cancelled,
}
