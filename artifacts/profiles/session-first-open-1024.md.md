# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 4.43s | 3301 | 1.0ms | 315 |

**Top 10:** `update` 30.7%, `gc` 27.5%, `openSync` 9.6%, `readSync` 6.0%, `write` 3.2%, `stringSplitFast` 3.1%, `parse` 2.7%, `Readable` 2.7%, `byteLength` 2.0%, `stringify` 2.0%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 30.7% | 1.36s | 30.7% | 1.36s | `update` | `[native code]` |
| 27.5% | 1.22s | 27.5% | 1.22s | `gc` | `[native code]` |
| 9.6% | 425.6ms | 15.9% | 705.3ms | `openSync` | `[native code]` |
| 6.0% | 266.6ms | 6.0% | 266.6ms | `readSync` | `[native code]` |
| 3.2% | 145.2ms | 3.2% | 145.2ms | `write` | `[native code]` |
| 3.1% | 139.3ms | 3.1% | 139.3ms | `stringSplitFast` | `[native code]` |
| 2.7% | 123.1ms | 2.7% | 123.1ms | `parse` | `[native code]` |
| 2.7% | 121.9ms | 2.7% | 121.9ms | `Readable` | `internal:streams/readable` |
| 2.0% | 92.9ms | 2.0% | 92.9ms | `byteLength` | `[native code]` |
| 2.0% | 90.9ms | 2.0% | 90.9ms | `stringify` | `[native code]` |
| 1.2% | 56.1ms | 2.4% | 107.2ms | `anonymous` | `[native code]` |
| 1.1% | 49.3ms | 1.1% | 49.3ms | `error` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/locales/en.js` |
| 1.0% | 46.3ms | 1.7% | 76.9ms | `fstatSync` | `[native code]` |
| 0.9% | 42.2ms | 0.9% | 42.2ms | `toString` | `[native code]` |
| 0.8% | 35.6ms | 1.3% | 59.7ms | `lstatSync` | `[native code]` |
| 0.6% | 30.1ms | 1.1% | 49.9ms | `closeSync` | `[native code]` |
| 0.5% | 24.2ms | 0.5% | 24.2ms | `alloc` | `[native code]` |
| 0.4% | 21.1ms | 0.4% | 21.1ms | `decode` | `[native code]` |
| 0.4% | 18.2ms | 0.4% | 18.2ms | `copy` | `[native code]` |
| 0.3% | 15.9ms | 0.3% | 15.9ms | `indexOf` | `[native code]` |
| 0.1% | 6.3ms | 0.1% | 6.3ms | `dlopen` | `[native code]` |
| 0.1% | 4.9ms | 0.1% | 4.9ms | `isFile` | `[native code]` |
| 0.0% | 4.2ms | 0.0% | 4.2ms | `statFromNode` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:109` |
| 0.0% | 2.8ms | 0.0% | 2.8ms | `matches` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/provider-models/openai-compat.ts:2185` |
| 0.0% | 2.7ms | 33.1% | 1.46s | `from` | `[native code]` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `createToJSONSchemaMethod` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/to-json-schema.js:436` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `spawnSync` | `[native code]` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `memoryUsage` | `[native code]` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:322` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `decodeBase64` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/internal/decode-shared.js:24` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `#createDictionaryFlushTarget` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:11118` |
| 0.0% | 1.5ms | 0.4% | 19.6ms | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1571` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `initLoaderContext` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:466` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `assign` | `[native code]` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1571` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `checkRevision` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `channel` | `node:diagnostics_channel` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `Hash` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `setPrototypeDirectOrThrow` | `[native code]` |
| 0.0% | 1.4ms | 0.3% | 17.4ms | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1484` |
| 0.0% | 1.4ms | 19.3% | 856.9ms | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1564` |
| 0.0% | 1.4ms | 15.4% | 684.2ms | `#validateColdBase` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12049` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `#disposableSidecarPaths` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:1249` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `shift` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `allocUnsafe` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `applyOwnerOnlyPathSecurity` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7854` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `inspectTranscriptBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3635` |
| 0.0% | 1.4ms | 97.3% | 4.31s | `(anonymous)` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `at` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `Segmenter` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `compileChildren` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:834` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `async #tryInitSessionFileFromSidecar` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `#entryForProviderContext` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `bigint` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `subarray` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:19` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `mapStainlessArch` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/anthropic.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `#validateColdBase` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12055` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `get buffer` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `shift` | `internal:fixed_queue` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:12` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `isProviderStateEntry` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1056` |
| 0.0% | 1.1ms | 0.0% | 2.2ms | `inspectTranscriptBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3641` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `Buffer` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `readSync` | `node:fs:288` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7734` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `normalizeParams` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:268` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `RegExp` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:204` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `disposeVerifiedResidentCacheInstanceDir` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:434` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/lru-cache/dist/esm/node/index.js:189` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `#readSessionCommitContents` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `pop` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `inspectTranscriptBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.0ms | 1.9% | 86.9ms | `serialize` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:301` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:83` |
| 0.0% | 1.0ms | 8.9% | 394.7ms | `inspectTranscriptBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3636` |
| 0.0% | 1.0ms | 0.0% | 2.0ms | `mkdtempSync` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `statSync` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `#preparedResidentTransitionFromSource` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/lib/index.js:24` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `computeTailRecordChecksum` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1557` |
| 0.0% | 982us | 0.0% | 982us | `Set` | `[native code]` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 97.3% | 4.31s | 0.0% | 1.4ms | `(anonymous)` | `[native code]` |
| 94.1% | 4.17s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 52.1% | 2.31s | 0.0% | 0us | `async #initSessionFile` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8229` |
| 52.1% | 2.31s | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7521` |
| 33.1% | 1.46s | 0.0% | 2.7ms | `from` | `[native code]` |
| 33.0% | 1.46s | 0.0% | 0us | `async openNext` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:852` |
| 33.0% | 1.46s | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:858` |
| 33.0% | 1.46s | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17249` |
| 33.0% | 1.46s | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:869` |
| 32.7% | 1.45s | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17265` |
| 30.7% | 1.36s | 30.7% | 1.36s | `update` | `[native code]` |
| 27.5% | 1.22s | 27.5% | 1.22s | `gc` | `[native code]` |
| 27.5% | 1.22s | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7581` |
| 27.5% | 1.21s | 0.0% | 0us | `#classifySidecarReopen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:13321` |
| 23.8% | 1.05s | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7565` |
| 23.8% | 1.05s | 0.0% | 0us | `#scanBoundedTranscriptForFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7716` |
| 19.3% | 856.9ms | 0.0% | 1.4ms | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1564` |
| 18.4% | 818.5ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1498` |
| 15.9% | 705.3ms | 9.6% | 425.6ms | `openSync` | `[native code]` |
| 15.4% | 684.2ms | 0.0% | 1.4ms | `#validateColdBase` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12049` |
| 12.0% | 533.3ms | 0.0% | 0us | `#validateColdBase` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12050` |
| 11.9% | 527.7ms | 0.0% | 0us | `inspectTranscriptBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3652` |
| 9.5% | 423.0ms | 0.0% | 0us | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1559` |
| 8.9% | 394.7ms | 0.0% | 1.0ms | `inspectTranscriptBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3636` |
| 8.2% | 365.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7758` |
| 8.2% | 365.2ms | 0.0% | 0us | `computeLineDigest` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:693` |
| 7.3% | 327.6ms | 0.0% | 0us | `updateBoundedTranscriptHash` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1396` |
| 7.3% | 327.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7722` |
| 7.0% | 312.9ms | 0.0% | 0us | `inspectTranscriptBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3637` |
| 6.0% | 266.6ms | 6.0% | 266.6ms | `readSync` | `[native code]` |
| 4.1% | 182.0ms | 0.0% | 0us | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1567` |
| 3.8% | 170.3ms | 0.0% | 0us | `async write` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:303` |
| 3.8% | 170.3ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:365` |
| 3.2% | 145.2ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:306` |
| 3.2% | 145.2ms | 3.2% | 145.2ms | `write` | `[native code]` |
| 3.1% | 139.3ms | 3.1% | 139.3ms | `stringSplitFast` | `[native code]` |
| 3.1% | 139.3ms | 0.0% | 0us | `inspectTranscriptBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3640` |
| 2.7% | 123.1ms | 2.7% | 123.1ms | `parse` | `[native code]` |
| 2.7% | 121.9ms | 0.0% | 0us | `ReadStream` | `internal:fs/streams:86` |
| 2.7% | 121.9ms | 2.7% | 121.9ms | `Readable` | `internal:streams/readable` |
| 2.5% | 113.9ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7726` |
| 2.4% | 110.4ms | 0.0% | 0us | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1581` |
| 2.4% | 107.4ms | 0.0% | 0us | `recordFirstOpenGcRequest` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6485` |
| 2.4% | 107.2ms | 1.2% | 56.1ms | `anonymous` | `[native code]` |
| 2.1% | 95.1ms | 0.0% | 0us | `bound require` | `[native code]` |
| 2.0% | 92.9ms | 2.0% | 92.9ms | `byteLength` | `[native code]` |
| 2.0% | 90.9ms | 2.0% | 90.9ms | `stringify` | `[native code]` |
| 2.0% | 88.7ms | 0.0% | 0us | `require` | `[native code]` |
| 1.9% | 86.9ms | 0.0% | 1.0ms | `serialize` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:301` |
| 1.9% | 85.7ms | 0.0% | 0us | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1560` |
| 1.9% | 84.4ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:323` |
| 1.7% | 76.9ms | 1.0% | 46.3ms | `fstatSync` | `[native code]` |
| 1.5% | 67.8ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:348` |
| 1.3% | 59.7ms | 0.8% | 35.6ms | `lstatSync` | `[native code]` |
| 1.1% | 52.6ms | 0.0% | 0us | `inspectTranscriptBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3644` |
| 1.1% | 49.9ms | 0.6% | 30.1ms | `closeSync` | `[native code]` |
| 1.1% | 49.3ms | 1.1% | 49.3ms | `error` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/locales/en.js` |
| 1.1% | 49.3ms | 0.0% | 0us | `en_default` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/locales/en.js:111` |
| 1.1% | 49.3ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/external.js:10` |
| 0.9% | 42.2ms | 0.9% | 42.2ms | `toString` | `[native code]` |
| 0.8% | 35.6ms | 0.0% | 0us | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1574` |
| 0.7% | 32.8ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7573` |
| 0.7% | 32.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:20` |
| 0.7% | 31.1ms | 0.0% | 0us | `memorySample` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:231` |
| 0.6% | 28.9ms | 0.0% | 0us | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1579` |
| 0.6% | 28.2ms | 0.0% | 0us | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1561` |
| 0.6% | 26.7ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8063` |
| 0.5% | 25.0ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:305` |
| 0.5% | 24.2ms | 0.5% | 24.2ms | `alloc` | `[native code]` |
| 0.5% | 24.2ms | 0.0% | 0us | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1564` |
| 0.5% | 22.9ms | 0.0% | 0us | `async settledMemorySample` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:244` |
| 0.4% | 21.1ms | 0.4% | 21.1ms | `decode` | `[native code]` |
| 0.4% | 21.1ms | 0.0% | 0us | `inspectTranscriptBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3638` |
| 0.4% | 19.6ms | 0.0% | 1.5ms | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1571` |
| 0.4% | 18.5ms | 0.0% | 0us | `init` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:22` |
| 0.4% | 18.2ms | 0.4% | 18.2ms | `copy` | `[native code]` |
| 0.3% | 17.4ms | 0.0% | 1.4ms | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1484` |
| 0.3% | 15.9ms | 0.3% | 15.9ms | `indexOf` | `[native code]` |
| 0.3% | 14.4ms | 0.0% | 0us | `render` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:493` |
| 0.2% | 11.7ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1494` |
| 0.2% | 11.6ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/utils.ts:185` |
| 0.2% | 10.2ms | 0.0% | 0us | `node:crypto` | `node:crypto:2` |
| 0.2% | 10.1ms | 0.0% | 0us | `compile` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:485` |
| 0.2% | 10.1ms | 0.0% | 0us | `getHandlebars` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:237` |
| 0.2% | 9.6ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:808` |
| 0.2% | 9.1ms | 0.0% | 0us | `canonicalizeTrustedPath` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/managed-session-scope.ts:406` |
| 0.2% | 9.1ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17263` |
| 0.2% | 9.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/lib/index.js:8` |
| 0.1% | 7.8ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/index.js:16` |
| 0.1% | 6.6ms | 0.0% | 0us | `map` | `[native code]` |
| 0.1% | 6.3ms | 0.1% | 6.3ms | `dlopen` | `[native code]` |
| 0.1% | 6.3ms | 0.0% | 0us | `loadNative` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:544` |
| 0.1% | 6.3ms | 0.0% | 0us | `loadFromCandidates` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:215` |
| 0.1% | 5.1ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1508` |
| 0.1% | 5.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7760` |
| 0.1% | 4.9ms | 0.1% | 4.9ms | `isFile` | `[native code]` |
| 0.0% | 4.3ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7595` |
| 0.0% | 4.2ms | 0.0% | 0us | `ret` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:517` |
| 0.0% | 4.2ms | 0.0% | 4.2ms | `statFromNode` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:109` |
| 0.0% | 4.2ms | 0.0% | 0us | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1577` |
| 0.0% | 3.8ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:8` |
| 0.0% | 3.8ms | 0.0% | 0us | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1562` |
| 0.0% | 3.8ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:22` |
| 0.0% | 3.8ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:16` |
| 0.0% | 3.3ms | 0.0% | 0us | `#prepareResidentTextStoreTransition` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6897` |
| 0.0% | 3.3ms | 0.0% | 0us | `#newResidentTextStoreCandidate` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6819` |
| 0.0% | 2.8ms | 0.0% | 2.8ms | `matches` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/provider-models/openai-compat.ts:2185` |
| 0.0% | 2.8ms | 0.0% | 0us | `resolveApiByRules` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/provider-models/openai-compat.ts:2167` |
| 0.0% | 2.8ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/provider-models/openai-compat.ts:2723` |
| 0.0% | 2.8ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/provider-models/openai-compat.ts:2671` |
| 0.0% | 2.7ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:770` |
| 0.0% | 2.7ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `createToJSONSchemaMethod` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/to-json-schema.js:436` |
| 0.0% | 2.5ms | 0.0% | 0us | `ZodOptional` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.0% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:64` |
| 0.0% | 2.5ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/modes/theme/theme.ts:936` |
| 0.0% | 2.5ms | 0.0% | 0us | `bound optional` | `[native code]` |
| 0.0% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1105` |
| 0.0% | 2.5ms | 0.0% | 0us | `optional` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1110` |
| 0.0% | 2.5ms | 0.0% | 0us | `optional` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:125` |
| 0.0% | 2.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js:15` |
| 0.0% | 2.4ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7973` |
| 0.0% | 2.3ms | 0.0% | 0us | `async #tryInitSessionFileFromSidecar` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7289` |
| 0.0% | 2.3ms | 0.0% | 0us | `async #initSessionFile` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8216` |
| 0.0% | 2.3ms | 0.0% | 0us | `async #initSessionFile` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8224` |
| 0.0% | 2.3ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17291` |
| 0.0% | 2.3ms | 0.0% | 0us | `node:fs/promises` | `node:fs/promises:2` |
| 0.0% | 2.2ms | 0.0% | 0us | `openVerifiedResidentCacheInstanceDir` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:621` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `spawnSync` | `[native code]` |
| 0.0% | 2.2ms | 0.0% | 0us | `residentCacheProcessStartTimeMs` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:207` |
| 0.0% | 2.2ms | 0.0% | 0us | `writeResidentCacheOwnerToken` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:314` |
| 0.0% | 2.2ms | 0.0% | 1.1ms | `inspectTranscriptBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3641` |
| 0.0% | 2.0ms | 0.0% | 1.0ms | `mkdtempSync` | `[native code]` |
| 0.0% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7772` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `memoryUsage` | `[native code]` |
| 0.0% | 1.7ms | 0.0% | 0us | `recordFirstOpenGcRequest` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6478` |
| 0.0% | 1.7ms | 0.0% | 0us | `residentProcessBytes` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6452` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:322` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `decodeBase64` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/internal/decode-shared.js:24` |
| 0.0% | 1.5ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/generated/decode-data-html.js:3` |
| 0.0% | 1.5ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7964` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `#createDictionaryFlushTarget` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:11118` |
| 0.0% | 1.5ms | 0.0% | 0us | `loadNative` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:533` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `initLoaderContext` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:466` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `assign` | `[native code]` |
| 0.0% | 1.5ms | 0.0% | 0us | `node:assert/strict` | `node:assert/strict:3` |
| 0.0% | 1.5ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1571` |
| 0.0% | 1.5ms | 0.0% | 0us | `template` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:65` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `checkRevision` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js` |
| 0.0% | 1.5ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/lru-cache/dist/esm/node/diagnostics-channel.js:4` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `channel` | `node:diagnostics_channel` |
| 0.0% | 1.4ms | 0.0% | 0us | `createHash` | `node:crypto:201` |
| 0.0% | 1.4ms | 0.0% | 0us | `Hash` | `node:crypto:178` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `Hash` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 0us | `get ReadStream` | `node:fs:578` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `setPrototypeDirectOrThrow` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 0us | `internal:fs/streams` | `internal:fs/streams:2` |
| 0.0% | 1.4ms | 0.0% | 0us | `internal:streams/operators` | `internal:streams/operators:130` |
| 0.0% | 1.4ms | 0.0% | 0us | `internal:stream` | `internal:stream:2` |
| 0.0% | 1.4ms | 0.0% | 0us | `node:stream` | `node:stream:2` |
| 0.0% | 1.4ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:879` |
| 0.0% | 1.4ms | 0.0% | 0us | `getSessionMemoryStats` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:14094` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `#disposableSidecarPaths` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:1249` |
| 0.0% | 1.4ms | 0.0% | 0us | `accept` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/visitor.js:74` |
| 0.0% | 1.4ms | 0.0% | 0us | `compileInput` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:508` |
| 0.0% | 1.4ms | 0.0% | 0us | `accept` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/visitor.js:72` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `shift` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/whitespace-control.js:28` |
| 0.0% | 1.4ms | 0.0% | 0us | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1557` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `allocUnsafe` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:734` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:14` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:728` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:18` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js` |
| 0.0% | 1.4ms | 0.0% | 0us | `openFirstOpenSidecarWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6507` |
| 0.0% | 1.4ms | 0.0% | 0us | `secureOwnerOnlyFileDescriptor` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:662` |
| 0.0% | 1.4ms | 0.0% | 0us | `#scanBoundedTranscriptForFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7715` |
| 0.0% | 1.4ms | 0.0% | 0us | `FileSessionStorageWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1015` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `applyOwnerOnlyPathSecurity` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 0us | `openBufferedWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1757` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7854` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `inspectTranscriptBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3635` |
| 0.0% | 1.4ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:331` |
| 0.0% | 1.3ms | 0.0% | 0us | `summarize` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:226` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `at` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:1033` |
| 0.0% | 1.3ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1492` |
| 0.0% | 1.3ms | 0.0% | 0us | `ensureCapacity` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1476` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.runtime.js:31` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `Segmenter` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/tui/src/utils.ts:173` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `compileChildren` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:834` |
| 0.0% | 1.3ms | 0.0% | 0us | `compileInput` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:510` |
| 0.0% | 1.3ms | 0.0% | 0us | `compile` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:99` |
| 0.0% | 1.3ms | 0.0% | 0us | `internal:streams/lazy_transform` | `internal:streams/lazy_transform:2` |
| 0.0% | 1.3ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 0.0% | 1.3ms | 0.0% | 0us | `internal:streams/transform` | `internal:streams/transform:2` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/lib/source-map-generator.js:8` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:6` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/helpers.js:26` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.runtime.js:12` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/base.js:15` |
| 0.0% | 1.3ms | 0.0% | 0us | `openVerifiedResidentCacheDirectory` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:178` |
| 0.0% | 1.3ms | 0.0% | 0us | `async sweepResidentCacheRoot` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:564` |
| 0.0% | 1.3ms | 0.0% | 0us | `readResidentCacheOwnerSnapshot` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:284` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `async #tryInitSessionFileFromSidecar` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.2ms | 0.0% | 0us | `createSessionCommitMarkerCheckedSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:775` |
| 0.0% | 1.2ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7580` |
| 0.0% | 1.2ms | 0.0% | 0us | `#withSessionPersistenceFenceSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:9924` |
| 0.0% | 1.2ms | 0.0% | 0us | `createFileCommitMarkerCheckedSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:828` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10322` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `#entryForProviderContext` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.2ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17292` |
| 0.0% | 1.2ms | 0.0% | 0us | `buildSessionContext` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16194` |
| 0.0% | 1.2ms | 0.0% | 0us | `#getSessionContextForRead` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16237` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `bigint` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 0us | `recordFirstOpenGcRequest` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6483` |
| 0.0% | 1.2ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1486` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `subarray` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:25` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:2211` |
| 0.0% | 1.2ms | 0.0% | 0us | `_refine` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:953` |
| 0.0% | 1.2ms | 0.0% | 0us | `ZodCustom` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.0% | 1.2ms | 0.0% | 0us | `bound refine` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 0us | `refine` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:116` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1326` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:19` |
| 0.0% | 1.2ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/anthropic.ts:637` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `mapStainlessArch` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/anthropic.ts` |
| 0.0% | 1.2ms | 0.0% | 0us | `#coldIndexDigestValid` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12158` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:887` |
| 0.0% | 1.2ms | 0.0% | 0us | `getEntry` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:15951` |
| 0.0% | 1.2ms | 0.0% | 0us | `async measurePhase` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:582` |
| 0.0% | 1.2ms | 0.0% | 0us | `async measurePhase` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:579` |
| 0.0% | 1.2ms | 0.0% | 0us | `#resolveEntry` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12475` |
| 0.0% | 1.2ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:885` |
| 0.0% | 1.2ms | 0.0% | 0us | `#findColdEntryIndex` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12212` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `#validateColdBase` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12055` |
| 0.0% | 1.2ms | 0.0% | 0us | `#classifySidecarReopen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:13317` |
| 0.0% | 1.2ms | 0.0% | 0us | `#readSessionCommitContents` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:13225` |
| 0.0% | 1.2ms | 0.0% | 0us | `decodeBoundedJsonLine` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1373` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `get buffer` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 0us | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1615` |
| 0.0% | 1.1ms | 0.0% | 0us | `node:util` | `node:util:2` |
| 0.0% | 1.1ms | 0.0% | 0us | `internal:util/inspect` | `internal:util/inspect:2` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:7` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `shift` | `internal:fixed_queue` |
| 0.0% | 1.1ms | 0.0% | 0us | `shift` | `internal:fixed_queue:44` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:488` |
| 0.0% | 1.1ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/usage.ts:83` |
| 0.0% | 1.1ms | 0.0% | 0us | `_number` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:307` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:507` |
| 0.0% | 1.1ms | 0.0% | 0us | `ZodNumber` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:12` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7832` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `isProviderStateEntry` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1056` |
| 0.0% | 1.1ms | 0.0% | 0us | `providerStateEntryKey` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1060` |
| 0.0% | 1.1ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8058` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `Buffer` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7770` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `readSync` | `node:fs:288` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7734` |
| 0.0% | 1.1ms | 0.0% | 0us | `object` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:789` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `normalizeParams` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:268` |
| 0.0% | 1.1ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/anthropic-messages-server-schema.ts:63` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `RegExp` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:14` |
| 0.0% | 1.1ms | 0.0% | 0us | `getRegex` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:13` |
| 0.0% | 1.1ms | 0.0% | 0us | `#disposeResidentTextStore` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7012` |
| 0.0% | 1.1ms | 0.0% | 0us | `_string` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:7` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `disposeVerifiedResidentCacheInstanceDir` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:434` |
| 0.0% | 1.1ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/openai-responses-server-schema.ts:97` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:204` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:259` |
| 0.0% | 1.1ms | 0.0% | 0us | `#releaseResidentTextStore` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7103` |
| 0.0% | 1.1ms | 0.0% | 0us | `async close` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:13921` |
| 0.0% | 1.1ms | 0.0% | 0us | `dispose` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:1234` |
| 0.0% | 1.1ms | 0.0% | 0us | `ZodString` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/lru-cache/dist/esm/node/index.js:189` |
| 0.0% | 1.0ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/tui/src/components/markdown.ts:49` |
| 0.0% | 1.0ms | 0.0% | 0us | `LRUCache` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/lru-cache/dist/esm/node/index.js:279` |
| 0.0% | 1.0ms | 0.0% | 0us | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1575` |
| 0.0% | 1.0ms | 0.0% | 0us | `async #tryInitSessionFileFromSidecar` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7311` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `#readSessionCommitContents` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `pop` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/ProxyTracerProvider.js:9` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:31` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `inspectTranscriptBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.0ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:339` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:707` |
| 0.0% | 1.0ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:170` |
| 0.0% | 1.0ms | 0.0% | 0us | `ZodArray` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:83` |
| 0.0% | 1.0ms | 0.0% | 0us | `_array` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:712` |
| 0.0% | 1.0ms | 0.0% | 0us | `openVerifiedResidentCacheInstanceDir` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:607` |
| 0.0% | 1.0ms | 0.0% | 0us | `statSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1610` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `statSync` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:905` |
| 0.0% | 1.0ms | 0.0% | 0us | `getSessionMemoryStats` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:14097` |
| 0.0% | 1.0ms | 0.0% | 0us | `#prepareResidentTextStoreTransition` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6898` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `#preparedResidentTransitionFromSource` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/lib/index.js:24` |
| 0.0% | 1.0ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8094` |
| 0.0% | 1.0ms | 0.0% | 0us | `append` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:825` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `computeTailRecordChecksum` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1557` |
| 0.0% | 982us | 0.0% | 982us | `Set` | `[native code]` |
| 0.0% | 982us | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:1683` |
| 0.0% | 982us | 0.0% | 0us | `ZodLiteral` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.0% | 982us | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/openai-chat-server-schema.ts:151` |
| 0.0% | 982us | 0.0% | 0us | `literal` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1043` |
| 0.0% | 982us | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1029` |

## Function Details

### `update`
`[native code]` | Self: 30.7% (1.36s) | Total: 30.7% (1.36s) | Samples: 1066

**Called by:**
- `computeLineDigest` (289)
- `updateBoundedTranscriptHash` (259)
- `#validateColdBase` (252)
- `inspectTranscriptBounded` (248)
- `#buildBoundedFirstOpenSidecars` (17)
- `(anonymous)` (1)

