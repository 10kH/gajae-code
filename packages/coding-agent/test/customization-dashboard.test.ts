/**
 * Issue #4291 acceptance 8 + dashboard integration: keyboard navigation,
 * back/cancel behavior, narrow-terminal rendering, and the import wizard's
 * explicit-confirmation flow. The dashboard renders Skills/Hooks/MCPs without
 * any dependency on the ExtensionDashboard provider inventory.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { CustomizationDashboard } from "@gajae-code/coding-agent/modes/components/customization/customization-dashboard";
import { ImportWizard } from "@gajae-code/coding-agent/modes/components/customization/import-wizard";
import { getThemeByName, setThemeInstance } from "@gajae-code/coding-agent/modes/theme/theme";
import { getAgentDir, setAgentDir } from "@gajae-code/utils";

let tmpRoot: string;
let projectDir: string;
let homeDir: string;
let savedAgentDir: string;

beforeEach(async () => {
	tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-4291-ui-"));
	projectDir = path.join(tmpRoot, "project");
	homeDir = path.join(tmpRoot, "home");
	await fs.mkdir(projectDir, { recursive: true });
	await fs.mkdir(homeDir, { recursive: true });
	savedAgentDir = getAgentDir();
	const themeInstance = await getThemeByName("red-claw");
	if (!themeInstance) throw new Error("Failed to load theme for tests");
	setThemeInstance(themeInstance);
	setAgentDir(path.join(tmpRoot, "global-agent"));
});

afterEach(async () => {
	setAgentDir(savedAgentDir);
	await fs.rm(tmpRoot, { recursive: true, force: true });
});

const SKILL_MD = `---
description: Fixture skill for tests.
---

# Fixture

Do the thing.
`;

async function seedProjectSkill(): Promise<void> {
	await fs.mkdir(path.join(projectDir, ".gjc", "skills", "fixture"), { recursive: true });
	await fs.writeFile(path.join(projectDir, ".gjc", "skills", "fixture", "SKILL.md"), SKILL_MD);
}

describe("CustomizationDashboard", () => {
	test("opens with one project skill and zero extension modules", async () => {
		await seedProjectSkill();
		const dashboard = await CustomizationDashboard.create(projectDir);
		expect(dashboard.section).toBe("skills");
		expect(dashboard.scope).toBe("project");
		expect(dashboard.inventory.rows.some(r => r.name === "fixture" && r.status === "enabled")).toBe(true);
		const lines = dashboard.render(80).join("\n");
		expect(lines).toContain("/extensions");
		expect(lines).toContain("Configure skills, hooks, and MCPs.");
		expect(lines).toContain("fixture");
	});

	test("keyboard: section cycling and scope switching", async () => {
		await seedProjectSkill();
		const dashboard = await CustomizationDashboard.create(projectDir);
		dashboard.handleInput("\x1b[C"); // right arrow
		expect(dashboard.section).toBe("hooks");
		dashboard.handleInput("\x1b[C");
		expect(dashboard.section).toBe("mcps");
		dashboard.handleInput("\x1b[D"); // left arrow
		expect(dashboard.section).toBe("hooks");
		dashboard.handleInput("s");
		expect(dashboard.scope).toBe("global");
		dashboard.handleInput("s");
		expect(dashboard.scope).toBe("project");
	});

	test("esc/q closes via onClose", async () => {
		const dashboard = await CustomizationDashboard.create(projectDir);
		let closed = 0;
		dashboard.onClose = () => {
			closed += 1;
		};
		dashboard.handleInput("q");
		expect(closed).toBe(1);
	});

	test("narrow-terminal rendering stays within the viewport", async () => {
		await seedProjectSkill();
		const dashboard = await CustomizationDashboard.create(projectDir);
		const narrow = dashboard.render(20);
		expect(Bun.stripANSI(narrow.join(" "))).toContain("/extensions:");
		for (const line of narrow) {
			expect(Bun.stringWidth(line)).toBeLessThanOrEqual(20);
		}
		for (const line of dashboard.render(60)) {
			expect(Bun.stringWidth(line)).toBeLessThanOrEqual(60);
		}
	});
});

describe("ImportWizard", () => {
	test("esc cancels at any selection step without writing anything", async () => {
		await seedProjectSkill();
		const wizard = new ImportWizard(projectDir, "project", homeDir);
		expect(wizard.step).toBe("product");
		const closed: boolean[] = [];
		wizard.onClose = applied => {
			closed.push(applied);
		};
		wizard.handleInput("\x1b");
		expect(closed).toEqual([false]);
		await expect(fs.stat(path.join(projectDir, ".gjc", "mcp.json"))).rejects.toThrow();
	});

	test("drives product → scope → surfaces → policy → preview, enter applies", async () => {
		await fs.mkdir(path.join(projectDir, ".claude", "skills", "wiz-skill"), { recursive: true });
		await fs.writeFile(path.join(projectDir, ".claude", "skills", "wiz-skill", "SKILL.md"), SKILL_MD);
		const wizard = new ImportWizard(projectDir, "project", homeDir);
		wizard.handleInput("\r"); // product: claude-code (first)
		expect(wizard.step).toBe("sourceScope");
		wizard.handleInput("\r"); // source scope: project (first)
		expect(wizard.step).toBe("surfaces");
		wizard.handleInput("\r"); // surfaces: all
		expect(wizard.step).toBe("collision");
		wizard.handleInput("\r"); // policy: skip (first) → builds preview async
		await new Promise(resolve => setTimeout(resolve, 50));
		expect(wizard.step).toBe("preview");
		expect(wizard.preview?.entries.some(e => e.surface === "skills" && e.destinationName === "wiz-skill")).toBe(true);
		wizard.handleInput("\r"); // confirm apply
		await new Promise(resolve => setTimeout(resolve, 50));
		expect(wizard.step).toBe("result");
		expect(wizard.result?.ok).toBe(true);
		await fs.stat(path.join(projectDir, ".gjc", "skills", "wiz-skill", "SKILL.md"));
	});
});
