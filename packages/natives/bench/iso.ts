// A/B adapter: ISO backend resolution, probing, and plain-tree lifecycle.
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	IsoBackendKind,
	IsoChangeKind,
	isoDiff,
	isoProbe,
	isoResolve,
	isoStart,
	isoStop,
} from "../native/index.js";
import { runAbSuite } from "./ab-adapter";

const backendKinds = [
	IsoBackendKind.Apfs,
	IsoBackendKind.Btrfs,
	IsoBackendKind.Zfs,
	IsoBackendKind.LinuxReflink,
	IsoBackendKind.Overlayfs,
	IsoBackendKind.WindowsBlockClone,
	IsoBackendKind.Projfs,
	IsoBackendKind.Rcopy,
];

function isBackendKind(value: unknown): value is IsoBackendKind {
	return typeof value === "number" && backendKinds.includes(value);
}

function validateOptionalReason(reason: unknown): void {
	if (reason !== undefined && typeof reason !== "string") {
		throw new Error(`Unexpected ISO probe/resolution reason: ${String(reason)}`);
	}
}

const cases = [
	{
		id: "I01",
		run: async () => {
			const result = await isoResolve(null);
			if (!result || typeof result !== "object") throw new Error("isoResolve(null) returned no result object");
			if (!isBackendKind(result.kind)) throw new Error(`isoResolve(null) returned invalid kind ${String(result.kind)}`);
			if (!Array.isArray(result.candidates) || result.candidates.length === 0) {
				throw new Error("isoResolve(null) returned no backend candidates");
			}
			if (!result.candidates.every(isBackendKind) || result.candidates[0] !== result.kind) {
				throw new Error(`isoResolve(null) returned invalid candidates: ${JSON.stringify(result.candidates)}`);
			}
			if (typeof result.fellBack !== "boolean") throw new Error("isoResolve(null) returned invalid fellBack flag");
			validateOptionalReason(result.reason);
		},
	},
	{
		id: "I02",
		run: async () => {
			const result = await isoProbe();
			if (!result || typeof result !== "object") throw new Error("isoProbe() returned no result object");
			if (typeof result.available !== "boolean") throw new Error("isoProbe() returned invalid availability flag");
			if (!isBackendKind(result.kind)) throw new Error(`isoProbe() returned invalid kind ${String(result.kind)}`);
			validateOptionalReason(result.reason);
			if (!result.available && (typeof result.reason !== "string" || result.reason.trim().length === 0)) {
				throw new Error("isoProbe() reported an unavailable backend without a reason");
			}
		},
	},
];

let fixtureRoot: string | undefined;
const rcopyProbe = await isoProbe(IsoBackendKind.Rcopy);
if (rcopyProbe.available) {
	fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-iso-ab-"));
	const lower = path.join(fixtureRoot, "lower");
	const merged = path.join(fixtureRoot, "merged");
	const samplePath = path.join(merged, "sample.txt");
	await fs.mkdir(lower);
	await fs.writeFile(path.join(lower, "sample.txt"), "before\n");

	cases.push({
		id: "I03",
		run: async () => {
			let started = false;
			try {
				await isoStart(IsoBackendKind.Rcopy, lower, merged);
				started = true;
				await fs.writeFile(samplePath, "after\n");
				const diff = await isoDiff(lower, merged);
				if (!diff || !Array.isArray(diff.files) || diff.files.length === 0) {
					throw new Error("isoDiff() returned no changes after modifying the merged tree");
				}
				const changed = diff.files.find((file) => file.path === "sample.txt");
				if (
					!changed ||
					changed.op !== IsoChangeKind.Modified ||
					typeof changed.diff !== "string" ||
					!changed.diff.includes("-before") ||
					!changed.diff.includes("+after")
				) {
					throw new Error(`isoDiff() did not report the expected sample change: ${JSON.stringify(diff)}`);
				}
			} finally {
				try {
					if (started) await isoStop(IsoBackendKind.Rcopy, merged);
				} finally {
					await fs.rm(merged, { recursive: true, force: true });
				}
			}
		},
	});
} else {
	console.warn(`Omitting I03: Rcopy probe unavailable (${rcopyProbe.reason ?? "no reason provided"})`);
}

await runAbSuite("iso", cases, 10).finally(async () => {
	if (fixtureRoot) await fs.rm(fixtureRoot, { recursive: true, force: true });
});
