import { afterEach, describe, expect, it, vi } from "bun:test";
import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as native from "@gajae-code/natives";
import { ArtifactManager } from "../src/session/artifacts";
import {
	ManagedSessionDescendantStore,
	managedDirectoryRoot,
	replaceManagedFileSync,
} from "../src/session/internal/managed-session-storage";
import { createManagedTaskPersistence } from "../src/task/executor";

const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories.splice(0).map(directory => fs.rm(directory, { recursive: true, force: true })),
	);
});

async function readSelected(artifactsDir: string, taskId: string): Promise<{ output: string; metadata: string }> {
	const selector = JSON.parse(await fs.readFile(path.join(artifactsDir, `${taskId}.md.selector.json`), "utf8")) as {
		outputFilename: string;
		metadataFilename: string;
	};
	return {
		output: await fs.readFile(path.join(artifactsDir, selector.outputFilename), "utf8"),
		metadata: await fs.readFile(path.join(artifactsDir, selector.metadataFilename), "utf8"),
	};
}

describe("explicit artifact path allocation", () => {
	it("preserves writable paths for explicit persistent destinations", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-task-explicit-artifact-"));
		temporaryDirectories.push(root);
		const artifacts = new ArtifactManager(path.join(root, "artifacts"));
		const allocated = await artifacts.allocatePath("bash");
		expect(allocated.path).toBe(path.join(root, "artifacts", `${allocated.id}.bash.log`));
		if (!allocated.path) throw new Error("Expected explicit artifact path");
		await Bun.write(allocated.path, "full output");
		expect(await fs.readFile(allocated.path, "utf8")).toBe("full output");
	});

	it("ignores unsafe persisted artifact ids when resuming", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-task-unsafe-artifact-id-"));
		temporaryDirectories.push(root);
		const artifactsDir = path.join(root, "artifacts");
		await fs.mkdir(artifactsDir, { recursive: true });
		await Bun.write(path.join(artifactsDir, "9007199254740992.bash.log"), "foreign unsafe artifact");
		await Bun.write(path.join(artifactsDir, "0009007199254740991.bash.log"), "foreign noncanonical artifact");
		const allocated = await new ArtifactManager(artifactsDir).allocatePath("bash");
		expect(allocated.id).toBe("0");
	});

	it("serializes concurrent first allocations when resuming", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-task-concurrent-artifact-id-"));
		temporaryDirectories.push(root);
		const artifactsDir = path.join(root, "artifacts");
		await fs.mkdir(artifactsDir, { recursive: true });
		await Bun.write(path.join(artifactsDir, "5.bash.log"), "existing artifact");
		const manager = new ArtifactManager(artifactsDir);
		const allocations = await Promise.all(Array.from({ length: 20 }, () => manager.allocatePath("bash")));
		expect(allocations.map(allocation => allocation.id)).toEqual(
			Array.from({ length: 20 }, (_, index) => String(index + 6)),
		);
	});

	it("fails closed when the safe artifact id space is exhausted", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-task-exhausted-artifact-id-"));
		temporaryDirectories.push(root);
		const artifactsDir = path.join(root, "artifacts");
		await fs.mkdir(artifactsDir, { recursive: true });
		await Bun.write(path.join(artifactsDir, `${Number.MAX_SAFE_INTEGER}.bash.log`), "last safe artifact");
		await expect(new ArtifactManager(artifactsDir).allocatePath("bash")).rejects.toThrow(
			"Artifact id space exhausted",
		);
	});

	it("checks the portable mutation fence before and around replacement publication", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-task-portable-fence-"));
		temporaryDirectories.push(root);
		const destination = path.join(root, "selector.json");
		await Bun.write(destination, "old");
		const expectedRoot = await fs.stat(root, { bigint: true });
		let checks = 0;
		replaceManagedFileSync(destination, Buffer.from("new"), managedDirectoryRoot(root), "default", () => {
			const current = fsSync.lstatSync(root, { bigint: true });
			expect(current.dev).toBe(expectedRoot.dev);
			expect(current.ino).toBe(expectedRoot.ino);
			checks += 1;
		});
		expect(checks).toBe(3);
		expect(await fs.readFile(destination, "utf8")).toBe("new");
	});

	it("publishes portable managed successor generations under selector fencing", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-task-portable-generation-"));
		temporaryDirectories.push(root);
		const artifactsDir = path.join(root, "artifacts");
		await fs.mkdir(artifactsDir, { mode: 0o700 });
		const platform = Object.getOwnPropertyDescriptor(process, "platform");
		let store!: ManagedSessionDescendantStore;
		try {
			Object.defineProperty(process, "platform", { configurable: true, value: "darwin" });
			store = new ManagedSessionDescendantStore(managedDirectoryRoot(artifactsDir), artifactsDir);
		} finally {
			if (platform) Object.defineProperty(process, "platform", platform);
		}
		const persistence = createManagedTaskPersistence(new ArtifactManager(store), "0-task-portable-generation");
		await persistence.publishOutput("first", Buffer.from('{"generation":1}', "utf8"));
		await persistence.publishOutput("second", Buffer.from('{"generation":2}', "utf8"));
		expect(await readSelected(artifactsDir, "0-task-portable-generation")).toEqual({
			output: "second",
			metadata: '{"generation":2}',
		});
	});

	it("publishes no bytes into a portable subtree swapped at selector replacement", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-task-portable-swap-"));
		temporaryDirectories.push(root);
		const artifactsDir = path.join(root, "artifacts");
		await fs.mkdir(artifactsDir, { mode: 0o700 });
		const detachedDir = path.join(root, "detached");
		const platform = Object.getOwnPropertyDescriptor(process, "platform");
		let store!: ManagedSessionDescendantStore;
		try {
			Object.defineProperty(process, "platform", { configurable: true, value: "darwin" });
			store = new ManagedSessionDescendantStore(managedDirectoryRoot(artifactsDir), artifactsDir);
		} finally {
			if (platform) Object.defineProperty(process, "platform", platform);
		}
		const persistence = createManagedTaskPersistence(new ArtifactManager(store), "0-task-portable-swap");
		await persistence.publishOutput("first", Buffer.from('{"generation":1}', "utf8"));
		const selectorPath = path.join(artifactsDir, "0-task-portable-swap.md.selector.json");
		const rename = fsSync.renameSync.bind(fsSync);
		let swapped = false;
		const spy = vi.spyOn(fsSync, "renameSync").mockImplementation((source, destination) => {
			if (!swapped && String(destination) === selectorPath && String(source).endsWith(".replacement")) {
				swapped = true;
				rename(artifactsDir, detachedDir);
				fsSync.mkdirSync(artifactsDir, { mode: 0o700 });
			}
			return rename(source, destination);
		});
		try {
			await expect(persistence.publishOutput("second", Buffer.from('{"generation":2}', "utf8"))).rejects.toThrow();
			expect(swapped).toBe(true);
			expect(await fs.readdir(artifactsDir)).toEqual([]);
		} finally {
			spy.mockRestore();
		}
	});
});