### `gc`
`[native code]` | Self: 27.5% (1.22s) | Total: 27.5% (1.22s) | Samples: 962

**Called by:**
- `#validateColdBase` (420)
- `inspectTranscriptBounded` (418)
- `recordFirstOpenGcRequest` (84)
- `memorySample` (22)
- `async settledMemorySample` (18)

### `openSync`
`[native code]` | Self: 9.6% (425.6ms) | Total: 15.9% (705.3ms) | Samples: 330

**Called by:**
- `readRangeSync` (328)
- `openSync` (217)
- `createFileCommitMarkerCheckedSync` (1)
- `openVerifiedResidentCacheDirectory` (1)

**Calls:**
- `openSync` (217)

### `readSync`
`[native code]` | Self: 6.0% (266.6ms) | Total: 6.0% (266.6ms) | Samples: 207

**Called by:**
- `readRangeSync` (141)
- `scanTranscriptLinesBounded` (66)

### `write`
`[native code]` | Self: 3.2% (145.2ms) | Total: 3.2% (145.2ms) | Samples: 114

**Called by:**
- `async (anonymous)` (114)

### `stringSplitFast`
`[native code]` | Self: 3.1% (139.3ms) | Total: 3.1% (139.3ms) | Samples: 109

**Called by:**
- `inspectTranscriptBounded` (109)

