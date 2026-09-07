import { describe, expect, test, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { LoadContext } from "../capability/types";
import { getEmbeddedDefaultGjcSkills } from "../defaults/gjc-defaults";
import { buildSkillPromptMessage } from "../extensibility/skills";
import { SKILL_FRONTMATTER_SCAN_BYTES, SKILL_FRONTMATTER_SCAN_TOTAL_BYTES, scanSkillDescriptorsFromDir } from "./index";

function makeContext(root: string): LoadContext {
	return { cwd: root, home: root, repoRoot: null };
}

describe("skill descriptors", () => {
	test("frontmatter scanning is bounded and does not read the body", async () => {
		const root = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-skill-descriptor-"));
		try {
			const skillDir = path.join(root, "bounded");
			await fs.mkdir(skillDir, { recursive: true });
			const bodyMarker = "BODY_MARKER_MUST_NOT_BE_SCANNED";
			const body = "x".repeat(SKILL_FRONTMATTER_SCAN_BYTES) + bodyMarker;
			await fs.writeFile(
				path.join(skillDir, "SKILL.md"),
				`---\nname: bounded\ndescription: bounded scan\n---\n${body}`,
			);

			// Discovery reads the validated descriptor rather than reopening with Bun.file.
			// The prototype spy is process-wide, so unrelated FileHandle reads can interleave
			// on a loaded CI runner; assert on the read shapes, not on a global call count.
			const handle = await fs.open(path.join(skillDir, "SKILL.md"), "r");
			const prototype = Object.getPrototypeOf(handle) as fs.FileHandle;
			await handle.close();
			const readSpy = vi.spyOn(prototype, "read");
			const readFileSpy = vi.spyOn(prototype, "readFile");
			try {
				const result = await scanSkillDescriptorsFromDir(makeContext(root), {
					dir: root,
					providerId: "test",
					level: "project",
				});
				expect(result.items).toHaveLength(1);
				expect(Object.hasOwn(result.items[0]?.metadata ?? {}, "content")).toBe(false);
				expect(JSON.stringify(result.items[0]?.metadata)).not.toContain(bodyMarker);
				const boundedReads = readSpy.mock.calls.filter(
					call => call[1] === 0 && call[2] === SKILL_FRONTMATTER_SCAN_BYTES && call[3] === 0,
				);
				expect(boundedReads).toHaveLength(1);
				const oversizedReads = readSpy.mock.calls.filter(
					call => typeof call[2] === "number" && call[2] > SKILL_FRONTMATTER_SCAN_BYTES,
				);
				expect(oversizedReads).toHaveLength(0);
				expect(readFileSpy).not.toHaveBeenCalled();
			} finally {
				readSpy.mockRestore();
				readFileSpy.mockRestore();
			}
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});

	test("unterminated frontmatter stops at the total scan cap", async () => {
		const root = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-skill-unterminated-"));
		try {
			const skillDir = path.join(root, "unterminated");
			await fs.mkdir(skillDir, { recursive: true });
			await fs.writeFile(
				path.join(skillDir, "SKILL.md"),
				`---\nname: unterminated\ndescription: no closing delimiter\n${"x".repeat(SKILL_FRONTMATTER_SCAN_TOTAL_BYTES * 32)}`,
			);
			const result = await scanSkillDescriptorsFromDir(makeContext(root), {
				dir: root,
				providerId: "test",
				level: "project",
			});
			expect(result.items).toHaveLength(0);
			expect((result.warnings ?? []).some(warning => warning.includes("scan cap"))).toBe(true);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});
	test("bundled skill prompt injection is byte-identical through the lazy catalog", async () => {
		const embedded = getEmbeddedDefaultGjcSkills().find(skill => skill.name === "ralplan");
		if (!embedded) throw new Error("ralplan bundled skill missing");
		const legacyContent = embedded.content;
		const legacy = await buildSkillPromptMessage(
			{ ...embedded, content: legacyContent, loadContent: undefined },
			"example task",
		);
		const lazy = await buildSkillPromptMessage({ ...embedded, content: undefined }, "example task");
		expect(lazy.message).toBe(legacy.message);
		expect(lazy.details).toEqual(legacy.details);
	});
});
