import { afterEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Process, ProcessStatus } from "@gajae-code/natives";
import type { Browser } from "puppeteer-core";
import type { ToolSession } from "../../src/sdk";
import {
	type BrowserParams,
	isDefaultChromeUserDataDirForTest,
	resolveBrowserKindForTest,
} from "../../src/tools/browser";
import * as attach from "../../src/tools/browser/attach";
import {
	argsMatchChromeProfileForTest,
	findCdpAddressInArgsForTest,
	findCdpPortInArgsForTest,
	isSafeCdpAddressForTest,
} from "../../src/tools/browser/attach";
import * as launch from "../../src/tools/browser/launch";
import { chromeUserDataRoots } from "../../src/tools/browser/profile-discovery";
import {
	type AcquireBrowserOptions,
	type BrowserHandle,
	type BrowserKind,
	buildChromeProfileLaunchArgs,
	openChromeProfileHandle,
	releaseBrowser,
} from "../../src/tools/browser/registry";

function makeSession(cwd: string): ToolSession {
	return {
		cwd,
		settings: { get: () => true },
	} as unknown as ToolSession;
}

function chromeProfileKind(
	overrides: Partial<Extract<BrowserKind, { kind: "chrome-profile" }>> = {},
): Extract<BrowserKind, { kind: "chrome-profile" }> {
	return {
		kind: "chrome-profile",
		path: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		userDataDir: "/Users/me/Library/Application Support/Google/Chrome",
		profileDirectory: "Profile 10",
		background: false,
		noFocus: false,
		...overrides,
	};
}

function fakeConnectedBrowser(): Browser {
	return {
		connected: true,
		disconnect: vi.fn(),
	} as unknown as Browser;
}

function mockRunningChromeProcess(args: string[]): void {
	vi.spyOn(Process, "fromPath").mockReturnValue([
		{
			pid: 123,
			status: () => ProcessStatus.Running,
			args: () => args,
		},
	] as ReturnType<typeof Process.fromPath>);
}

function mockSuccessfulCdpProbe(): void {
	vi.spyOn(globalThis, "fetch").mockResolvedValue({
		ok: true,
		body: { cancel: vi.fn().mockResolvedValue(undefined) },
	} as unknown as Response);
}