### `parse`
`[native code]` | Self: 2.7% (123.1ms) | Total: 2.7% (123.1ms) | Samples: 97

**Called by:**
- `(anonymous)` (55)
- `inspectTranscriptBounded` (42)

### `Readable`
`internal:streams/readable` | Self: 2.7% (121.9ms) | Total: 2.7% (121.9ms) | Samples: 1

**Called by:**
- `ReadStream` (1)

### `byteLength`
`[native code]` | Self: 2.0% (92.9ms) | Total: 2.0% (92.9ms) | Samples: 71

**Called by:**
- `async generateTranscript` (52)
- `async (anonymous)` (19)

### `stringify`
`[native code]` | Self: 2.0% (90.9ms) | Total: 2.0% (90.9ms) | Samples: 70

**Called by:**
- `serialize` (66)
- `(anonymous)` (4)

### `anonymous`
`[native code]` | Self: 1.2% (56.1ms) | Total: 2.4% (107.2ms) | Samples: 13

**Called by:**
- `require` (39)
- `node:crypto` (2)
- `node:util` (1)
- `node:stream` (1)
- `get ReadStream` (1)
- `node:fs/promises` (1)
- `internal:stream` (1)
- `internal:streams/transform` (1)
- `internal:fs/streams` (1)
- `internal:streams/duplex` (1)
- `node:assert/strict` (1)
- `internal:util/inspect` (1)
- `internal:streams/lazy_transform` (1)

