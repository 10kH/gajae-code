import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "bun:test";
import * as os from "node:os";
import { buildKimiCommonHeaders } from "@gajae-code/ai/utils/oauth/kimi";

let hostnameSpy: Mock<typeof os.hostname>;
let releaseSpy: Mock<typeof os.release>;
let versionSpy: Mock<typeof os.version>;

beforeEach(() => {
	hostnameSpy = vi.spyOn(os, "hostname");
	releaseSpy = vi.spyOn(os, "release");
	versionSpy = vi.spyOn(os, "version");
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("kimi common headers", () => {
	it("sanitizes non-ASCII and control characters from OS-derived header values", () => {
		hostnameSpy.mockReturnValue("android-™-host\n");
		releaseSpy.mockReturnValue("4.4.302-Minimal™-EAS-QTI_Haptic-R26");
		versionSpy.mockReturnValue("Linux\t6.1™");

		const headers = buildKimiCommonHeaders();

		expect(headers["X-Msh-Device-Name"]).toBe("android--host");
		expect(headers["X-Msh-Device-Model"]).toContain("4.4.302-Minimal-EAS-QTI_Haptic-R26");
		expect(headers["X-Msh-Device-Model"]).not.toMatch(/[^\x20-\x7e]/);
		expect(headers["X-Msh-Os-Version"]).toBe("Linux6.1");
		expect(() => new Headers({ ...headers })).not.toThrow();
		for (const value of Object.values(headers)) {
			expect(value).toMatch(/^[\x20-\x7e]*$/);
		}
	});

	it("keeps ordinary ASCII host values unchanged", () => {
		hostnameSpy.mockReturnValue("workstation");
		releaseSpy.mockReturnValue("6.8.0-51-generic");
		versionSpy.mockReturnValue("#51-Ubuntu SMP");

		const headers = buildKimiCommonHeaders();

		expect(headers["X-Msh-Device-Name"]).toBe("workstation");
		expect(headers["X-Msh-Os-Version"]).toBe("#51-Ubuntu SMP");
		expect(headers["User-Agent"]).toBe(`KimiCLI/${headers["X-Msh-Version"]}`);
	});
});
