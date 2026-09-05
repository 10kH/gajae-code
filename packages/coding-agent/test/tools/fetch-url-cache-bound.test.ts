import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Settings } from "@gajae-code/coding-agent/config/settings";
import type { ToolSession } from "@gajae-code/coding-agent/tools";
import { loadReadUrlCacheEntry, READ_URL_CACHE_MAX_KEYS } from "@gajae-code/coding-agent/tools/fetch";
import * as scrapers from "@gajae-code/coding-agent/web/scrapers/types";
import { Snowflake } from "@gajae-code/utils";

describe("read-URL cache bound", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = path.join(os.tmpdir(), `fetch-url-cache-bound-${Snowflake.next()}`);
		fs.mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		vi.restoreAllMocks();
		fs.rmSync(testDir, { recursive: true, force: true });
	});

	const createSession = (): ToolSession => {
		const sessionFile = path.join(testDir, "session.jsonl");
		const artifactsDir = sessionFile.slice(0, -6);
		let nextArtifactId = 0;
		return {
			cwd: testDir,
			hasUI: false,
			getSessionFile: () => sessionFile,
			getArtifactsDir: () => artifactsDir,
			getSessionSpawns: () => null,
			allocateOutputArtifact: async toolType => {
				const id = String(nextArtifactId++);
				return {
					id,
					path: path.join(artifactsDir, `${id}.${toolType}.log`),
				};
			},
			settings: Settings.isolated({
				"fetch.enabled": true,
			}),
		};
	};

	it("evicts oldest entries past the key cap instead of growing without limit", async () => {
		const session = createSession();
		const firstUrl = "https://example.com/first";
		const loadPageSpy = vi.spyOn(scrapers, "loadPage").mockImplementation(async requestedUrl => ({
			ok: true,
			status: 200,
			contentType: "text/plain",
			finalUrl: requestedUrl,
			content: `content for ${requestedUrl}`,
		}));

		await loadReadUrlCacheEntry(session, { path: firstUrl }, undefined, { preferCached: true });
		expect(loadPageSpy).toHaveBeenCalledTimes(1);

		// Each fetch caches up to two keys, so filling the cap with distinct URLs
		// guarantees the first entry's keys are the oldest and get evicted.
		for (let i = 0; i < READ_URL_CACHE_MAX_KEYS; i++) {
			await loadReadUrlCacheEntry(session, { path: `https://example.com/fill-${i}` }, undefined, {
				preferCached: true,
			});
		}
		expect(loadPageSpy).toHaveBeenCalledTimes(1 + READ_URL_CACHE_MAX_KEYS);

		// Evicted entry is served by refetching, not by a stale cache hit.
		const refetched = await loadReadUrlCacheEntry(session, { path: firstUrl }, undefined, {
			preferCached: true,
		});
		expect(refetched.details.url).toBe(firstUrl);
		expect(loadPageSpy).toHaveBeenCalledTimes(2 + READ_URL_CACHE_MAX_KEYS);

		// Entries still under the cap keep being served without a refetch.
		await loadReadUrlCacheEntry(
			session,
			{ path: `https://example.com/fill-${READ_URL_CACHE_MAX_KEYS - 1}` },
			undefined,
			{
				preferCached: true,
			},
		);
		expect(loadPageSpy).toHaveBeenCalledTimes(2 + READ_URL_CACHE_MAX_KEYS);
	});
});