**Calls:**
- `(anonymous)` (7)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `internal:stream` (1)
- `internal:streams/operators` (1)
- `internal:streams/transform` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:streams/duplex` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:util/inspect` (1)
- `node:stream` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:fs/streams` (1)
- `(anonymous)` (1)
- `node:assert` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:streams/lazy_transform` (1)

### `error`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/locales/en.js` | Self: 1.1% (49.3ms) | Total: 1.1% (49.3ms) | Samples: 1

**Called by:**
- `en_default` (1)

### `fstatSync`
`[native code]` | Self: 1.0% (46.3ms) | Total: 1.7% (76.9ms) | Samples: 36

**Called by:**
- `fstatSync` (24)
- `readRangeSync` (22)
- `readRangeSync` (14)

**Calls:**
- `fstatSync` (24)

### `toString`
`[native code]` | Self: 0.9% (42.2ms) | Total: 0.9% (42.2ms) | Samples: 34

**Called by:**
- `(anonymous)` (34)

### `lstatSync`
`[native code]` | Self: 0.8% (35.6ms) | Total: 1.3% (59.7ms) | Samples: 28

**Called by:**
- `readRangeSync` (28)
- `lstatSync` (19)

**Calls:**
- `lstatSync` (19)

### `closeSync`
`[native code]` | Self: 0.6% (30.1ms) | Total: 1.1% (49.9ms) | Samples: 23

**Called by:**
- `readRangeSync` (22)
- `closeSync` (15)
- `scanTranscriptLinesBounded` (1)

**Calls:**
- `closeSync` (15)

### `alloc`
`[native code]` | Self: 0.5% (24.2ms) | Total: 0.5% (24.2ms) | Samples: 18

**Called by:**
- `readRangeSync` (18)

### `decode`
`[native code]` | Self: 0.4% (21.1ms) | Total: 0.4% (21.1ms) | Samples: 17

**Called by:**
- `inspectTranscriptBounded` (17)

### `copy`
`[native code]` | Self: 0.4% (18.2ms) | Total: 0.4% (18.2ms) | Samples: 14

**Called by:**
- `consume` (9)
- `consume` (4)
- `ensureCapacity` (1)

### `indexOf`
`[native code]` | Self: 0.3% (15.9ms) | Total: 0.3% (15.9ms) | Samples: 12

**Called by:**
- `consume` (12)

### `dlopen`
`[native code]` | Self: 0.1% (6.3ms) | Total: 0.1% (6.3ms) | Samples: 5

**Called by:**
- `(anonymous)` (5)

### `isFile`
`[native code]` | Self: 0.1% (4.9ms) | Total: 0.1% (4.9ms) | Samples: 4

**Called by:**
- `readRangeSync` (3)
- `readRangeSync` (1)

### `statFromNode`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:109` | Self: 0.0% (4.2ms) | Total: 0.0% (4.2ms) | Samples: 3

**Called by:**
- `readRangeSync` (3)

### `matches`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/provider-models/openai-compat.ts:2185` | Self: 0.0% (2.8ms) | Total: 0.0% (2.8ms) | Samples: 1

**Called by:**
- `resolveApiByRules` (1)

### `from`
`[native code]` | Self: 0.0% (2.7ms) | Total: 33.1% (1.46s) | Samples: 2

**Called by:**
- `async runWorker` (1153)
- `(module)` (2)

**Calls:**
- `async openNext` (1153)

### `createToJSONSchemaMethod`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/to-json-schema.js:436` | Self: 0.0% (2.5ms) | Total: 0.0% (2.5ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `spawnSync`
`[native code]` | Self: 0.0% (2.2ms) | Total: 0.0% (2.2ms) | Samples: 2

**Called by:**
- `residentCacheProcessStartTimeMs` (2)

### `memoryUsage`
`[native code]` | Self: 0.0% (1.7ms) | Total: 0.0% (1.7ms) | Samples: 1

**Called by:**
- `residentProcessBytes` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:322` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `decodeBase64`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/internal/decode-shared.js:24` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `#createDictionaryFlushTarget`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:11118` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `#buildBoundedFirstOpenSidecars` (1)

### `readRangeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1571` | Self: 0.0% (1.5ms) | Total: 0.4% (19.6ms) | Samples: 1

**Called by:**
- `inspectTranscriptBounded` (9)
- `#validateColdBase` (6)

**Calls:**
- `fstatSync` (14)

### `initLoaderContext`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:466` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `loadNative` (1)

### `assign`
`[native code]` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `node:assert` (1)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1571` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (1)

### `checkRevision`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `template` (1)

### `channel`
`node:diagnostics_channel` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `Hash`
`[native code]` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `Hash` (1)

### `setPrototypeDirectOrThrow`
`[native code]` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `internal:streams/operators` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1484` | Self: 0.0% (1.4ms) | Total: 0.3% (17.4ms) | Samples: 1

**Called by:**
- `scanTranscriptLinesBounded` (13)

**Calls:**
- `indexOf` (12)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1564` | Self: 0.0% (1.4ms) | Total: 19.3% (856.9ms) | Samples: 1

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (676)
- `#buildBoundedFirstOpenSidecars` (1)

**Calls:**
- `consume` (648)
- `consume` (13)
- `consume` (9)
- `consume` (4)
- `consume` (1)
- `consume` (1)

### `#validateColdBase`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12049` | Self: 0.0% (1.4ms) | Total: 15.4% (684.2ms) | Samples: 1

**Called by:**
- `#classifySidecarReopen` (528)

