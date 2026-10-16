use std::{
	fs,
	path::PathBuf,
	process::{Command, Stdio},
	time::{Duration, Instant},
};

use super::{
	PtyRunConfig, run_pty_sync, task,
	tests::{PTY_TEST_LOCK, process_exists, test_config, test_path, wait_for_process_exit},
};

const SETSID_DOUBLE_FORK_SCRIPT: &str = r#"use POSIX;
my $pidfile = $ENV{PTY_ESCAPE_PID} or die "missing pidfile\n";
my $pid = fork();
die "fork: $!\n" unless defined $pid;
if ($pid == 0) {
	POSIX::setsid() == -1 and die "setsid: $!\n";
	my $child = fork();
	die "fork2: $!\n" unless defined $child;
	if ($child == 0) {
		open my $fh, ">", $pidfile or die "open: $!\n";
		print $fh "$$\n";
		close $fh;
		sleep 60;
		exit 0;
	}
	select(undef, undef, undef, 0.5);
	exit 0;
}
sleep 60;
"#;

fn escape_config(script: &std::path::Path, pid_path: &std::path::Path) -> PtyRunConfig {
	let mut config = test_config("perl \"$PTY_ESCAPE_SCRIPT\"");
	let mut env = std::collections::HashMap::new();
	env.insert("PTY_ESCAPE_SCRIPT".to_string(), script.display().to_string());
	env.insert("PTY_ESCAPE_PID".to_string(), pid_path.display().to_string());
	config.env = Some(env);
	config
}

fn write_escape_script(name: &str) -> PathBuf {
	let script = test_path(name);
	fs::write(&script, SETSID_DOUBLE_FORK_SCRIPT).expect("write escape script");
	script
}

fn grandchild_ppid(pid: i32) -> Option<i32> {
	pi_shell::process::Process::from_pid(pid).and_then(|process| process.ppid())
}

fn wait_until_reparented(pid_path: &std::path::Path) -> i32 {
	let deadline = Instant::now() + Duration::from_secs(8);
	let mut pid = None;
	let mut birth_ppid = None;
	while Instant::now() < deadline {
		if pid.is_none()
			&& let Ok(text) = fs::read_to_string(pid_path)
			&& let Ok(parsed) = text.trim().parse::<i32>()
		{
			pid = Some(parsed);
			birth_ppid = grandchild_ppid(parsed);
		}
		if let Some(parsed) = pid
			&& grandchild_ppid(parsed) != birth_ppid
		{
			return parsed;
		}
		std::thread::sleep(Duration::from_millis(20));
	}
	panic!("setsid grandchild was not reparented; pid={pid:?} birth_ppid={birth_ppid:?}");
}

struct KillPid(i32);

impl Drop for KillPid {
	fn drop(&mut self) {
		if self.0 > 0 {
			unsafe { libc::kill(self.0, libc::SIGKILL) };
		}
	}
}

#[test]
fn unrelated_process_survives_pty_cancel() {
	let _guard = PTY_TEST_LOCK.lock().unwrap_or_else(|err| err.into_inner());
	let mut sibling = Command::new("sleep")
		.arg("30")
		.stdin(Stdio::null())
		.stdout(Stdio::null())
		.stderr(Stdio::null())
		.spawn()
		.expect("spawn unrelated process");
	let sibling_pid = i32::try_from(sibling.id()).expect("sibling pid fits i32");
	let _kill_sibling = KillPid(sibling_pid);
	let mut ct = task::CancelToken::new(Some(10_000), None);
	let abort = ct.emplace_abort_token();
	let (_tx, rx) = std::sync::mpsc::channel();
	let handle = std::thread::spawn(move || run_pty_sync(test_config("sleep 30"), None, rx, ct));
	std::thread::sleep(Duration::from_millis(300));
	abort.abort(task::AbortReason::Signal);
	let result = handle
		.join()
		.expect("PTY worker should not panic")
		.expect("cancelled PTY run should return a result");
	assert!(result.cancelled);
	assert!(process_exists(sibling_pid), "cancel killed an unrelated process");
	let _ = sibling.kill();
	let _ = sibling.wait();
}

#[test]
fn cancel_reaps_reparented_setsid_grandchild() {
	let _guard = PTY_TEST_LOCK.lock().unwrap_or_else(|err| err.into_inner());
	let script = write_escape_script("cancel-escape.pl");
	let pid_path = test_path("cancel-escape.pid");
	let mut ct = task::CancelToken::new(Some(20_000), None);
	let abort = ct.emplace_abort_token();
	let config = escape_config(&script, &pid_path);
	let (_tx, rx) = std::sync::mpsc::channel();
	let handle = std::thread::spawn(move || run_pty_sync(config, None, rx, ct));
	let grandchild = wait_until_reparented(&pid_path);
	let _kill_grandchild = KillPid(grandchild);
	abort.abort(task::AbortReason::Signal);
	let result = handle
		.join()
		.expect("PTY worker should not panic")
		.expect("cancelled PTY run should return a result");
	assert!(result.cancelled, "cancel should mark the PTY run cancelled");
	assert!(
		wait_for_process_exit(grandchild, Duration::from_secs(3)),
		"reparented setsid grandchild {grandchild} survived cancel"
	);
	let _ = fs::remove_file(&script);
	let _ = fs::remove_file(&pid_path);
}

#[test]
fn timeout_reaps_reparented_setsid_grandchild() {
	let _guard = PTY_TEST_LOCK.lock().unwrap_or_else(|err| err.into_inner());
	let script = write_escape_script("timeout-escape.pl");
	let pid_path = test_path("timeout-escape.pid");
	let config = escape_config(&script, &pid_path);
	let (_tx, rx) = std::sync::mpsc::channel();
	let result = run_pty_sync(config, None, rx, task::CancelToken::new(Some(4_000), None))
		.expect("timed-out PTY run should return a result");
	assert!(result.timed_out, "PTY run should time out");
	let grandchild: i32 = fs::read_to_string(&pid_path)
		.expect("grandchild pid file should be written before timeout")
		.trim()
		.parse()
		.expect("pid file should contain a pid");
	let _kill_grandchild = KillPid(grandchild);
	assert!(
		wait_for_process_exit(grandchild, Duration::from_secs(3)),
		"reparented setsid grandchild {grandchild} survived timeout"
	);
	let _ = fs::remove_file(&script);
	let _ = fs::remove_file(&pid_path);
}