describe("Chrome profile browser mode (#809)", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("never treats Edge as the Chrome binary for saved-profile mode", () => {
		expect(launch.isEdgeExecutable("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge")).toBe(true);
		expect(launch.isEdgeExecutable("C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe")).toBe(true);
		expect(launch.isEdgeExecutable("/usr/bin/microsoft-edge-stable")).toBe(true);
		expect(launch.isEdgeExecutable("/usr/bin/microsoft-edge-beta")).toBe(true);
		expect(launch.isEdgeExecutable("/usr/bin/microsoft-edge-dev")).toBe(true);
		expect(launch.isEdgeExecutable("/var/lib/flatpak/exports/bin/com.microsoft.Edge")).toBe(true);
		expect(launch.isEdgeExecutable("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")).toBe(false);
		expect(launch.isEdgeExecutable("/usr/bin/chromium")).toBe(false);
	});

	it("parses Chromium CDP and profile argv forms", () => {
		expect(findCdpPortInArgsForTest(["--remote-debugging-port=9222"])).toBe(9222);
		expect(findCdpPortInArgsForTest(["--remote-debugging-port", "9223"])).toBe(9223);
		expect(findCdpPortInArgsForTest(["--remote-debugging-port=0"])).toBeNull();
		expect(findCdpAddressInArgsForTest(["--remote-debugging-address=127.0.0.1"])).toBe("127.0.0.1");
		expect(findCdpAddressInArgsForTest(["--remote-debugging-address", "0.0.0.0"])).toBe("0.0.0.0");
		expect(isSafeCdpAddressForTest(null)).toBe(true);
		expect(isSafeCdpAddressForTest("127.0.0.1")).toBe(true);
		expect(isSafeCdpAddressForTest("localhost")).toBe(true);
		expect(isSafeCdpAddressForTest("::1")).toBe(true);
		expect(isSafeCdpAddressForTest("0.0.0.0")).toBe(false);
		expect(isSafeCdpAddressForTest("::")).toBe(false);
		expect(isSafeCdpAddressForTest("192.168.1.50")).toBe(false);
		expect(
			argsMatchChromeProfileForTest(["--user-data-dir=/tmp/chrome", "--profile-directory=Profile 10"], {
				userDataDir: "/tmp/chrome",
				profileDirectory: "Profile 10",
			}),
		).toBe(true);
		expect(
			argsMatchChromeProfileForTest(["--user-data-dir", "/tmp/chrome"], {
				userDataDir: "/tmp/chrome",
				profileDirectory: "Default",
			}),
		).toBe(true);
		expect(
			argsMatchChromeProfileForTest(["--user-data-dir=/tmp/chrome", "--profile-directory=Profile 9"], {
				userDataDir: "/tmp/chrome",
				profileDirectory: "Profile 10",
			}),
		).toBe(false);
	});

	it("builds localhost-only Chrome profile launch args with background guard", () => {
		const args = buildChromeProfileLaunchArgs(
			chromeProfileKind({ background: true, userDataDir: "/tmp/chrome", profileDirectory: "Profile 10" }),
			[
				"--disable-features=Foo",
				"--remote-debugging-address=0.0.0.0",
				"--remote-debugging-port",
				"9999",
				"--user-data-dir=/wrong",
			],
			9333,
		);

		expect(args).toEqual([
			"--disable-features=Foo",
			"--user-data-dir=/tmp/chrome",
			"--profile-directory=Profile 10",
			"--remote-debugging-port=9333",
			"--remote-debugging-address=127.0.0.1",
			"--no-startup-window",
		]);
	});

	it("resolves app.browser chrome config using repo-consistent snake_case fields", () => {
		const params: BrowserParams = {
			action: "open",
			app: {
				browser: "chrome",
				path: "bin/google-chrome",
				user_data_dir: "profiles/chrome",
				profile_directory: "Profile 10",
				background: true,
				no_focus: true,
				cdp_port: 9444,
			},
		};
		const kind = resolveBrowserKindForTest(params, makeSession("/work"));

		expect(kind).toEqual({
			kind: "chrome-profile",
			path: path.join("/work", "bin/google-chrome"),
			userDataDir: path.join("/work", "profiles/chrome"),
			profileDirectory: "Profile 10",
			background: true,
			noFocus: true,
			cdpPort: 9444,
		});
		expect(params.app).toEqual({
			browser: "chrome",
			path: "bin/google-chrome",
			user_data_dir: "profiles/chrome",
			profile_directory: "Profile 10",
			background: true,
			no_focus: true,
			cdp_port: 9444,
		});
	});

	it("defaults the executable and profile name when a non-default user data directory is explicit", () => {
		vi.spyOn(launch, "resolveSystemChromeForProfile").mockReturnValue("/usr/bin/google-chrome");

		const kind = resolveBrowserKindForTest(
			{ action: "open", app: { browser: "chrome", user_data_dir: "profiles/automation" } },
			makeSession("/work"),
		);

		expect(kind).toEqual({
			kind: "chrome-profile",
			path: "/usr/bin/google-chrome",
			userDataDir: path.join("/work", "profiles/automation"),
			profileDirectory: "Default",
			background: false,
			noFocus: false,
			cdpPort: undefined,
		});
	});

	it("requires an explicit user data directory with Chrome 136 remediation", () => {
		vi.spyOn(launch, "resolveSystemChromeForProfile").mockReturnValue("/usr/bin/google-chrome");
		expect(() =>
			resolveBrowserKindForTest(
				{ action: "open", app: { browser: "chrome", profile_directory: "Profile 10" } },
				makeSession("/work"),
			),
		).toThrow(/Chrome 136\+ disables remote debugging.*app\.cdp_url/);
	});

	it("errors with remediation when no Chrome binary is installed", () => {
		vi.spyOn(launch, "resolveSystemChromeForProfile").mockReturnValue(undefined);

		expect(() =>
			resolveBrowserKindForTest(
				{ action: "open", app: { browser: "chrome", user_data_dir: "profiles/automation" } },
				makeSession("/work"),
			),
		).toThrow(/No Chrome\/Chromium executable found/);
	});

	it("rejects an explicit default Chrome user data directory", () => {
		vi.spyOn(launch, "resolveSystemChromeForProfile").mockReturnValue("/usr/bin/google-chrome");
		expect(() =>
			resolveBrowserKindForTest(
				{
					action: "open",
					app: { browser: "chrome", user_data_dir: path.join(os.homedir(), ".config/google-chrome") },
				},
				makeSession("/work"),
			),
		).toThrow(/Refusing Chrome's default user data directory/);
	});

	it("recognizes symlink aliases and case-insensitive Windows aliases of default roots", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "chrome-default-root-"));
		const target = path.join(root, "actual");
		const alias = path.join(root, "alias");
		await fs.mkdir(target);
		await fs.symlink(target, alias);
		try {
			expect(isDefaultChromeUserDataDirForTest(alias, [target])).toBe(true);
			expect(
				isDefaultChromeUserDataDirForTest(
					"c:\\users\\u\\appdata\\local\\google\\chrome\\user data",
					["C:\\Users\\U\\AppData\\Local\\Google\\Chrome\\User Data"],
					"win32",
				),
			).toBe(true);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});

	it("rejects every supported Chrome channel root while allowing custom roots", () => {
		const matrix = [
			{
				platform: "darwin" as const,
				home: "/Users/u",
				expectedChannels: ["Chrome", "Chrome Beta", "Chrome Dev", "Chrome Canary", "Chromium"],
			},
			{
				platform: "win32" as const,
				home: "C:\\Users\\u",
				localAppData: "C:\\Users\\u\\AppData\\Local",
				expectedChannels: ["Chrome", "Chrome Beta", "Chrome Dev", "Chrome SxS", "Chromium"],
			},
			{
				platform: "linux" as const,
				home: "/home/u",
				expectedChannels: [
					"google-chrome",
					"google-chrome-beta",
					"google-chrome-unstable",
					"chromium",
					"com.google.Chrome",
					"org.chromium.Chromium",
					"snap/chromium/common/chromium",
					"snap/chromium/current/.config/chromium",
				],
			},
		];

		for (const entry of matrix) {
			const roots = chromeUserDataRoots({
				platform: entry.platform,
				home: entry.home,
				exists: () => false,
				...(entry.localAppData ? { localAppData: entry.localAppData } : {}),
			});
			expect(roots).toHaveLength(entry.expectedChannels.length);
			for (const [index, root] of roots.entries()) {
				expect(root).toContain(entry.expectedChannels[index]!);
				expect(isDefaultChromeUserDataDirForTest(root, roots, entry.platform)).toBe(true);
			}
			const customRoot = entry.platform === "win32" ? "D:\\automation\\chrome" : "/tmp/automation-chrome";
			expect(isDefaultChromeUserDataDirForTest(customRoot, roots, entry.platform)).toBe(false);
		}
	});

	it("rejects an explicitly supplied Edge executable before launch", () => {
		expect(() =>
			resolveBrowserKindForTest(
				{
					action: "open",
					app: {
						browser: "chrome",
						path: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
						user_data_dir: "/tmp/chrome-automation",
					},
				},
				makeSession("/work"),
			),
		).toThrow(/not Microsoft Edge/);
	});

	it("rejects an explicit Linux Edge path before checking omitted profile fields", () => {
		expect(() =>
			resolveBrowserKindForTest(
				{ action: "open", app: { browser: "chrome", path: "/usr/bin/microsoft-edge-stable" } },
				makeSession("/work"),
			),
		).toThrow(/not Microsoft Edge/);
	});

	it("allows Chrome and Chromium executables with custom data roots", () => {
		for (const exe of ["/usr/bin/google-chrome-beta", "/usr/bin/chromium"]) {
			expect(
				resolveBrowserKindForTest(
					{ action: "open", app: { browser: "chrome", path: exe, user_data_dir: "/tmp/gjc-chrome" } },
					makeSession("/work"),
				),
			).toMatchObject({ path: exe, userDataDir: "/tmp/gjc-chrome", profileDirectory: "Default" });
		}
	});

	it("refuses an already-running matching profile without attachable CDP", async () => {
		vi.spyOn(attach, "findRunningChromeProfile").mockResolvedValue({ pid: 123, cdpUrl: null });
		const killSpy = vi.spyOn(attach, "gracefulKillTreeOnce").mockResolvedValue(undefined);
		const spawnSpy = vi.spyOn(Bun, "spawn");

		await expect(
			openChromeProfileHandle(chromeProfileKind(), { cwd: "/work" } as AcquireBrowserOptions),
		).rejects.toThrow(/already running without an attachable localhost CDP endpoint/);
		expect(spawnSpy).not.toHaveBeenCalled();
		expect(killSpy).not.toHaveBeenCalled();
	});

	it("reuses matching profile CDP when no remote debugging address is present", async () => {
		mockRunningChromeProcess([
			"--user-data-dir=/Users/me/Library/Application Support/Google/Chrome",
			"--profile-directory=Profile 10",
			"--remote-debugging-port=9222",
		]);
		mockSuccessfulCdpProbe();

		await expect(
			attach.findRunningChromeProfile("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", {
				userDataDir: "/Users/me/Library/Application Support/Google/Chrome",
				profileDirectory: "Profile 10",
			}),
		).resolves.toEqual({ pid: 123, cdpUrl: "http://127.0.0.1:9222" });
	});

	it("reuses matching profile CDP when remote debugging address is localhost", async () => {
		mockRunningChromeProcess([
			"--user-data-dir=/Users/me/Library/Application Support/Google/Chrome",
			"--profile-directory=Profile 10",
			"--remote-debugging-port=9222",
			"--remote-debugging-address=127.0.0.1",
		]);
		mockSuccessfulCdpProbe();

		await expect(
			attach.findRunningChromeProfile("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", {
				userDataDir: "/Users/me/Library/Application Support/Google/Chrome",
				profileDirectory: "Profile 10",
			}),
		).resolves.toEqual({ pid: 123, cdpUrl: "http://127.0.0.1:9222" });
	});

	it("refuses matching profile CDP when remote debugging address is wildcard", async () => {
		mockRunningChromeProcess([
			"--user-data-dir=/Users/me/Library/Application Support/Google/Chrome",
			"--profile-directory=Profile 10",
			"--remote-debugging-port=9222",
			"--remote-debugging-address=0.0.0.0",
		]);
		mockSuccessfulCdpProbe();

		const running = await attach.findRunningChromeProfile(
			"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
			{
				userDataDir: "/Users/me/Library/Application Support/Google/Chrome",
				profileDirectory: "Profile 10",
			},
		);

		expect(running).toEqual({
			pid: 123,
			cdpUrl: null,
			unsafeCdpReason:
				'Refusing to reuse Chrome profile CDP endpoint because --remote-debugging-address="0.0.0.0" is not a loopback-only address. Restart Chrome with --remote-debugging-address=127.0.0.1 or omit the address flag.',
		});
		expect(globalThis.fetch).not.toHaveBeenCalled();
	});

	it("refuses an already-running matching profile with unsafe CDP address", async () => {
		vi.spyOn(attach, "findRunningChromeProfile").mockResolvedValue({
			pid: 123,
			cdpUrl: null,
			unsafeCdpReason:
				'Refusing to reuse Chrome profile CDP endpoint because --remote-debugging-address="0.0.0.0" is not a loopback-only address.',
		});
		const killSpy = vi.spyOn(attach, "gracefulKillTreeOnce").mockResolvedValue(undefined);
		const spawnSpy = vi.spyOn(Bun, "spawn");

		await expect(
			openChromeProfileHandle(chromeProfileKind(), { cwd: "/work" } as AcquireBrowserOptions),
		).rejects.toThrow(/remote-debugging-address="0\.0\.0\.0"/);
		expect(spawnSpy).not.toHaveBeenCalled();
		expect(killSpy).not.toHaveBeenCalled();
	});

	it("refuses a locked Chrome user data directory without killing or spawning", async () => {
		const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-chrome-profile-"));
		await Bun.write(path.join(userDataDir, "SingletonLock"), "");
		vi.spyOn(attach, "findRunningChromeProfile").mockResolvedValue(null);
		const killSpy = vi.spyOn(attach, "gracefulKillTreeOnce").mockResolvedValue(undefined);
		const spawnSpy = vi.spyOn(Bun, "spawn");

		await expect(
			openChromeProfileHandle(chromeProfileKind({ userDataDir }), { cwd: "/work" } as AcquireBrowserOptions),
		).rejects.toThrow(/appears to be locked/);
		expect(spawnSpy).not.toHaveBeenCalled();
		expect(killSpy).not.toHaveBeenCalled();
	});

	it("reuses externally-owned profile CDP and cleanup disconnects only", async () => {
		vi.spyOn(attach, "findRunningChromeProfile").mockResolvedValue({ pid: 123, cdpUrl: "http://127.0.0.1:9222" });
		const connect = vi.fn().mockResolvedValue(fakeConnectedBrowser());
		vi.spyOn(launch, "loadPuppeteer").mockResolvedValue({ connect } as unknown as Awaited<
			ReturnType<typeof launch.loadPuppeteer>
		>);
		const killSpy = vi.spyOn(attach, "gracefulKillTreeOnce").mockResolvedValue(undefined);

		const handle = await openChromeProfileHandle(chromeProfileKind(), { cwd: "/work" } as AcquireBrowserOptions);
		handle.refCount = 1;
		await releaseBrowser(handle, { kill: true });

		expect(connect).toHaveBeenCalledWith(expect.objectContaining({ browserURL: "http://127.0.0.1:9222" }));
		expect(killSpy).not.toHaveBeenCalled();
	});

	it("kills only a GJC-launched profile browser on cleanup", async () => {
		const browser = fakeConnectedBrowser();
		const handle: BrowserHandle = {
			key: "chrome-profile:test",
			kind: chromeProfileKind(),
			browser,
			pid: 456,
			subprocess: { pid: 456 } as BrowserHandle["subprocess"],
			refCount: 1,
			stealth: { browserSession: null, override: null },
		};
		const killSpy = vi.spyOn(attach, "gracefulKillTreeOnce").mockResolvedValue(undefined);

		await releaseBrowser(handle, { kill: true });

		expect(browser.disconnect).toHaveBeenCalledTimes(1);
		expect(killSpy).toHaveBeenCalledWith(456);
	});
});