**Calls:**
- `update` (252)
- `readRangeSync` (152)
- `readRangeSync` (66)
- `readRangeSync` (15)
- `readRangeSync` (13)
- `readRangeSync` (11)
- `readRangeSync` (9)
- `readRangeSync` (6)
- `readRangeSync` (2)
- `readRangeSync` (1)

### `#disposableSidecarPaths`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `getSessionMemoryStats` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:1249` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

### `shift`
`[native code]` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `accept` (1)

### `allocUnsafe`
`[native code]` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `scanTranscriptLinesBounded` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `applyOwnerOnlyPathSecurity`
`[native code]` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `secureOwnerOnlyFileDescriptor` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7854` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `consume` (1)

### `inspectTranscriptBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3635` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `async open` (1)

### `(anonymous)`
`[native code]` | Self: 0.0% (1.4ms) | Total: 97.3% (4.31s) | Samples: 1

**Called by:**
- `processTicksAndRejections` (3262)
- `require` (6)
- `(anonymous)` (6)
- `bound require` (5)
- `(anonymous)` (1)

**Calls:**
- `async #initSessionFile` (1804)
- `async runWorker` (1153)
- `async generateTranscript` (133)
- `async generateTranscript` (65)
- `async generateTranscript` (52)
- `async settledMemorySample` (18)
- `memorySample` (17)
- `(anonymous)` (6)
- `(module)` (6)
- `async runWorker` (5)
- `dlopen` (5)
- `async #tryBoundedFirstOpen` (4)
- `ReadStream` (1)
- `async runWorker` (1)
- `async generateTranscript` (1)
- `async generateTranscript` (1)
- `async generateTranscript` (1)
- `async sweepResidentCacheRoot` (1)
- `async runWorker` (1)
- `async runWorker` (1)
- `async close` (1)
- `async open` (1)
- `Buffer` (1)
- `async runWorker` (1)

### `at`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `summarize` (1)

### `Segmenter`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `compileChildren`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:834` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `compile` (1)

### `async #tryInitSessionFileFromSidecar`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `async #tryInitSessionFileFromSidecar` (1)

### `#entryForProviderContext`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `map` (1)

### `bigint`
`[native code]` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `recordFirstOpenGcRequest` (1)

### `subarray`
`[native code]` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `consume` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:19` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `init` (1)

### `mapStainlessArch`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/anthropic.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `#validateColdBase`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12055` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `#classifySidecarReopen` (1)

### `get buffer`
`[native code]` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `decodeBoundedJsonLine` (1)

### `shift`
`internal:fixed_queue` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `shift` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:12` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `init` (1)

### `isProviderStateEntry`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1056` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `providerStateEntryKey` (1)

### `inspectTranscriptBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3641` | Self: 0.0% (1.1ms) | Total: 0.0% (2.2ms) | Samples: 1

**Called by:**
- `async open` (2)

**Calls:**
- `pop` (1)

### `Buffer`
`[native code]` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `readSync`
`node:fs:288` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `readRangeSync` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7734` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `consume` (1)

### `normalizeParams`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:268` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `object` (1)

### `RegExp`
`[native code]` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `getRegex` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:204` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `init` (1)

### `disposeVerifiedResidentCacheInstanceDir`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:434` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `dispose` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/lru-cache/dist/esm/node/index.js:189` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `LRUCache` (1)

### `#readSessionCommitContents`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `async #tryInitSessionFileFromSidecar` (1)

### `pop`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `inspectTranscriptBounded` (1)

### `inspectTranscriptBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `async open` (1)

### `serialize`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:301` | Self: 0.0% (1.0ms) | Total: 1.9% (86.9ms) | Samples: 1

**Called by:**
- `async generateTranscript` (65)
- `async generateTranscript` (1)
- `async generateTranscript` (1)

**Calls:**
- `stringify` (66)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:83` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `init` (1)

### `inspectTranscriptBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3636` | Self: 0.0% (1.0ms) | Total: 8.9% (394.7ms) | Samples: 1

**Called by:**
- `async open` (306)

**Calls:**
- `readRangeSync` (174)
- `readRangeSync` (75)
- `readRangeSync` (13)
- `readRangeSync` (11)
- `readRangeSync` (9)
- `readRangeSync` (9)
- `readRangeSync` (9)
- `readRangeSync` (2)
- `readRangeSync` (1)
- `readRangeSync` (1)
- `readRangeSync` (1)

### `mkdtempSync`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (2.0ms) | Samples: 1

**Called by:**
- `mkdtempSync` (1)
- `openVerifiedResidentCacheInstanceDir` (1)

**Calls:**
- `mkdtempSync` (1)

### `statSync`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `statSync` (1)

### `#preparedResidentTransitionFromSource`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `#prepareResidentTextStoreTransition` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/lib/index.js:24` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `anonymous` (1)

### `computeTailRecordChecksum`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `append` (1)

### `readRangeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1557` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `inspectTranscriptBounded` (1)

### `Set`
`[native code]` | Self: 0.0% (982us) | Total: 0.0% (982us) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/lib/source-map-generator.js:8` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17265` | Self: 0.0% (0us) | Total: 32.7% (1.45s) | Samples: 0

**Called by:**
- `async open` (1144)

**Calls:**
- `inspectTranscriptBounded` (418)
- `inspectTranscriptBounded` (306)
- `inspectTranscriptBounded` (248)
- `inspectTranscriptBounded` (109)
- `inspectTranscriptBounded` (42)
- `inspectTranscriptBounded` (17)
- `inspectTranscriptBounded` (2)
- `inspectTranscriptBounded` (1)
- `inspectTranscriptBounded` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:734` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `(anonymous)` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:885` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `async measurePhase` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/tui/src/utils.ts:173` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Calls:**
- `Segmenter` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:259` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `openVerifiedResidentCacheInstanceDir`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:621` | Self: 0.0% (0us) | Total: 0.0% (2.2ms) | Samples: 0

**Called by:**
- `#newResidentTextStoreCandidate` (2)

**Calls:**
- `writeResidentCacheOwnerToken` (2)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:170` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Calls:**
- `_array` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17249` | Self: 0.0% (0us) | Total: 33.0% (1.46s) | Samples: 0

**Called by:**
- `async (anonymous)` (1153)

**Calls:**
- `async open` (1144)
- `async open` (7)
- `async open` (2)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/utils.ts:185` | Self: 0.0% (0us) | Total: 0.2% (11.6ms) | Samples: 0

**Calls:**
- `render` (9)

### `recordFirstOpenGcRequest`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6483` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (1)

**Calls:**
- `bigint` (1)

### `get ReadStream`
`node:fs:578` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `#scanBoundedTranscriptForFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7715` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `openFirstOpenSidecarWriter` (1)

### `Hash`
`node:crypto:178` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `createHash` (1)

**Calls:**
- `Hash` (1)

### `async #tryInitSessionFileFromSidecar`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7311` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `async #tryInitSessionFileFromSidecar` (1)

**Calls:**
- `#readSessionCommitContents` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.runtime.js:31` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:18` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `secureOwnerOnlyFileDescriptor`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:662` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `FileSessionStorageWriter` (1)

**Calls:**
- `applyOwnerOnlyPathSecurity` (1)

### `bound optional`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (2.5ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `optional` (1)

### `async #initSessionFile`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8229` | Self: 0.0% (0us) | Total: 52.1% (2.31s) | Samples: 0

**Called by:**
- `(anonymous)` (1804)

**Calls:**
- `async #tryBoundedFirstOpen` (1804)

### `ZodNumber`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `_number` (1)

**Calls:**
- `init` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js:15` | Self: 0.0% (0us) | Total: 0.0% (2.4ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/provider-models/openai-compat.ts:2723` | Self: 0.0% (0us) | Total: 0.0% (2.8ms) | Samples: 0

