/**
 * Structural contract tests for the #4883 hidden-console fix.
 *
 * On Windows, when GJC runs as a console-less ACP/GUI host, every bash-tool
 * external child (python/cmd/powershell) used to open a visible top-level
 * console window because the native brush shell spawned children with default
 * creation flags — and a console-less parent makes Windows allocate a fresh
 * visible console per child.
 *
 * The fix lives in Rust (`crates/brush-core-vendored/src/sys/windows/commands.rs`
 * and `crates/pi-shell/src/windows.rs`): spawns add `CREATE_NO_WINDOW` when the
 * host has no console. The live Windows execution is covered by
 * `windows-hidden-shell.windows.test.ts` on the windows-latest CI job; these
 * structural assertions run everywhere so the contract cannot silently drift
 * on a Linux-only PR.
 */
import { describe, expect, it } from "bun:test";

const WINDOWS_COMMANDS_RS = "crates/brush-core-vendored/src/sys/windows/commands.rs";
const PI_SHELL_WINDOWS_RS = "crates/pi-shell/src/windows.rs";
const BRUSH_COMMANDS_RS = "crates/brush-core-vendored/src/commands.rs";

describe("windows hidden-console shell spawns (#4883)", () => {
	it("composes CREATE_NO_WINDOW into every Windows creation-flag write", async () => {
		const source = await Bun.file(WINDOWS_COMMANDS_RS).text();

		// The helper is the single composition point: std's creation_flags
		// *replaces* the value, so any direct CREATE_NEW_PROCESS_GROUP write
		// would drop the no-window bit.
		expect(source).toContain("fn spawn_creation_flags(group_flag: u32, host_consoleless: bool) -> u32");
		const directWrites = source.match(/^[\t ]*self\.creation_flags\((?!spawn_creation_flags)/gm);
		expect(directWrites).toBeNull();

		// CREATE_NO_WINDOW, never DETACHED_PROCESS: a detached child has no
		// console at all, so its grandchildren would allocate fresh *visible*
		// consoles — the exact regression the issue forbids.
		expect(source).toContain("CREATE_NO_WINDOW");
		expect(source).not.toContain("DETACHED_PROCESS;\n\t\t\tself.creation_flags");
		const detachedFlag = source.match(/creation_flags\([^)]*DETACHED_PROCESS/);
		expect(detachedFlag).toBeNull();
	});

	it("gates the flag on the host actually being console-less", async () => {
		const source = await Bun.file(WINDOWS_COMMANDS_RS).text();

		// GetConsoleWindow() == null is the console-less host probe; the decision
		// must stay host-state-aware so console-attached interactive sessions
		// keep inheriting the parent console untouched.
		expect(source).toContain("fn consoleless_host() -> bool");
		expect(source).toContain("GetConsoleWindow() }.is_null()");

		// The probe must not be cached: FreeConsole/AttachConsole can change
		// the answer during the process lifetime.
		expect(source).not.toContain("OnceLock");
	});

	it("applies the suppress call on the shared external-command spawn path", async () => {
		const source = await Bun.file(BRUSH_COMMANDS_RS).text();
		expect(source).toContain("cmd.suppress_console_window_if_host_consoleless();");

		// It must run before the process-group/session setup rewrites the full
		// creation-flag set on Windows.
		const suppressIndex = source.indexOf("cmd.suppress_console_window_if_host_consoleless();");
		const groupSetupIndex = source.indexOf("// Set up process group/session state.");
		expect(suppressIndex).toBeGreaterThan(-1);
		expect(groupSetupIndex).toBeGreaterThan(suppressIndex);
	});

	it("keeps the shell-session where.exe probe hidden on console-less hosts", async () => {
		const source = await Bun.file(PI_SHELL_WINDOWS_RS).text();
		expect(source).toContain('Command::new("where")');
		expect(source).toContain("Command::host_is_consoleless()");
		expect(source).toContain("command.creation_flags(CREATE_NO_WINDOW);");
	});

	it("provides no-op implementations on non-Windows platforms", async () => {
		for (const path of [
			"crates/brush-core-vendored/src/sys/unix/commands.rs",
			"crates/brush-core-vendored/src/sys/stubs/commands.rs",
		]) {
			const source = await Bun.file(path).text();
			expect(source).toContain("pub trait CommandWindowControlExt");
			expect(source).toContain("fn suppress_console_window_if_host_consoleless(&mut self) {}");
		}
	});
});