describe.skipIf(process.platform !== "linux")("managed task descendant persistence", () => {
	it("publishes output and metadata through one retained parent capability", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-task-managed-descendants-"));
		temporaryDirectories.push(root);
		const artifactsDir = path.join(root, "artifacts");
		const artifacts = new ArtifactManager(
			new ManagedSessionDescendantStore(managedDirectoryRoot(root), artifactsDir),
		);
		const persistence = createManagedTaskPersistence(artifacts, "0-task-1");
		const metadata = Buffer.from('{"id":"0-task-1"}', "utf8");

		await persistence.publishOutput("verified output", metadata);
		await persistence.publishOutput("resumed output", Buffer.from('{"id":"0-task-1","attempt":2}', "utf8"));

		expect(await readSelected(artifactsDir, "0-task-1")).toEqual({
			output: "resumed output",
			metadata: '{"id":"0-task-1","attempt":2}',
		});
	});

	it("allows only one manager to commit from the same captured selector generation", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-task-managed-selector-cas-"));
		temporaryDirectories.push(root);
		const artifactsDir = path.join(root, "artifacts");
		const firstStore = new ManagedSessionDescendantStore(managedDirectoryRoot(root), artifactsDir);
		const secondStore = new ManagedSessionDescendantStore(managedDirectoryRoot(root), artifactsDir);
		const first = createManagedTaskPersistence(new ArtifactManager(firstStore), "0-task-selector-cas");
		const second = createManagedTaskPersistence(new ArtifactManager(secondStore), "0-task-selector-cas");
		await first.publishOutput("initial output", Buffer.from('{"generation":0}', "utf8"));
		const selectorFilename = "0-task-selector-cas.md.selector.json";
		const captured = firstStore.readExpected(selectorFilename);
		if (!captured) throw new Error("expected initial selector snapshot");
		const firstRead = firstStore.readExpected.bind(firstStore);
		const secondRead = secondStore.readExpected.bind(secondStore);
		let firstCaptured = false;
		let secondCaptured = false;
		const firstSpy = vi.spyOn(firstStore, "readExpected").mockImplementation(relativePath => {
			if (relativePath === selectorFilename && !firstCaptured) {
				firstCaptured = true;
				return captured;
			}
			return firstRead(relativePath);
		});
		const secondSpy = vi.spyOn(secondStore, "readExpected").mockImplementation(relativePath => {
			if (relativePath === selectorFilename && !secondCaptured) {
				secondCaptured = true;
				return captured;
			}
			return secondRead(relativePath);
		});
		try {
			const results = await Promise.allSettled([
				first.publishOutput("writer A", Buffer.from('{"generation":1,"writer":"A"}', "utf8")),
				second.publishOutput("writer B", Buffer.from('{"generation":1,"writer":"B"}', "utf8")),
			]);
			expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
			expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
			const selected = await readSelected(artifactsDir, "0-task-selector-cas");
			expect(["writer A", "writer B"]).toContain(selected.output);
			expect(selected.metadata).toContain(`"writer":"${selected.output.at(-1)}"`);
			expect((await fs.readdir(artifactsDir)).filter(filename => filename.endsWith(".output"))).toHaveLength(1);
			expect((await fs.readdir(artifactsDir)).filter(filename => filename.endsWith(".meta.json"))).toHaveLength(1);
		} finally {
			firstSpy.mockRestore();
			secondSpy.mockRestore();
		}
	});

	it("keeps the prior output and metadata when retained replacement creation fails", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-task-managed-no-loss-"));
		temporaryDirectories.push(root);
		const artifactsDir = path.join(root, "artifacts");
		const artifacts = new ArtifactManager(
			new ManagedSessionDescendantStore(managedDirectoryRoot(root), artifactsDir),
		);
		const persistence = createManagedTaskPersistence(artifacts, "0-task-no-loss");
		await persistence.publishOutput("old output", Buffer.from('{"generation":1}', "utf8"));
		const spy = vi
			.spyOn(native.RecoveryFsRoot.prototype as unknown as { replaceManaged: () => unknown }, "replaceManaged")
			.mockReturnValueOnce({ ok: false, code: "io_error" });
		try {
			await expect(persistence.publishOutput("new output", Buffer.from('{"generation":2}', "utf8"))).rejects.toThrow(
				"io_error",
			);
			expect(await readSelected(artifactsDir, "0-task-no-loss")).toEqual({
				output: "old output",
				metadata: '{"generation":1}',
			});
			expect((await fs.readdir(artifactsDir)).filter(filename => filename.endsWith(".output"))).toHaveLength(1);
			expect((await fs.readdir(artifactsDir)).filter(filename => filename.endsWith(".meta.json"))).toHaveLength(1);
		} finally {
			spy.mockRestore();
		}
	});

	it("keeps the selected generation when staging metadata fails", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-task-managed-generation-staging-"));
		temporaryDirectories.push(root);
		const artifactsDir = path.join(root, "artifacts");
		const artifacts = new ArtifactManager(
			new ManagedSessionDescendantStore(managedDirectoryRoot(root), artifactsDir),
		);
		const persistence = createManagedTaskPersistence(artifacts, "0-task-generation");
		await persistence.publishOutput("old output", Buffer.from('{"generation":1}', "utf8"));
		const prototype = native.RecoveryFsRoot.prototype as unknown as {
			createManaged: (...args: unknown[]) => { ok: boolean; code?: string };
		};
		const realCreateManaged = prototype.createManaged;
		let calls = 0;
		const spy = vi.spyOn(prototype, "createManaged").mockImplementation(function (this: unknown, ...args: unknown[]) {
			calls += 1;
			if (calls === 2) return { ok: false, code: "io_error" };
			return realCreateManaged.apply(this, args);
		});
		try {
			await expect(persistence.publishOutput("new output", Buffer.from('{"generation":2}', "utf8"))).rejects.toThrow(
				"io_error",
			);
			expect(await readSelected(artifactsDir, "0-task-generation")).toEqual({
				output: "old output",
				metadata: '{"generation":1}',
			});
			expect((await fs.readdir(artifactsDir)).filter(filename => filename.endsWith(".output"))).toHaveLength(1);
		} finally {
			spy.mockRestore();
		}
	});

	it("rejects selector rewrites that retain filenames but alter size and digest claims", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-task-managed-selector-rewrite-"));
		temporaryDirectories.push(root);
		const artifactsDir = path.join(root, "artifacts");
		const taskId = "0-task-selector-rewrite";
		const selectorPath = path.join(artifactsDir, `${taskId}.md.selector.json`);
		const artifacts = new ArtifactManager(
			new ManagedSessionDescendantStore(managedDirectoryRoot(root), artifactsDir),
		);
		const persistence = createManagedTaskPersistence(artifacts, taskId);
		await persistence.publishOutput("old output", Buffer.from('{"generation":1}', "utf8"));
		const prototype = native.RecoveryFsRoot.prototype as unknown as {
			replaceManaged: (...args: unknown[]) => { ok: boolean; code?: string };
		};
		const realReplaceManaged = prototype.replaceManaged;
		let rewritten = false;
		const spy = vi.spyOn(prototype, "replaceManaged").mockImplementation(function (
			this: unknown,
			...args: unknown[]
		) {
			const result = realReplaceManaged.apply(this, args);
			if (result.ok && !rewritten) {
				const selector = JSON.parse(fsSync.readFileSync(selectorPath, "utf8")) as {
					outputSizeBytes: number;
					outputSha256: string;
					metadataSizeBytes: number;
					metadataSha256: string;
				};
				selector.outputSizeBytes += 1;
				selector.outputSha256 = "0".repeat(64);
				selector.metadataSizeBytes += 1;
				selector.metadataSha256 = "f".repeat(64);
				fsSync.writeFileSync(selectorPath, JSON.stringify(selector));
				rewritten = true;
			}
			return result;
		});
		try {
			await expect(persistence.publishOutput("new output", Buffer.from('{"generation":2}', "utf8"))).rejects.toThrow(
				"managed_output_selector_verification_failed",
			);
			expect(rewritten).toBe(true);
			expect(await readSelected(artifactsDir, taskId)).toEqual({
				output: "old output",
				metadata: '{"generation":1}',
			});
		} finally {
			spy.mockRestore();
		}
	});

	it("rejects output after the retained artifacts directory is replaced", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-task-managed-replacement-"));
		temporaryDirectories.push(root);
		const artifactsDir = path.join(root, "artifacts");
		const artifacts = new ArtifactManager(
			new ManagedSessionDescendantStore(managedDirectoryRoot(root), artifactsDir),
		);
		const persistence = createManagedTaskPersistence(artifacts, "0-task-2");
		await fs.rename(artifactsDir, path.join(root, "detached"));
		await fs.mkdir(artifactsDir, { mode: 0o700 });
		await expect(persistence.openSession(root)).rejects.toThrow("root binding changed");

		await expect(persistence.publishOutput("blocked", Buffer.from("{}", "utf8"))).rejects.toThrow(
			"root binding changed",
		);
		expect(await fs.readdir(artifactsDir)).toEqual([]);
	});

	it("never writes output bytes into a subtree swapped during replacement", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-task-managed-boundary-"));
		temporaryDirectories.push(root);
		const artifactsDir = path.join(root, "artifacts");
		const artifacts = new ArtifactManager(
			new ManagedSessionDescendantStore(managedDirectoryRoot(root), artifactsDir),
		);
		const persistence = createManagedTaskPersistence(artifacts, "0-task-3");
		await persistence.publishOutput("initial", Buffer.from("{}", "utf8"));
		const replacementPrototype = native.RecoveryFsRoot.prototype as unknown as {
			replaceManaged: (...args: unknown[]) => { ok: boolean; code?: string };
		};
		const realReplaceManaged = replacementPrototype.replaceManaged;
		let swapped = false;
		const spy = vi.spyOn(replacementPrototype, "replaceManaged").mockImplementation(function (
			this: unknown,
			...args: unknown[]
		) {
			const result = realReplaceManaged.apply(this, args);
			if (result.ok && !swapped) {
				swapped = true;
				fsSync.renameSync(artifactsDir, path.join(root, "detached"));
				fsSync.mkdirSync(artifactsDir, { mode: 0o700 });
			}
			return result;
		});
		try {
			await expect(persistence.publishOutput("blocked", Buffer.from('{"attempt":2}', "utf8"))).rejects.toThrow(
				"root binding changed",
			);
			expect(await fs.readdir(artifactsDir)).toEqual([]);
			expect(await readSelected(path.join(root, "detached"), "0-task-3")).toEqual({
				output: "blocked",
				metadata: '{"attempt":2}',
			});
		} finally {
			spy.mockRestore();
		}
	});

	it("does not issue a fallible root fsync after native publication commits", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-task-managed-fsync-"));
		temporaryDirectories.push(root);
		const artifactsDir = path.join(root, "artifacts");
		const artifacts = new ArtifactManager(
			new ManagedSessionDescendantStore(managedDirectoryRoot(root), artifactsDir),
		);
		const persistence = createManagedTaskPersistence(artifacts, "0-task-4");
		const spy = vi
			.spyOn(native.RecoveryFsRoot.prototype, "fsync")
			.mockReturnValue({ ok: false, code: "fsync_failed" });
		try {
			await persistence.publishOutput("committed", Buffer.from("{}", "utf8"));
			expect(await readSelected(artifactsDir, "0-task-4")).toEqual({ output: "committed", metadata: "{}" });
			expect(spy).not.toHaveBeenCalled();
		} finally {
			spy.mockRestore();
		}
	});

	it("supports managed output replacement above the recovery-state size cap", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-task-managed-large-"));
		temporaryDirectories.push(root);
		const artifactsDir = path.join(root, "artifacts");
		const artifacts = new ArtifactManager(
			new ManagedSessionDescendantStore(managedDirectoryRoot(root), artifactsDir),
		);
		const persistence = createManagedTaskPersistence(artifacts, "0-task-5");
		const initial = "a".repeat(2 * 1024 * 1024);
		const resumed = "b".repeat(2 * 1024 * 1024);
		await persistence.publishOutput(initial, Buffer.from("{}", "utf8"));
		await persistence.publishOutput(resumed, Buffer.from('{"attempt":2}', "utf8"));
		const selected = await readSelected(artifactsDir, "0-task-5");
		expect(Buffer.byteLength(selected.output)).toBe(Buffer.byteLength(resumed));
		expect(selected.output.slice(0, 1)).toBe("b");
	});
});