**Calls:**
- `map` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:8` | Self: 0.0% (0us) | Total: 0.0% (3.8ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7595` | Self: 0.0% (0us) | Total: 0.0% (4.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `#prepareResidentTextStoreTransition` (3)
- `#prepareResidentTextStoreTransition` (1)

### `inspectTranscriptBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3652` | Self: 0.0% (0us) | Total: 11.9% (527.7ms) | Samples: 0

**Called by:**
- `async open` (418)

**Calls:**
- `gc` (418)

### `ZodLiteral`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.0% (982us) | Samples: 0

**Called by:**
- `literal` (1)

**Calls:**
- `init` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/base.js:15` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `openFirstOpenSidecarWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6507` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (1)

**Calls:**
- `openBufferedWriter` (1)

### `getHandlebars`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:237` | Self: 0.0% (0us) | Total: 0.2% (10.1ms) | Samples: 0

**Called by:**
- `compile` (8)

**Calls:**
- `bound require` (8)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/openai-responses-server-schema.ts:97` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Calls:**
- `_string` (1)

### `accept`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/visitor.js:72` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `compileInput` (1)

**Calls:**
- `(anonymous)` (1)

### `#newResidentTextStoreCandidate`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6819` | Self: 0.0% (0us) | Total: 0.0% (3.3ms) | Samples: 0

**Called by:**
- `#prepareResidentTextStoreTransition` (3)

**Calls:**
- `openVerifiedResidentCacheInstanceDir` (2)
- `openVerifiedResidentCacheInstanceDir` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:22` | Self: 0.0% (0us) | Total: 0.0% (3.8ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `readRangeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1579` | Self: 0.0% (0us) | Total: 0.6% (28.9ms) | Samples: 0

**Called by:**
- `#validateColdBase` (13)
- `inspectTranscriptBounded` (9)

**Calls:**
- `closeSync` (22)

### `init`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:22` | Self: 0.0% (0us) | Total: 0.4% (18.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)
- `ZodString` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `ZodNumber` (1)
- `ZodCustom` (1)
- `ZodOptional` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `ZodArray` (1)
- `ZodLiteral` (1)

**Calls:**
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `summarize`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:226` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `async runWorker` (1)

**Calls:**
- `at` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:869` | Self: 0.0% (0us) | Total: 33.0% (1.46s) | Samples: 0

**Called by:**
- `(anonymous)` (1153)

**Calls:**
- `from` (1153)

### `loadNative`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:544` | Self: 0.0% (0us) | Total: 0.1% (6.3ms) | Samples: 0

**Called by:**
- `(module)` (5)

**Calls:**
- `loadFromCandidates` (5)

### `bound require`
`[native code]` | Self: 0.0% (0us) | Total: 2.1% (95.1ms) | Samples: 0

**Called by:**
- `getHandlebars` (8)
- `(anonymous)` (7)
- `canonicalizeTrustedPath` (7)
- `loadFromCandidates` (5)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `require` (45)
- `(anonymous)` (5)

### `render`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:493` | Self: 0.0% (0us) | Total: 0.3% (14.4ms) | Samples: 0

**Called by:**
- `(module)` (9)
- `(module)` (2)

**Calls:**
- `compile` (8)
- `ret` (3)

### `canonicalizeTrustedPath`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/managed-session-scope.ts:406` | Self: 0.0% (0us) | Total: 0.2% (9.1ms) | Samples: 0

**Called by:**
- `async open` (7)

**Calls:**
- `bound require` (7)

### `optional`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1110` | Self: 0.0% (0us) | Total: 0.0% (2.5ms) | Samples: 0

**Called by:**
- `optional` (1)

**Calls:**
- `ZodOptional` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7565` | Self: 0.0% (0us) | Total: 23.8% (1.05s) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (831)

**Calls:**
- `#scanBoundedTranscriptForFirstOpen` (830)
- `#scanBoundedTranscriptForFirstOpen` (1)

### `async close`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:13921` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `#releaseResidentTextStore` (1)

### `internal:streams/operators`
`internal:streams/operators:130` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `setPrototypeDirectOrThrow` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/anthropic-messages-server-schema.ts:63` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Calls:**
- `object` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7760` | Self: 0.0% (0us) | Total: 0.1% (5.0ms) | Samples: 0

**Called by:**
- `consume` (4)

**Calls:**
- `stringify` (4)

### `createSessionCommitMarkerCheckedSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:775` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `createFileCommitMarkerCheckedSync` (1)

### `compileInput`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:510` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `ret` (1)

**Calls:**
- `compile` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:339` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `serialize` (1)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 94.1% (4.17s) | Samples: 0

**Calls:**
- `(anonymous)` (3262)
- `shift` (1)

### `#validateColdBase`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12050` | Self: 0.0% (0us) | Total: 12.0% (533.3ms) | Samples: 0

**Called by:**
- `#classifySidecarReopen` (420)

**Calls:**
- `gc` (420)

### `internal:util/inspect`
`internal:util/inspect:2` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `statSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1610` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `getSessionMemoryStats` (1)

**Calls:**
- `statSync` (1)

### `ensureCapacity`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1476` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `consume` (1)

**Calls:**
- `copy` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:770` | Self: 0.0% (0us) | Total: 0.0% (2.7ms) | Samples: 0

**Calls:**
- `render` (2)

### `accept`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/visitor.js:74` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `shift` (1)

### `loadFromCandidates`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:215` | Self: 0.0% (0us) | Total: 0.1% (6.3ms) | Samples: 0

**Called by:**
- `loadNative` (5)

**Calls:**
- `bound require` (5)

### `append`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:825` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `#buildBoundedFirstOpenSidecars` (1)

**Calls:**
- `computeTailRecordChecksum` (1)

### `inspectTranscriptBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3644` | Self: 0.0% (0us) | Total: 1.1% (52.6ms) | Samples: 0

**Called by:**
- `async open` (42)

**Calls:**
- `parse` (42)

### `readRangeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1562` | Self: 0.0% (0us) | Total: 0.0% (3.8ms) | Samples: 0

**Called by:**
- `inspectTranscriptBounded` (2)
- `#validateColdBase` (1)

**Calls:**
- `isFile` (3)

### `compile`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:99` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `compileInput` (1)

**Calls:**
- `compileChildren` (1)

### `compile`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:485` | Self: 0.0% (0us) | Total: 0.2% (10.1ms) | Samples: 0

**Called by:**
- `render` (8)

**Calls:**
- `getHandlebars` (8)

### `async #tryInitSessionFileFromSidecar`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7289` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `async #initSessionFile` (2)

**Calls:**
- `async #tryInitSessionFileFromSidecar` (1)
- `async #tryInitSessionFileFromSidecar` (1)

### `internal:fs/streams`
`internal:fs/streams:2` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `readRangeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1564` | Self: 0.0% (0us) | Total: 0.5% (24.2ms) | Samples: 0

**Called by:**
- `#validateColdBase` (9)
- `inspectTranscriptBounded` (9)

**Calls:**
- `alloc` (18)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1581` | Self: 0.0% (0us) | Total: 2.4% (110.4ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (86)

**Calls:**
- `recordFirstOpenGcRequest` (84)
- `recordFirstOpenGcRequest` (1)
- `recordFirstOpenGcRequest` (1)

### `openBufferedWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1757` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `openFirstOpenSidecarWriter` (1)

**Calls:**
- `FileSessionStorageWriter` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/generated/decode-data-html.js:3` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Calls:**
- `decodeBase64` (1)

### `refine`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:116` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `bound refine` (1)

**Calls:**
- `_refine` (1)

### `ZodString`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `_string` (1)

**Calls:**
- `init` (1)

### `#scanBoundedTranscriptForFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7716` | Self: 0.0% (0us) | Total: 23.8% (1.05s) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (830)

**Calls:**
- `scanTranscriptLinesBounded` (676)
- `scanTranscriptLinesBounded` (86)
- `scanTranscriptLinesBounded` (66)
- `scanTranscriptLinesBounded` (1)
- `scanTranscriptLinesBounded` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7772` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `consume` (1)

**Calls:**
- `update` (1)

### `#disposeResidentTextStore`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7012` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `#releaseResidentTextStore` (1)

**Calls:**
- `dispose` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/tui/src/components/markdown.ts:49` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Calls:**
- `LRUCache` (1)

### `inspectTranscriptBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3638` | Self: 0.0% (0us) | Total: 0.4% (21.1ms) | Samples: 0

**Called by:**
- `async open` (17)

**Calls:**
- `decode` (17)

### `dispose`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:1234` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `#disposeResidentTextStore` (1)

**Calls:**
- `disposeVerifiedResidentCacheInstanceDir` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/anthropic.ts:637` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Calls:**
- `mapStainlessArch` (1)

### `ret`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:517` | Self: 0.0% (0us) | Total: 0.0% (4.2ms) | Samples: 0

**Called by:**
- `render` (3)

**Calls:**
- `template` (1)
- `compileInput` (1)
- `compileInput` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/lib/index.js:8` | Self: 0.0% (0us) | Total: 0.2% (9.1ms) | Samples: 0

**Called by:**
- `anonymous` (7)

**Calls:**
- `bound require` (7)

### `createHash`
`node:crypto:201` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `computeLineDigest` (1)

**Calls:**
- `Hash` (1)

### `#withSessionPersistenceFenceSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:9924` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `(anonymous)` (1)

### `updateBoundedTranscriptHash`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1396` | Self: 0.0% (0us) | Total: 7.3% (327.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (259)

**Calls:**
- `update` (259)

### `internal:streams/transform`
`internal:streams/transform:2` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17263` | Self: 0.0% (0us) | Total: 0.2% (9.1ms) | Samples: 0

**Called by:**
- `async open` (7)

**Calls:**
- `canonicalizeTrustedPath` (7)

### `readRangeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1559` | Self: 0.0% (0us) | Total: 9.5% (423.0ms) | Samples: 0

**Called by:**
- `inspectTranscriptBounded` (174)
- `#validateColdBase` (152)
- `#readSessionCommitContents` (1)
- `#coldIndexDigestValid` (1)

**Calls:**
- `openSync` (328)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7726` | Self: 0.0% (0us) | Total: 2.5% (113.9ms) | Samples: 0

**Called by:**
- `consume` (90)

**Calls:**
- `parse` (55)
- `toString` (34)
- `decodeBoundedJsonLine` (1)

### `async write`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:303` | Self: 0.0% (0us) | Total: 3.8% (170.3ms) | Samples: 0

**Called by:**
- `async generateTranscript` (133)

**Calls:**
- `async (anonymous)` (114)
- `async (anonymous)` (19)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17291` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `async open` (2)

**Calls:**
- `async #initSessionFile` (2)

### `LRUCache`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/lru-cache/dist/esm/node/index.js:279` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `(anonymous)` (1)

### `ZodArray`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `_array` (1)

**Calls:**
- `init` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1486` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (1)

**Calls:**
- `subarray` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/usage.ts:83` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Calls:**
- `_number` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:64` | Self: 0.0% (0us) | Total: 0.0% (2.5ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `createToJSONSchemaMethod` (1)

### `bound refine`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `refine` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1326` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:488` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `async measurePhase`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:579` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `async runWorker` (1)

**Calls:**
- `async measurePhase` (1)

### `inspectTranscriptBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3640` | Self: 0.0% (0us) | Total: 3.1% (139.3ms) | Samples: 0

**Called by:**
- `async open` (109)

**Calls:**
- `stringSplitFast` (109)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7573` | Self: 0.0% (0us) | Total: 0.7% (32.8ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (22)

**Calls:**
- `#buildBoundedFirstOpenSidecars` (17)
- `#buildBoundedFirstOpenSidecars` (2)
- `#buildBoundedFirstOpenSidecars` (1)
- `#buildBoundedFirstOpenSidecars` (1)
- `#buildBoundedFirstOpenSidecars` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7722` | Self: 0.0% (0us) | Total: 7.3% (327.6ms) | Samples: 0

**Called by:**
- `consume` (259)

**Calls:**
- `updateBoundedTranscriptHash` (259)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1508` | Self: 0.0% (0us) | Total: 0.1% (5.1ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (4)

**Calls:**
- `copy` (4)

### `decodeBoundedJsonLine`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1373` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `get buffer` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:16` | Self: 0.0% (0us) | Total: 0.0% (3.8ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `_array`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:712` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `ZodArray` (1)

### `writeResidentCacheOwnerToken`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:314` | Self: 0.0% (0us) | Total: 0.0% (2.2ms) | Samples: 0

**Called by:**
- `openVerifiedResidentCacheInstanceDir` (2)

**Calls:**
- `residentCacheProcessStartTimeMs` (2)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:1033` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `summarize` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7973` | Self: 0.0% (0us) | Total: 0.0% (2.4ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (2)

**Calls:**
- `scanTranscriptLinesBounded` (1)
- `scanTranscriptLinesBounded` (1)

### `readRangeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1561` | Self: 0.0% (0us) | Total: 0.6% (28.2ms) | Samples: 0

**Called by:**
- `#validateColdBase` (11)
- `inspectTranscriptBounded` (11)

**Calls:**
- `fstatSync` (22)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/whitespace-control.js:28` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `accept` (1)

**Calls:**
- `accept` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:14` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Calls:**
- `getRegex` (1)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `ZodCustom`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `_refine` (1)

**Calls:**
- `init` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7964` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `#createDictionaryFlushTarget` (1)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:306` | Self: 0.0% (0us) | Total: 3.2% (145.2ms) | Samples: 0

**Called by:**
- `async write` (114)

**Calls:**
- `write` (114)

### `ReadStream`
`internal:fs/streams:86` | Self: 0.0% (0us) | Total: 2.7% (121.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `Readable` (1)

### `resolveApiByRules`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/provider-models/openai-compat.ts:2167` | Self: 0.0% (0us) | Total: 0.0% (2.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `matches` (1)

### `node:stream`
`node:stream:2` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `node:fs/promises`
`node:fs/promises:2` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/helpers.js:26` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `readResidentCacheOwnerSnapshot`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:284` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `async sweepResidentCacheRoot` (1)

**Calls:**
- `openVerifiedResidentCacheDirectory` (1)

### `createFileCommitMarkerCheckedSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:828` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `createSessionCommitMarkerCheckedSync` (1)

**Calls:**
- `openSync` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1105` | Self: 0.0% (0us) | Total: 0.0% (2.5ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `async #initSessionFile`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8224` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `async #initSessionFile` (2)

**Calls:**
- `async #tryInitSessionFileFromSidecar` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.runtime.js:12` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `internal:stream`
`internal:stream:2` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:6` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:31` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Calls:**
- `bound require` (1)

### `_refine`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:953` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `refine` (1)

**Calls:**
- `ZodCustom` (1)

### `ZodOptional`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.0% (2.5ms) | Samples: 0

**Called by:**
- `optional` (1)

**Calls:**
- `init` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:808` | Self: 0.0% (0us) | Total: 0.2% (9.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `memorySample` (5)

### `#findColdEntryIndex`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12212` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `#resolveEntry` (1)

**Calls:**
- `#coldIndexDigestValid` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:7` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8094` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `append` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:2211` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `#coldIndexDigestValid`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12158` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `#findColdEntryIndex` (1)

**Calls:**
- `readRangeSync` (1)

### `async #initSessionFile`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8216` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `async open` (2)

**Calls:**
- `async #initSessionFile` (2)

### `residentCacheProcessStartTimeMs`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:207` | Self: 0.0% (0us) | Total: 0.0% (2.2ms) | Samples: 0

**Called by:**
- `writeResidentCacheOwnerToken` (2)

**Calls:**
- `spawnSync` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7758` | Self: 0.0% (0us) | Total: 8.2% (365.2ms) | Samples: 0

**Called by:**
- `consume` (290)

**Calls:**
- `computeLineDigest` (290)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/lru-cache/dist/esm/node/diagnostics-channel.js:4` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Calls:**
- `channel` (1)

### `shift`
`internal:fixed_queue:44` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `processTicksAndRejections` (1)

**Calls:**
- `shift` (1)

### `readRangeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1577` | Self: 0.0% (0us) | Total: 0.0% (4.2ms) | Samples: 0

**Called by:**
- `#validateColdBase` (2)
- `inspectTranscriptBounded` (1)

**Calls:**
- `statFromNode` (3)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8063` | Self: 0.0% (0us) | Total: 0.6% (26.7ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (17)

**Calls:**
- `update` (17)

### `FileSessionStorageWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1015` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `openBufferedWriter` (1)

**Calls:**
- `secureOwnerOnlyFileDescriptor` (1)

### `#readSessionCommitContents`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:13225` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `#classifySidecarReopen` (1)

**Calls:**
- `readRangeSync` (1)

### `require`
`[native code]` | Self: 0.0% (0us) | Total: 2.0% (88.7ms) | Samples: 0

**Called by:**
- `bound require` (45)

**Calls:**
- `anonymous` (39)
- `(anonymous)` (6)

### `readRangeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1567` | Self: 0.0% (0us) | Total: 4.1% (182.0ms) | Samples: 0

**Called by:**
- `inspectTranscriptBounded` (75)
- `#validateColdBase` (66)
- `#buildBoundedFirstOpenSidecars` (1)

**Calls:**
- `readSync` (141)
- `readSync` (1)

### `async settledMemorySample`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:244` | Self: 0.0% (0us) | Total: 0.5% (22.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (18)

**Calls:**
- `gc` (18)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:858` | Self: 0.0% (0us) | Total: 33.0% (1.46s) | Samples: 0

**Called by:**
- `async openNext` (1153)

**Calls:**
- `async open` (1153)

### `object`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:789` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `normalizeParams` (1)

### `template`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:65` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `ret` (1)

**Calls:**
- `checkRevision` (1)

### `#getSessionContextForRead`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16237` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `buildSessionContext` (1)

**Calls:**
- `map` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:1683` | Self: 0.0% (0us) | Total: 0.0% (982us) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `Set` (1)

### `getSessionMemoryStats`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:14097` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `statSync` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/index.js:16` | Self: 0.0% (0us) | Total: 0.1% (7.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (6)

**Calls:**
- `loadNative` (5)
- `loadNative` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:25` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Calls:**
- `bound refine` (1)

### `optional`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:125` | Self: 0.0% (0us) | Total: 0.0% (2.5ms) | Samples: 0

**Called by:**
- `bound optional` (1)

**Calls:**
- `optional` (1)

### `node:util`
`node:util:2` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `readRangeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1574` | Self: 0.0% (0us) | Total: 0.8% (35.6ms) | Samples: 0

**Called by:**
- `#validateColdBase` (15)
- `inspectTranscriptBounded` (13)

**Calls:**
- `lstatSync` (28)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1492` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (1)

**Calls:**
- `ensureCapacity` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1494` | Self: 0.0% (0us) | Total: 0.2% (11.7ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (9)

**Calls:**
- `copy` (9)

### `providerStateEntryKey`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1060` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `isProviderStateEntry` (1)

### `map`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (6.6ms) | Samples: 0

**Called by:**
- `#getSessionContextForRead` (1)
- `async runWorker` (1)
- `(module)` (1)
- `async runWorker` (1)

**Calls:**
- `(anonymous)` (1)
- `getSessionMemoryStats` (1)
- `#entryForProviderContext` (1)
- `getSessionMemoryStats` (1)

### `_number`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:307` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `ZodNumber` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:707` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `memorySample`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:231` | Self: 0.0% (0us) | Total: 0.7% (31.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (17)
- `async runWorker` (5)

**Calls:**
- `gc` (22)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:331` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `serialize` (1)

### `residentProcessBytes`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6452` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `recordFirstOpenGcRequest` (1)

**Calls:**
- `memoryUsage` (1)

### `#classifySidecarReopen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:13317` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `#readSessionCommitContents` (1)

### `#classifySidecarReopen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:13321` | Self: 0.0% (0us) | Total: 27.5% (1.21s) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (949)

**Calls:**
- `#validateColdBase` (528)
- `#validateColdBase` (420)
- `#validateColdBase` (1)

### `async sweepResidentCacheRoot`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:564` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `readResidentCacheOwnerSnapshot` (1)

### `computeLineDigest`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:693` | Self: 0.0% (0us) | Total: 8.2% (365.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (290)

**Calls:**
- `update` (289)
- `createHash` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8058` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `readRangeSync` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7521` | Self: 0.0% (0us) | Total: 52.1% (2.31s) | Samples: 0

**Called by:**
- `async #initSessionFile` (1804)

**Calls:**
- `async #tryBoundedFirstOpen` (950)
- `async #tryBoundedFirstOpen` (831)
- `async #tryBoundedFirstOpen` (22)
- `async #tryBoundedFirstOpen` (1)

### `async openNext`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:852` | Self: 0.0% (0us) | Total: 33.0% (1.46s) | Samples: 0

**Called by:**
- `from` (1153)

**Calls:**
- `async (anonymous)` (1153)

### `getSessionMemoryStats`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:14094` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `#disposableSidecarPaths` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:365` | Self: 0.0% (0us) | Total: 3.8% (170.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (133)

**Calls:**
- `async write` (133)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7832` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `consume` (1)

**Calls:**
- `providerStateEntryKey` (1)

### `recordFirstOpenGcRequest`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6478` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (1)

**Calls:**
- `residentProcessBytes` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:323` | Self: 0.0% (0us) | Total: 1.9% (84.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (65)

**Calls:**
- `serialize` (65)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:507` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `#releaseResidentTextStore`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7103` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async close` (1)

**Calls:**
- `#disposeResidentTextStore` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/ProxyTracerProvider.js:9` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `_string`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:7` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `ZodString` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1029` | Self: 0.0% (0us) | Total: 0.0% (982us) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/modes/theme/theme.ts:936` | Self: 0.0% (0us) | Total: 0.0% (2.5ms) | Samples: 0

**Calls:**
- `bound optional` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7770` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `consume` (1)

**Calls:**
- `(anonymous)` (1)

### `buildSessionContext`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16194` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `#getSessionContextForRead` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7581` | Self: 0.0% (0us) | Total: 27.5% (1.22s) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (950)

**Calls:**
- `#classifySidecarReopen` (949)
- `#classifySidecarReopen` (1)

### `node:assert/strict`
`node:assert/strict:3` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `inspectTranscriptBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3637` | Self: 0.0% (0us) | Total: 7.0% (312.9ms) | Samples: 0

**Called by:**
- `async open` (248)

**Calls:**
- `update` (248)

### `#prepareResidentTextStoreTransition`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6897` | Self: 0.0% (0us) | Total: 0.0% (3.3ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (3)

**Calls:**
- `#newResidentTextStoreCandidate` (3)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `assign` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/openai-chat-server-schema.ts:151` | Self: 0.0% (0us) | Total: 0.0% (982us) | Samples: 0

**Calls:**
- `literal` (1)

### `recordFirstOpenGcRequest`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6485` | Self: 0.0% (0us) | Total: 2.4% (107.4ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (84)

**Calls:**
- `gc` (84)

### `openVerifiedResidentCacheInstanceDir`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:607` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `#newResidentTextStoreCandidate` (1)

**Calls:**
- `mkdtempSync` (1)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1560` | Self: 0.0% (0us) | Total: 1.9% (85.7ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (66)

**Calls:**
- `readSync` (66)

### `async measurePhase`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:582` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `async measurePhase` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:728` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1498` | Self: 0.0% (0us) | Total: 18.4% (818.5ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (648)

**Calls:**
- `(anonymous)` (290)
- `(anonymous)` (259)
- `(anonymous)` (90)
- `(anonymous)` (4)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17292` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `buildSessionContext` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7580` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `#withSessionPersistenceFenceSync` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:887` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `async measurePhase` (1)

**Calls:**
- `getEntry` (1)

### `loadNative`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:533` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `initLoaderContext` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` | Self: 0.0% (0us) | Total: 0.0% (2.7ms) | Samples: 0

**Calls:**
- `from` (2)

### `getEntry`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:15951` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `#resolveEntry` (1)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1615` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `#buildBoundedFirstOpenSidecars` (1)

**Calls:**
- `closeSync` (1)

### `compileInput`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:508` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `ret` (1)

**Calls:**
- `accept` (1)

### `node:crypto`
`node:crypto:2` | Self: 0.0% (0us) | Total: 0.2% (10.2ms) | Samples: 0

**Calls:**
- `anonymous` (2)

### `en_default`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/locales/en.js:111` | Self: 0.0% (0us) | Total: 1.1% (49.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `error` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:20` | Self: 0.0% (0us) | Total: 0.7% (32.2ms) | Samples: 0

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10322` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `#withSessionPersistenceFenceSync` (1)

**Calls:**
- `createSessionCommitMarkerCheckedSync` (1)

### `literal`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1043` | Self: 0.0% (0us) | Total: 0.0% (982us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `ZodLiteral` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:879` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `map` (1)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1557` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (1)

**Calls:**
- `allocUnsafe` (1)

### `#resolveEntry`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12475` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `getEntry` (1)

**Calls:**
- `#findColdEntryIndex` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/external.js:10` | Self: 0.0% (0us) | Total: 1.1% (49.3ms) | Samples: 0

**Calls:**
- `en_default` (1)

### `openVerifiedResidentCacheDirectory`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:178` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `readResidentCacheOwnerSnapshot` (1)

**Calls:**
- `openSync` (1)

### `getRegex`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:13` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `RegExp` (1)

### `readRangeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1575` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `inspectTranscriptBounded` (1)

**Calls:**
- `isFile` (1)

### `#prepareResidentTextStoreTransition`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6898` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `#preparedResidentTransitionFromSource` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/provider-models/openai-compat.ts:2671` | Self: 0.0% (0us) | Total: 0.0% (2.8ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `resolveApiByRules` (1)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:305` | Self: 0.0% (0us) | Total: 0.5% (25.0ms) | Samples: 0

**Called by:**
- `async write` (19)

**Calls:**
- `byteLength` (19)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:14` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:905` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `map` (1)

### `internal:streams/lazy_transform`
`internal:streams/lazy_transform:2` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:348` | Self: 0.0% (0us) | Total: 1.5% (67.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (52)

**Calls:**
- `byteLength` (52)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 94.7% | 4.19s | `[native code]` |
| 2.7% | 121.9ms | `internal:streams/readable` |
| 1.1% | 49.3ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/locales/en.js` |
| 0.5% | 23.1ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.1% | 6.8ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts` |
| 0.0% | 2.8ms | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/provider-models/openai-compat.ts` |
| 0.0% | 2.6ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.0% | 2.5ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/to-json-schema.js` |
| 0.0% | 2.5ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts` |
| 0.0% | 2.3ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js` |
| 0.0% | 2.1ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js` |
| 0.0% | 1.5ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/internal/decode-shared.js` |
| 0.0% | 1.5ms | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js` |
| 0.0% | 1.5ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js` |
| 0.0% | 1.5ms | `node:diagnostics_channel` |
| 0.0% | 1.4ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js` |
| 0.0% | 1.3ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js` |
| 0.0% | 1.2ms | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/anthropic.ts` |
| 0.0% | 1.1ms | `internal:fixed_queue` |
| 0.0% | 1.1ms | `node:fs` |
| 0.0% | 1.1ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js` |
| 0.0% | 1.0ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/lru-cache/dist/esm/node/index.js` |
| 0.0% | 1.0ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/lib/index.js` |
| 0.0% | 1.0ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts` |
