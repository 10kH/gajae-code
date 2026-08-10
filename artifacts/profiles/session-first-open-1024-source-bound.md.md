# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 1.64s | 1088 | 1.0ms | 294 |

**Top 10:** `update` 44.4%, `DirResolver` 8.8%, `write` 8.3%, `stringify` 5.8%, `gc` 4.8%, `byteLength` 4.6%, `readSync` 4.4%, `parse` 3.4%, `anonymous` 2.8%, `[Symbol.match]` 1.9%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 44.4% | 731.5ms | 44.4% | 731.5ms | `update` | `[native code]` |
| 8.8% | 145.8ms | 8.8% | 145.8ms | `DirResolver` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/dirs.ts` |
| 8.3% | 136.8ms | 8.3% | 136.8ms | `write` | `[native code]` |
| 5.8% | 95.6ms | 5.8% | 95.6ms | `stringify` | `[native code]` |
| 4.8% | 80.2ms | 4.8% | 80.2ms | `gc` | `[native code]` |
| 4.6% | 77.0ms | 4.6% | 77.0ms | `byteLength` | `[native code]` |
| 4.4% | 73.4ms | 4.4% | 73.4ms | `readSync` | `[native code]` |
| 3.4% | 55.9ms | 3.4% | 55.9ms | `parse` | `[native code]` |
| 2.8% | 46.3ms | 17.8% | 293.0ms | `anonymous` | `[native code]` |
| 1.9% | 31.3ms | 1.9% | 31.3ms | `[Symbol.match]` | `[native code]` |
| 1.8% | 29.9ms | 1.8% | 29.9ms | `toString` | `[native code]` |
| 1.1% | 19.2ms | 1.1% | 19.2ms | `bound writeFast` | `[native code]` |
| 0.7% | 12.1ms | 0.7% | 12.1ms | `indexOf` | `[native code]` |
| 0.5% | 9.1ms | 0.5% | 9.1ms | `copy` | `[native code]` |
| 0.5% | 8.8ms | 0.5% | 8.8ms | `internal:streams/destroy` | `internal:streams/destroy:16` |
| 0.3% | 6.1ms | 0.3% | 6.1ms | `dlopen` | `[native code]` |
| 0.3% | 4.9ms | 0.3% | 4.9ms | `spawnSync` | `[native code]` |
| 0.1% | 2.7ms | 0.2% | 4.2ms | `statSync` | `[native code]` |
| 0.1% | 2.5ms | 5.8% | 96.9ms | `serialize` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:302` |
| 0.1% | 2.4ms | 0.1% | 2.4ms | `bigint` | `[native code]` |
| 0.1% | 2.4ms | 85.8% | 1.41s | `(anonymous)` | `[native code]` |
| 0.1% | 2.3ms | 0.1% | 2.3ms | `applyOwnerOnlyPathSecurity` | `[native code]` |
| 0.1% | 2.3ms | 0.1% | 2.3ms | `RegExp` | `[native code]` |
| 0.1% | 2.3ms | 0.1% | 2.3ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7807` |
| 0.1% | 2.2ms | 0.1% | 2.2ms | `Hash` | `[native code]` |
| 0.1% | 2.2ms | 0.1% | 2.2ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/tui/src/components/input.ts:35` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `#resetSidecarRuntime` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.6ms | 0.1% | 2.8ms | `bound min` | `[native code]` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:323` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `residentizePersistedBlobRefs` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `add` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:1787` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `BoundedDictionaryArtifactBuilder` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `createFileCommitMarkerCheckedSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `digest` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `get` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:37` |
| 0.0% | 1.4ms | 0.1% | 2.8ms | `openSync` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `cpuUsage` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `materializeProviderVisibleEntrySync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.3ms | 5.3% | 88.5ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7798` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `parseIPv6Bytes` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/web/insane/url-guard.ts` |
| 0.0% | 1.3ms | 10.1% | 166.9ms | `async write` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:304` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `equals` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `anonymous` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js` |
| 0.0% | 1.3ms | 0.1% | 2.6ms | `writeSync` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `at` | `[native code]` |
| 0.0% | 1.3ms | 0.1% | 2.5ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7861` |
| 0.0% | 1.3ms | 1.1% | 18.1ms | `from` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `maybeExtractEmbeddedAddons` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:710` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `removeListener` | `node:events` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7856` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `alloc` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:58` |
| 0.0% | 1.1ms | 0.1% | 2.3ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:1662` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `#writeToKernel` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1068` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `filter` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `explicitDestination` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `#preparedResidentTransitionFromSource` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `decodeBase64` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/internal/decode-shared.js:21` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:192` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:22` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `firstOpenSecondaryArtifactMode` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `@lazy` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `disposeVerifiedResidentCacheInstanceDir` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:434` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `#readColdEntryRange` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `validateLoadedBindings` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:405` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7921` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 85.8% | 1.41s | 0.1% | 2.4ms | `(anonymous)` | `[native code]` |
| 84.3% | 1.38s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 56.2% | 924.9ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7629` |
| 56.1% | 922.3ms | 0.0% | 0us | `#scanBoundedTranscriptForFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7788` |
| 51.5% | 847.6ms | 0.0% | 0us | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1557` |
| 50.2% | 826.2ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1490` |
| 44.4% | 731.5ms | 44.4% | 731.5ms | `update` | `[native code]` |
| 21.8% | 359.9ms | 0.0% | 0us | `updateBoundedTranscriptHash` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1388` |
| 21.8% | 359.9ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7794` |
| 21.0% | 345.9ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7837` |
| 20.9% | 344.5ms | 0.0% | 0us | `computeLineDigest` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:693` |
| 17.8% | 293.0ms | 2.8% | 46.3ms | `anonymous` | `[native code]` |
| 15.2% | 251.4ms | 0.0% | 0us | `bound require` | `[native code]` |
| 14.9% | 245.2ms | 0.0% | 0us | `require` | `[native code]` |
| 10.1% | 166.9ms | 0.0% | 1.3ms | `async write` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:304` |
| 10.0% | 165.4ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:366` |
| 8.8% | 145.8ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/dirs.ts:337` |
| 8.8% | 145.8ms | 8.8% | 145.8ms | `DirResolver` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/dirs.ts` |
| 8.3% | 136.8ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:307` |
| 8.3% | 136.8ms | 8.3% | 136.8ms | `write` | `[native code]` |
| 5.8% | 96.9ms | 0.1% | 2.5ms | `serialize` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:302` |
| 5.8% | 95.6ms | 5.8% | 95.6ms | `stringify` | `[native code]` |
| 5.5% | 91.2ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:324` |
| 5.3% | 88.5ms | 0.0% | 1.3ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7798` |
| 4.8% | 80.2ms | 4.8% | 80.2ms | `gc` | `[native code]` |
| 4.6% | 77.0ms | 4.6% | 77.0ms | `byteLength` | `[native code]` |
| 4.4% | 73.4ms | 4.4% | 73.4ms | `readSync` | `[native code]` |
| 4.3% | 70.9ms | 0.0% | 0us | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1553` |
| 3.4% | 55.9ms | 3.4% | 55.9ms | `parse` | `[native code]` |
| 3.0% | 49.8ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:349` |
| 2.0% | 33.5ms | 0.0% | 0us | `memorySample` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:232` |
| 1.9% | 31.8ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7637` |
| 1.9% | 31.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/baggage/utils.js:8` |
| 1.9% | 31.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/internal/semver.js:110` |
| 1.9% | 31.3ms | 0.0% | 0us | `_makeCompatibilityCheck` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/internal/semver.js:29` |
| 1.9% | 31.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/api/diag.js:8` |
| 1.9% | 31.3ms | 1.9% | 31.3ms | `[Symbol.match]` | `[native code]` |
| 1.9% | 31.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/internal/global-utils.js:9` |
| 1.9% | 31.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:8` |
| 1.9% | 31.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/diag/ComponentLogger.js:8` |
| 1.8% | 29.9ms | 1.8% | 29.9ms | `toString` | `[native code]` |
| 1.6% | 27.2ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:306` |
| 1.6% | 26.7ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8151` |
| 1.5% | 25.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/partial-json/dist/index.js:18` |
| 1.5% | 24.6ms | 0.0% | 0us | `async settledMemorySample` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:245` |
| 1.3% | 22.0ms | 0.0% | 0us | `recordFirstOpenGcRequest` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6525` |
| 1.2% | 20.5ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:1452` |
| 1.1% | 19.2ms | 1.1% | 19.2ms | `bound writeFast` | `[native code]` |
| 1.1% | 19.2ms | 0.0% | 0us | `markedWrite` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/postmortem.ts:182` |
| 1.1% | 18.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7931` |
| 1.1% | 18.1ms | 0.0% | 1.3ms | `from` | `[native code]` |
| 0.9% | 15.9ms | 0.0% | 0us | `render` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:493` |
| 0.8% | 13.8ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:882` |
| 0.8% | 13.8ms | 0.0% | 0us | `async openNext` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:865` |
| 0.8% | 13.3ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/utils.ts:185` |
| 0.7% | 12.6ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17414` |
| 0.7% | 12.6ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:871` |
| 0.7% | 12.1ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1476` |
| 0.7% | 12.1ms | 0.7% | 12.1ms | `indexOf` | `[native code]` |
| 0.7% | 12.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/lib/index.js:8` |
| 0.7% | 12.0ms | 0.0% | 0us | `getHandlebars` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:237` |
| 0.7% | 12.0ms | 0.0% | 0us | `compile` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:485` |
| 0.6% | 10.8ms | 0.0% | 0us | `init` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:22` |
| 0.6% | 10.2ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:821` |
| 0.5% | 9.6ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17428` |
| 0.5% | 9.6ms | 0.0% | 0us | `canonicalizeTrustedPath` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/managed-session-scope.ts:406` |
| 0.5% | 9.1ms | 0.5% | 9.1ms | `copy` | `[native code]` |
| 0.5% | 8.8ms | 0.0% | 0us | `internal:streams/lazy_transform` | `internal:streams/lazy_transform:2` |
| 0.5% | 8.8ms | 0.0% | 0us | `internal:streams/transform` | `internal:streams/transform:2` |
| 0.5% | 8.8ms | 0.0% | 0us | `node:crypto` | `node:crypto:2` |
| 0.5% | 8.8ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 0.5% | 8.8ms | 0.5% | 8.8ms | `internal:streams/destroy` | `internal:streams/destroy:16` |
| 0.5% | 8.8ms | 0.0% | 0us | `internal:streams/readable` | `internal:streams/readable:2` |
| 0.5% | 8.5ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/index.js:16` |
| 0.4% | 7.2ms | 0.0% | 0us | `loadNative` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:544` |
| 0.4% | 6.5ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1500` |
| 0.3% | 6.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:8` |
| 0.3% | 6.1ms | 0.0% | 0us | `loadFromCandidates` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:215` |
| 0.3% | 6.1ms | 0.3% | 6.1ms | `dlopen` | `[native code]` |
| 0.3% | 5.7ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:332` |
| 0.3% | 5.3ms | 0.0% | 0us | `map` | `[native code]` |
| 0.3% | 4.9ms | 0.3% | 4.9ms | `spawnSync` | `[native code]` |
| 0.3% | 4.9ms | 0.0% | 0us | `residentCacheProcessStartTimeMs` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:207` |
| 0.2% | 4.2ms | 0.1% | 2.7ms | `statSync` | `[native code]` |
| 0.2% | 3.8ms | 0.0% | 0us | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1574` |
| 0.2% | 3.7ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7662` |
| 0.2% | 3.6ms | 0.0% | 0us | `node:util` | `node:util:2` |
| 0.2% | 3.5ms | 0.0% | 0us | `_enum` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1007` |
| 0.2% | 3.5ms | 0.0% | 0us | `ZodEnum` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.2% | 3.4ms | 0.0% | 0us | `node:fs/promises` | `node:fs/promises:2` |
| 0.1% | 3.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:22` |
| 0.1% | 2.8ms | 0.0% | 1.4ms | `openSync` | `[native code]` |
| 0.1% | 2.8ms | 0.0% | 1.6ms | `bound min` | `[native code]` |
| 0.1% | 2.8ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` |
| 0.1% | 2.7ms | 0.0% | 0us | `statSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1668` |
| 0.1% | 2.7ms | 0.0% | 0us | `getSessionMemoryStats` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:14256` |
| 0.1% | 2.6ms | 0.0% | 0us | `ret` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:517` |
| 0.1% | 2.6ms | 0.0% | 1.3ms | `writeSync` | `[native code]` |
| 0.1% | 2.6ms | 0.0% | 0us | `#prepareResidentTextStoreTransition` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6939` |
| 0.1% | 2.6ms | 0.0% | 0us | `#newResidentTextStoreCandidate` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6861` |
| 0.1% | 2.6ms | 0.0% | 0us | `writeResidentCacheOwnerToken` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:314` |
| 0.1% | 2.6ms | 0.0% | 0us | `openVerifiedResidentCacheInstanceDir` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:621` |
| 0.1% | 2.5ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1486` |
| 0.1% | 2.5ms | 0.0% | 0us | `#flushPending` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1080` |
| 0.1% | 2.5ms | 0.0% | 1.3ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7861` |
| 0.1% | 2.4ms | 0.0% | 0us | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1625` |
| 0.1% | 2.4ms | 0.1% | 2.4ms | `bigint` | `[native code]` |
| 0.1% | 2.3ms | 0.0% | 1.1ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:1662` |
| 0.1% | 2.3ms | 0.1% | 2.3ms | `applyOwnerOnlyPathSecurity` | `[native code]` |
| 0.1% | 2.3ms | 0.0% | 0us | `secureOwnerOnlyFileDescriptor` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:668` |
| 0.1% | 2.3ms | 0.0% | 0us | `FileSessionStorageWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1022` |
| 0.1% | 2.3ms | 0.0% | 0us | `openBufferedWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1815` |
| 0.1% | 2.3ms | 0.0% | 0us | `openFirstOpenSidecarWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6547` |
| 0.1% | 2.3ms | 0.1% | 2.3ms | `RegExp` | `[native code]` |
| 0.1% | 2.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:967` |
| 0.1% | 2.3ms | 0.0% | 0us | `cachedResidentCacheProcessStartTimeMs` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:457` |
| 0.1% | 2.3ms | 0.0% | 0us | `async sweepResidentCacheRoot` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:565` |
| 0.1% | 2.3ms | 0.0% | 0us | `residentCacheOwnerIsStale` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:469` |
| 0.1% | 2.3ms | 0.1% | 2.3ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7807` |
| 0.1% | 2.2ms | 0.1% | 2.2ms | `Hash` | `[native code]` |
| 0.1% | 2.2ms | 0.0% | 0us | `createHash` | `node:crypto:201` |
| 0.1% | 2.2ms | 0.0% | 0us | `Hash` | `node:crypto:178` |
| 0.1% | 2.2ms | 0.0% | 0us | `getEntry` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16113` |
| 0.1% | 2.2ms | 0.0% | 0us | `async measurePhase` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:595` |
| 0.1% | 2.2ms | 0.0% | 0us | `async measurePhase` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:592` |
| 0.1% | 2.2ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:898` |
| 0.1% | 2.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:900` |
| 0.1% | 2.2ms | 0.1% | 2.2ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/tui/src/components/input.ts:35` |
| 0.1% | 2.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js:15` |
| 0.1% | 2.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:16` |
| 0.1% | 1.8ms | 0.0% | 0us | `async #tryInitSessionFileFromSidecar` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7349` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `#resetSidecarRuntime` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.1% | 1.8ms | 0.0% | 0us | `async #initSessionFile` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8358` |
| 0.1% | 1.8ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17454` |
| 0.1% | 1.8ms | 0.0% | 0us | `async #tryInitSessionFileFromSidecar` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7331` |
| 0.1% | 1.8ms | 0.0% | 0us | `async #initSessionFile` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8350` |
| 0.0% | 1.6ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/modes/theme/theme.ts:837` |
| 0.0% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/propagation-api.js:10` |
| 0.0% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:59` |
| 0.0% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/api/propagation.js:11` |
| 0.0% | 1.5ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:311` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` |
| 0.0% | 1.4ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:892` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:323` |
| 0.0% | 1.4ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7661` |
| 0.0% | 1.4ms | 0.0% | 0us | `async worker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4113` |
| 0.0% | 1.4ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4130` |
| 0.0% | 1.4ms | 0.0% | 0us | `async resolveBlobRefsInEntries` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4134` |
| 0.0% | 1.4ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4117` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `residentizePersistedBlobRefs` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.4ms | 0.0% | 0us | `async runWithConcurrency` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4121` |
| 0.0% | 1.4ms | 0.0% | 0us | `async resolveBlobRefsInEntries` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4124` |
| 0.0% | 1.4ms | 0.0% | 0us | `async runWithConcurrency` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4111` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `add` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:1787` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7834` |
| 0.0% | 1.4ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8044` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `BoundedDictionaryArtifactBuilder` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10456` |
| 0.0% | 1.4ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7644` |
| 0.0% | 1.4ms | 0.0% | 0us | `#withSessionPersistenceFenceSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10058` |
| 0.0% | 1.4ms | 0.0% | 0us | `createSessionCommitMarkerCheckedSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:781` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `createFileCommitMarkerCheckedSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `digest` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/gjc-runtime/state-schema.ts:45` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `get` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:37` |
| 0.0% | 1.4ms | 0.0% | 0us | `openVerifiedResidentCacheDirectory` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:178` |
| 0.0% | 1.4ms | 0.0% | 0us | `readResidentCacheOwnerSnapshot` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:284` |
| 0.0% | 1.4ms | 0.0% | 0us | `async sweepResidentCacheRoot` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:564` |
| 0.0% | 1.4ms | 0.0% | 0us | `startFirstOpenPhase` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6512` |
| 0.0% | 1.4ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7609` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `cpuUsage` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `materializeProviderVisibleEntrySync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.4ms | 0.0% | 0us | `#getSessionContextForRead` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16399` |
| 0.0% | 1.4ms | 0.0% | 0us | `buildSessionContext` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16356` |
| 0.0% | 1.4ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17455` |
| 0.0% | 1.3ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/web/insane/url-guard.ts:143` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `parseIPv6Bytes` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/web/insane/url-guard.ts` |
| 0.0% | 1.3ms | 0.0% | 0us | `ipv6Cidr` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/web/insane/url-guard.ts:127` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.runtime.js:12` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/base.js:19` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7860` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `equals` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js` |
| 0.0% | 1.3ms | 0.0% | 0us | `compileChildren` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:822` |
| 0.0% | 1.3ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:770` |
| 0.0% | 1.3ms | 0.0% | 0us | `matchExistingProgram` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:849` |
| 0.0% | 1.3ms | 0.0% | 0us | `compileInput` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:510` |
| 0.0% | 1.3ms | 0.0% | 0us | `compile` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:99` |
| 0.0% | 1.3ms | 0.0% | 0us | `parseWithoutProcessing` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:53` |
| 0.0% | 1.3ms | 0.0% | 0us | `compileInput` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:508` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `anonymous` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js` |
| 0.0% | 1.3ms | 0.0% | 0us | `parse` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:320` |
| 0.0% | 1.3ms | 0.0% | 0us | `lex` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:297` |
| 0.0% | 1.3ms | 0.0% | 0us | `lex` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:526` |
| 0.0% | 1.3ms | 0.0% | 0us | `parse` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:59` |
| 0.0% | 1.3ms | 0.0% | 0us | `next` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:515` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `at` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 0us | `summarize` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:227` |
| 0.0% | 1.3ms | 0.0% | 0us | `#writeToKernel` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1070` |
| 0.0% | 1.3ms | 0.0% | 0us | `fsyncSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1136` |
| 0.0% | 1.3ms | 0.0% | 0us | `#scanBoundedTranscriptForFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7972` |
| 0.0% | 1.3ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:1027` |
| 0.0% | 1.3ms | 0.0% | 0us | `fsyncFirstOpenSidecarWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6570` |
| 0.0% | 1.3ms | 0.0% | 0us | `get` | `node:assert:70` |
| 0.0% | 1.3ms | 0.0% | 0us | `node:assert/strict` | `node:assert/strict:3` |
| 0.0% | 1.3ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 0.0% | 1.3ms | 0.0% | 0us | `internal:assert/assertion_error` | `internal:assert/assertion_error:2` |
| 0.0% | 1.3ms | 0.0% | 0us | `assign` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.0% | 1.3ms | 0.0% | 0us | `decodeBoundedJsonLine` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1362` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `maybeExtractEmbeddedAddons` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js` |
| 0.0% | 1.3ms | 0.0% | 0us | `loadNative` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:536` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:710` |
| 0.0% | 1.2ms | 0.0% | 0us | `_array` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:712` |
| 0.0% | 1.2ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/openai-chat-server-schema.ts:127` |
| 0.0% | 1.2ms | 0.0% | 0us | `ZodArray` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.0% | 1.2ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8146` |
| 0.0% | 1.2ms | 0.0% | 0us | `onceWrapper` | `node:events:194` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `removeListener` | `node:events` |
| 0.0% | 1.2ms | 0.0% | 0us | `emit` | `node:events:92` |
| 0.0% | 1.2ms | 0.0% | 0us | `bound onceWrapper` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 0us | `onConstruct` | `internal:streams/destroy:144` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7856` |
| 0.0% | 1.2ms | 0.0% | 0us | `#scanBoundedTranscriptForFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7787` |
| 0.0% | 1.2ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:918` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:18` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:18` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7840` |
| 0.0% | 1.2ms | 0.0% | 0us | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1622` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `alloc` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8162` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7839` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:58` |
| 0.0% | 1.2ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/usage.ts:77` |
| 0.0% | 1.2ms | 0.0% | 0us | `ZodString` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:258` |
| 0.0% | 1.2ms | 0.0% | 0us | `bound clone` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:135` |
| 0.0% | 1.2ms | 0.0% | 0us | `clone` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:262` |
| 0.0% | 1.2ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:21` |
| 0.0% | 1.2ms | 0.0% | 0us | `string` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/regexes.js:95` |
| 0.0% | 1.2ms | 0.0% | 0us | `bound check` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:204` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:966` |
| 0.0% | 1.1ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:768` |
| 0.0% | 1.1ms | 0.0% | 0us | `main` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:206` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7859` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `#writeToKernel` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1068` |
| 0.0% | 1.1ms | 0.0% | 0us | `writeBytesSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1105` |
| 0.0% | 1.1ms | 0.0% | 0us | `writeFirstOpenSidecarBytes` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6557` |
| 0.0% | 1.1ms | 0.0% | 0us | `#appendBytes` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1096` |
| 0.0% | 1.1ms | 0.0% | 0us | `#findColdEntryIndex` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12351` |
| 0.0% | 1.1ms | 0.0% | 0us | `internal:util/inspect` | `internal:util/inspect:179` |
| 0.0% | 1.1ms | 0.0% | 0us | `#resolveEntry` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12614` |
| 0.0% | 1.1ms | 0.0% | 0us | `bound call` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `filter` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 0us | `#coldIndexDigestValid` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12297` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `explicitDestination` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.1ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:873` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `#preparedResidentTransitionFromSource` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.1ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17433` |
| 0.0% | 1.1ms | 0.0% | 0us | `#prepareResidentTextStoreTransition` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6940` |
| 0.0% | 1.1ms | 0.0% | 0us | `inspectTranscriptHeaderBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3615` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `decodeBase64` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/internal/decode-shared.js:21` |
| 0.0% | 1.1ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/generated/decode-data-html.js:3` |
| 0.0% | 1.1ms | 0.0% | 0us | `getRegex` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:13` |
| 0.0% | 1.1ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:14` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:192` |
| 0.0% | 1.1ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/openai-responses-server-schema.ts:37` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `firstOpenSecondaryArtifactMode` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.1ms | 0.0% | 0us | `async #initSessionFile` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8363` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:28` |
| 0.0% | 1.1ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7579` |
| 0.0% | 1.1ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7597` |
| 0.0% | 1.1ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8174` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:22` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:14` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `@lazy` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `node:path` | `node:path:2` |
| 0.0% | 1.0ms | 0.0% | 0us | `internal:fs/glob` | `internal:fs/glob:2` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:7` |
| 0.0% | 1.0ms | 0.0% | 0us | `#disposeResidentTextStore` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7054` |
| 0.0% | 1.0ms | 0.0% | 0us | `dispose` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:1234` |
| 0.0% | 1.0ms | 0.0% | 0us | `#releaseResidentTextStore` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7145` |
| 0.0% | 1.0ms | 0.0% | 0us | `async close` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:14063` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `disposeVerifiedResidentCacheInstanceDir` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:434` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:6` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/lib/source-map-generator.js:8` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `#readColdEntryRange` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.0ms | 0.0% | 0us | `#resolveEntry` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12616` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `validateLoadedBindings` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:405` |
| 0.0% | 1.0ms | 0.0% | 0us | `loadFromCandidates` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:216` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7921` |

## Function Details

### `update`
`[native code]` | Self: 44.4% (731.5ms) | Total: 44.4% (731.5ms) | Samples: 564

**Called by:**
- `updateBoundedTranscriptHash` (279)
- `computeLineDigest` (267)
- `#buildBoundedFirstOpenSidecars` (16)
- `(anonymous)` (1)
- `#coldIndexDigestValid` (1)

### `DirResolver`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/dirs.ts` | Self: 8.8% (145.8ms) | Total: 8.8% (145.8ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `write`
`[native code]` | Self: 8.3% (136.8ms) | Total: 8.3% (136.8ms) | Samples: 107

**Called by:**
- `async (anonymous)` (107)

### `stringify`
`[native code]` | Self: 5.8% (95.6ms) | Total: 5.8% (95.6ms) | Samples: 71

**Called by:**
- `serialize` (70)
- `(anonymous)` (1)

### `gc`
`[native code]` | Self: 4.8% (80.2ms) | Total: 4.8% (80.2ms) | Samples: 57

**Called by:**
- `memorySample` (21)
- `async settledMemorySample` (19)
- `recordFirstOpenGcRequest` (17)

### `byteLength`
`[native code]` | Self: 4.6% (77.0ms) | Total: 4.6% (77.0ms) | Samples: 61

**Called by:**
- `async generateTranscript` (39)
- `async (anonymous)` (22)

### `readSync`
`[native code]` | Self: 4.4% (73.4ms) | Total: 4.4% (73.4ms) | Samples: 58

**Called by:**
- `scanTranscriptLinesBounded` (56)
- `readRangeSync` (2)

### `parse`
`[native code]` | Self: 3.4% (55.9ms) | Total: 3.4% (55.9ms) | Samples: 43

**Called by:**
- `(anonymous)` (43)

### `anonymous`
`[native code]` | Self: 2.8% (46.3ms) | Total: 17.8% (293.0ms) | Samples: 13

**Called by:**
- `require` (41)
- `node:util` (2)
- `node:fs/promises` (2)
- `loadAssertionError` (1)
- `internal:assert/assertion_error` (1)
- `main` (1)
- `internal:streams/transform` (1)
- `node:crypto` (1)
- `internal:fs/glob` (1)
- `internal:streams/duplex` (1)
- `node:assert/strict` (1)
- `internal:streams/readable` (1)
- `internal:streams/lazy_transform` (1)

**Calls:**
- `(anonymous)` (7)
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `internal:streams/lazy_transform` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:streams/transform` (1)
- `internal:streams/destroy` (1)
- `(anonymous)` (1)
- `internal:streams/duplex` (1)
- `internal:streams/readable` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:util/inspect` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `node:path` (1)
- `(anonymous)` (1)
- `internal:fs/glob` (1)
- `(anonymous)` (1)
- `internal:assert/assertion_error` (1)
- `node:assert` (1)
- `(anonymous)` (1)

### `[Symbol.match]`
`[native code]` | Self: 1.9% (31.3ms) | Total: 1.9% (31.3ms) | Samples: 1

**Called by:**
- `_makeCompatibilityCheck` (1)

### `toString`
`[native code]` | Self: 1.8% (29.9ms) | Total: 1.8% (29.9ms) | Samples: 23

**Called by:**
- `(anonymous)` (23)

### `bound writeFast`
`[native code]` | Self: 1.1% (19.2ms) | Total: 1.1% (19.2ms) | Samples: 1

**Called by:**
- `markedWrite` (1)

### `indexOf`
`[native code]` | Self: 0.7% (12.1ms) | Total: 0.7% (12.1ms) | Samples: 10

**Called by:**
- `consume` (10)

### `copy`
`[native code]` | Self: 0.5% (9.1ms) | Total: 0.5% (9.1ms) | Samples: 7

**Called by:**
- `consume` (5)
- `consume` (2)

### `internal:streams/destroy`
`internal:streams/destroy:16` | Self: 0.5% (8.8ms) | Total: 0.5% (8.8ms) | Samples: 1

**Called by:**
- `anonymous` (1)

### `dlopen`
`[native code]` | Self: 0.3% (6.1ms) | Total: 0.3% (6.1ms) | Samples: 5

**Called by:**
- `(anonymous)` (5)

### `spawnSync`
`[native code]` | Self: 0.3% (4.9ms) | Total: 0.3% (4.9ms) | Samples: 4

**Called by:**
- `residentCacheProcessStartTimeMs` (4)

### `statSync`
`[native code]` | Self: 0.1% (2.7ms) | Total: 0.2% (4.2ms) | Samples: 2

**Called by:**
- `statSync` (2)
- `statSync` (1)

**Calls:**
- `statSync` (1)

### `serialize`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:302` | Self: 0.1% (2.5ms) | Total: 5.8% (96.9ms) | Samples: 2

**Called by:**
- `async generateTranscript` (68)
- `async generateTranscript` (4)

**Calls:**
- `stringify` (70)

### `bigint`
`[native code]` | Self: 0.1% (2.4ms) | Total: 0.1% (2.4ms) | Samples: 2

**Called by:**
- `(anonymous)` (1)
- `(anonymous)` (1)

### `(anonymous)`
`[native code]` | Self: 0.1% (2.4ms) | Total: 85.8% (1.41s) | Samples: 2

**Called by:**
- `processTicksAndRejections` (1052)
- `require` (8)
- `(anonymous)` (8)
- `bound require` (5)
- `decodeBoundedJsonLine` (1)

**Calls:**
- `async #tryBoundedFirstOpen` (720)
- `async generateTranscript` (130)
- `async generateTranscript` (68)
- `async generateTranscript` (39)
- `async #tryBoundedFirstOpen` (20)
- `async settledMemorySample` (19)
- `memorySample` (17)
- `async runWorker` (11)
- `(anonymous)` (8)
- `(module)` (7)
- `dlopen` (5)
- `async runWorker` (4)
- `async generateTranscript` (4)
- `async #tryBoundedFirstOpen` (3)
- `async runWorker` (2)
- `async sweepResidentCacheRoot` (2)
- `async runWorker` (1)
- `(module)` (1)
- `async #initSessionFile` (1)
- `async #tryBoundedFirstOpen` (1)
- `async generateTranscript` (1)
- `async runWorker` (1)
- `async #tryBoundedFirstOpen` (1)
- `async open` (1)
- `async generateTranscript` (1)
- `async sweepResidentCacheRoot` (1)
- `async close` (1)
- `async runWorker` (1)
- `async #tryBoundedFirstOpen` (1)

### `applyOwnerOnlyPathSecurity`
`[native code]` | Self: 0.1% (2.3ms) | Total: 0.1% (2.3ms) | Samples: 2

**Called by:**
- `secureOwnerOnlyFileDescriptor` (2)

### `RegExp`
`[native code]` | Self: 0.1% (2.3ms) | Total: 0.1% (2.3ms) | Samples: 2

**Called by:**
- `string` (1)
- `getRegex` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7807` | Self: 0.1% (2.3ms) | Total: 0.1% (2.3ms) | Samples: 2

**Called by:**
- `consume` (2)

### `Hash`
`[native code]` | Self: 0.1% (2.2ms) | Total: 0.1% (2.2ms) | Samples: 2

**Called by:**
- `Hash` (2)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/tui/src/components/input.ts:35` | Self: 0.1% (2.2ms) | Total: 0.1% (2.2ms) | Samples: 1

### `#resetSidecarRuntime`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.1% (1.8ms) | Total: 0.1% (1.8ms) | Samples: 1

**Called by:**
- `async #tryInitSessionFileFromSidecar` (1)

### `bound min`
`[native code]` | Self: 0.0% (1.6ms) | Total: 0.1% (2.8ms) | Samples: 1

**Called by:**
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `bound check` (1)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `async write` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `from` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:323` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `residentizePersistedBlobRefs`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `add`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:1787` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `BoundedDictionaryArtifactBuilder`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `#buildBoundedFirstOpenSidecars` (1)

### `createFileCommitMarkerCheckedSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `createSessionCommitMarkerCheckedSync` (1)

### `digest`
`[native code]` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `get`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:37` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `openSync`
`[native code]` | Self: 0.0% (1.4ms) | Total: 0.1% (2.8ms) | Samples: 1

**Called by:**
- `openVerifiedResidentCacheDirectory` (1)
- `openSync` (1)

**Calls:**
- `openSync` (1)

### `cpuUsage`
`[native code]` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `startFirstOpenPhase` (1)

### `materializeProviderVisibleEntrySync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `map` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7798` | Self: 0.0% (1.3ms) | Total: 5.3% (88.5ms) | Samples: 1

**Called by:**
- `consume` (68)

**Calls:**
- `parse` (43)
- `toString` (23)
- `decodeBoundedJsonLine` (1)

### `parseIPv6Bytes`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/web/insane/url-guard.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `ipv6Cidr` (1)

### `async write`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:304` | Self: 0.0% (1.3ms) | Total: 10.1% (166.9ms) | Samples: 1

**Called by:**
- `async generateTranscript` (130)
- `async generateTranscript` (1)

**Calls:**
- `async (anonymous)` (107)
- `async (anonymous)` (22)
- `async (anonymous)` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `equals`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `matchExistingProgram` (1)

### `anonymous`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `next` (1)

### `writeSync`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.1% (2.6ms) | Samples: 1

**Called by:**
- `writeSync` (1)
- `#writeToKernel` (1)

**Calls:**
- `writeSync` (1)

### `at`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `summarize` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7861` | Self: 0.0% (1.3ms) | Total: 0.1% (2.5ms) | Samples: 1

**Called by:**
- `consume` (2)

**Calls:**
- `bigint` (1)

### `from`
`[native code]` | Self: 0.0% (1.3ms) | Total: 1.1% (18.1ms) | Samples: 1

**Called by:**
- `async runWorker` (11)
- `(module)` (2)
- `async runWithConcurrency` (1)

**Calls:**
- `async openNext` (11)
- `(anonymous)` (1)
- `async worker` (1)

### `maybeExtractEmbeddedAddons`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `loadNative` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:710` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `init` (1)

### `removeListener`
`node:events` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `onceWrapper` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7856` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `consume` (1)

### `alloc`
`[native code]` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `readRangeSync` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:58` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `init` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:1662` | Self: 0.0% (1.1ms) | Total: 0.1% (2.3ms) | Samples: 1

**Called by:**
- `init` (1)
- `map` (1)

**Calls:**
- `map` (1)

### `#writeToKernel`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1068` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `#flushPending` (1)

### `filter`
`[native code]` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `bound call` (1)

### `explicitDestination`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `#preparedResidentTransitionFromSource`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `#prepareResidentTextStoreTransition` (1)

### `decodeBase64`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/internal/decode-shared.js:21` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:192` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `init` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:22` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `anonymous` (1)

### `firstOpenSecondaryArtifactMode`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `async #tryBoundedFirstOpen` (1)

### `@lazy`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `node:path` (1)

### `disposeVerifiedResidentCacheInstanceDir`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:434` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `dispose` (1)

### `#readColdEntryRange`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `#resolveEntry` (1)

### `validateLoadedBindings`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:405` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `loadFromCandidates` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7921` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `consume` (1)

### `ret`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:517` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Called by:**
- `render` (2)

**Calls:**
- `compileInput` (1)
- `compileInput` (1)

### `internal:streams/lazy_transform`
`internal:streams/lazy_transform:2` | Self: 0.0% (0us) | Total: 0.5% (8.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `getSessionMemoryStats`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:14256` | Self: 0.0% (0us) | Total: 0.1% (2.7ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `statSync` (2)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:918` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `map` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js:15` | Self: 0.0% (0us) | Total: 0.1% (2.1ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `async openNext`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:865` | Self: 0.0% (0us) | Total: 0.8% (13.8ms) | Samples: 0

**Called by:**
- `from` (11)

**Calls:**
- `async (anonymous)` (10)
- `async (anonymous)` (1)

### `Hash`
`node:crypto:178` | Self: 0.0% (0us) | Total: 0.1% (2.2ms) | Samples: 0

**Called by:**
- `createHash` (2)

**Calls:**
- `Hash` (2)

### `#scanBoundedTranscriptForFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7788` | Self: 0.0% (0us) | Total: 56.1% (922.3ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (718)

**Calls:**
- `scanTranscriptLinesBounded` (659)
- `scanTranscriptLinesBounded` (56)
- `scanTranscriptLinesBounded` (3)

### `writeFirstOpenSidecarBytes`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6557` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `writeBytesSync` (1)

### `openVerifiedResidentCacheInstanceDir`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:621` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Called by:**
- `#newResidentTextStoreCandidate` (2)

**Calls:**
- `writeResidentCacheOwnerToken` (2)

### `#scanBoundedTranscriptForFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7972` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `fsyncFirstOpenSidecarWriter` (1)

### `createSessionCommitMarkerCheckedSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:781` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `createFileCommitMarkerCheckedSync` (1)

### `loadNative`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:544` | Self: 0.0% (0us) | Total: 0.4% (7.2ms) | Samples: 0

**Called by:**
- `(module)` (6)

**Calls:**
- `loadFromCandidates` (5)
- `loadFromCandidates` (1)

### `bound require`
`[native code]` | Self: 0.0% (0us) | Total: 15.2% (251.4ms) | Samples: 0

**Called by:**
- `canonicalizeTrustedPath` (8)
- `(anonymous)` (7)
- `getHandlebars` (7)
- `loadFromCandidates` (5)
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (2)
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
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `require` (49)
- `(anonymous)` (5)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:59` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Calls:**
- `bound require` (1)

### `recordFirstOpenGcRequest`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6525` | Self: 0.0% (0us) | Total: 1.3% (22.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (14)
- `scanTranscriptLinesBounded` (3)

**Calls:**
- `gc` (17)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `assign` (1)

**Calls:**
- `loadAssertionError` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/utils.ts:185` | Self: 0.0% (0us) | Total: 0.8% (13.3ms) | Samples: 0

**Calls:**
- `render` (8)

### `FileSessionStorageWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1022` | Self: 0.0% (0us) | Total: 0.1% (2.3ms) | Samples: 0

**Called by:**
- `openBufferedWriter` (2)

**Calls:**
- `secureOwnerOnlyFileDescriptor` (2)

### `internal:fs/glob`
`internal:fs/glob:2` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:18` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `bound onceWrapper`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `emit` (1)

**Calls:**
- `onceWrapper` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17455` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `buildSessionContext` (1)

### `parseWithoutProcessing`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:53` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `parse` (1)

**Calls:**
- `parse` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:311` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `async write` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:8` | Self: 0.0% (0us) | Total: 0.3% (6.4ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7839` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `consume` (1)

**Calls:**
- `bigint` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:892` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `map` (1)

### `clone`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:262` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `bound clone` (1)

**Calls:**
- `ZodString` (1)

### `main`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:206` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `render` (1)

**Calls:**
- `anonymous` (1)

### `getHandlebars`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:237` | Self: 0.0% (0us) | Total: 0.7% (12.0ms) | Samples: 0

**Called by:**
- `compile` (7)

**Calls:**
- `bound require` (7)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7837` | Self: 0.0% (0us) | Total: 21.0% (345.9ms) | Samples: 0

**Called by:**
- `consume` (270)

**Calls:**
- `computeLineDigest` (269)
- `digest` (1)

### `emit`
`node:events:92` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `onConstruct` (1)

**Calls:**
- `bound onceWrapper` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:22` | Self: 0.0% (0us) | Total: 0.1% (3.2ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:366` | Self: 0.0% (0us) | Total: 10.0% (165.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (130)

**Calls:**
- `async write` (130)

### `ZodEnum`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.2% (3.5ms) | Samples: 0

**Called by:**
- `_enum` (3)

**Calls:**
- `init` (3)

### `init`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:22` | Self: 0.0% (0us) | Total: 0.6% (10.8ms) | Samples: 0

**Called by:**
- `ZodEnum` (3)
- `(anonymous)` (2)
- `ZodString` (1)
- `(anonymous)` (1)
- `ZodArray` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `dispose`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:1234` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `#disposeResidentTextStore` (1)

**Calls:**
- `disposeVerifiedResidentCacheInstanceDir` (1)

### `render`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:493` | Self: 0.0% (0us) | Total: 0.9% (15.9ms) | Samples: 0

**Called by:**
- `(module)` (8)
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `compile` (7)
- `ret` (2)
- `main` (1)

### `canonicalizeTrustedPath`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/managed-session-scope.ts:406` | Self: 0.0% (0us) | Total: 0.5% (9.6ms) | Samples: 0

**Called by:**
- `async open` (8)

**Calls:**
- `bound require` (8)

### `#coldIndexDigestValid`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12297` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `#findColdEntryIndex` (1)

**Calls:**
- `update` (1)

### `statSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1668` | Self: 0.0% (0us) | Total: 0.1% (2.7ms) | Samples: 0

**Called by:**
- `getSessionMemoryStats` (2)

**Calls:**
- `statSync` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:967` | Self: 0.0% (0us) | Total: 0.1% (2.3ms) | Samples: 0

**Called by:**
- `init` (2)

**Calls:**
- `init` (2)

### `compileInput`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:510` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `ret` (1)

**Calls:**
- `compile` (1)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 84.3% (1.38s) | Samples: 0

**Calls:**
- `(anonymous)` (1052)
- `onConstruct` (1)

### `writeBytesSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1105` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `writeFirstOpenSidecarBytes` (1)

**Calls:**
- `#appendBytes` (1)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4117` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `async worker` (1)

**Calls:**
- `async (anonymous)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/base.js:19` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7834` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `consume` (1)

**Calls:**
- `add` (1)

### `async settledMemorySample`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:245` | Self: 0.0% (0us) | Total: 1.5% (24.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (19)

**Calls:**
- `gc` (19)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:770` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Calls:**
- `render` (1)

### `internal:util/inspect`
`internal:util/inspect:179` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound call` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/internal/global-utils.js:9` | Self: 0.0% (0us) | Total: 1.9% (31.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `loadFromCandidates`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:215` | Self: 0.0% (0us) | Total: 0.3% (6.1ms) | Samples: 0

**Called by:**
- `loadNative` (5)

**Calls:**
- `bound require` (5)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:873` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async openNext` (1)

**Calls:**
- `explicitDestination` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:8` | Self: 0.0% (0us) | Total: 1.9% (31.3ms) | Samples: 0

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/lib/index.js:8` | Self: 0.0% (0us) | Total: 0.7% (12.0ms) | Samples: 0

**Called by:**
- `anonymous` (7)

**Calls:**
- `bound require` (7)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/web/insane/url-guard.ts:143` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Calls:**
- `ipv6Cidr` (1)

### `loadFromCandidates`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:216` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `loadNative` (1)

**Calls:**
- `validateLoadedBindings` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:332` | Self: 0.0% (0us) | Total: 0.3% (5.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `serialize` (4)

### `compile`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:99` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `compileInput` (1)

**Calls:**
- `compileChildren` (1)

### `compile`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:485` | Self: 0.0% (0us) | Total: 0.7% (12.0ms) | Samples: 0

**Called by:**
- `render` (7)

**Calls:**
- `getHandlebars` (7)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:966` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:349` | Self: 0.0% (0us) | Total: 3.0% (49.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (39)

**Calls:**
- `byteLength` (39)

### `#releaseResidentTextStore`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7145` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `async close` (1)

**Calls:**
- `#disposeResidentTextStore` (1)

### `#getSessionContextForRead`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16399` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `buildSessionContext` (1)

**Calls:**
- `map` (1)

### `decodeBoundedJsonLine`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1362` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `loadNative`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:536` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `maybeExtractEmbeddedAddons` (1)

### `createHash`
`node:crypto:201` | Self: 0.0% (0us) | Total: 0.1% (2.2ms) | Samples: 0

**Called by:**
- `computeLineDigest` (2)

**Calls:**
- `Hash` (2)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/generated/decode-data-html.js:3` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Calls:**
- `decodeBase64` (1)

### `#resolveEntry`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12616` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `getEntry` (1)

**Calls:**
- `#readColdEntryRange` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/dirs.ts:337` | Self: 0.0% (0us) | Total: 8.8% (145.8ms) | Samples: 0

**Calls:**
- `DirResolver` (1)

### `#prepareResidentTextStoreTransition`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6940` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `#preparedResidentTransitionFromSource` (1)

### `lex`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:297` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `parse` (1)

**Calls:**
- `lex` (1)

### `residentCacheOwnerIsStale`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:469` | Self: 0.0% (0us) | Total: 0.1% (2.3ms) | Samples: 0

**Called by:**
- `async sweepResidentCacheRoot` (2)

**Calls:**
- `cachedResidentCacheProcessStartTimeMs` (2)

### `readRangeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1622` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `#buildBoundedFirstOpenSidecars` (1)

**Calls:**
- `alloc` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7597` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `firstOpenSecondaryArtifactMode` (1)

### `string`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/regexes.js:95` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `RegExp` (1)

### `ZodString`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `clone` (1)

**Calls:**
- `init` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:16` | Self: 0.0% (0us) | Total: 0.1% (2.1ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `async measurePhase`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:595` | Self: 0.0% (0us) | Total: 0.1% (2.2ms) | Samples: 0

**Called by:**
- `async measurePhase` (2)

**Calls:**
- `(anonymous)` (2)

### `internal:streams/transform`
`internal:streams/transform:2` | Self: 0.0% (0us) | Total: 0.5% (8.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8174` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `openFirstOpenSidecarWriter` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:135` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `string` (1)

### `async runWithConcurrency`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4121` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `async runWithConcurrency` (1)

**Calls:**
- `from` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8151` | Self: 0.0% (0us) | Total: 1.6% (26.7ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (16)

**Calls:**
- `update` (16)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1486` | Self: 0.0% (0us) | Total: 0.1% (2.5ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (2)

**Calls:**
- `copy` (2)

### `ZodArray`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `_array` (1)

**Calls:**
- `init` (1)

### `#findColdEntryIndex`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12351` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `#resolveEntry` (1)

**Calls:**
- `#coldIndexDigestValid` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7794` | Self: 0.0% (0us) | Total: 21.8% (359.9ms) | Samples: 0

**Called by:**
- `consume` (279)

**Calls:**
- `updateBoundedTranscriptHash` (279)

### `async runWithConcurrency`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4111` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `async resolveBlobRefsInEntries` (1)

**Calls:**
- `async runWithConcurrency` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/propagation-api.js:10` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/openai-chat-server-schema.ts:127` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Calls:**
- `_array` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8162` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `readRangeSync` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7840` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `consume` (1)

**Calls:**
- `stringify` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:18` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:204` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Calls:**
- `_enum` (1)

### `_array`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:712` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `ZodArray` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/partial-json/dist/index.js:18` | Self: 0.0% (0us) | Total: 1.5% (25.4ms) | Samples: 0

**Calls:**
- `bound require` (1)

### `writeResidentCacheOwnerToken`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:314` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Called by:**
- `openVerifiedResidentCacheInstanceDir` (2)

**Calls:**
- `residentCacheProcessStartTimeMs` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/baggage/utils.js:8` | Self: 0.0% (0us) | Total: 1.9% (31.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:871` | Self: 0.0% (0us) | Total: 0.7% (12.6ms) | Samples: 0

**Called by:**
- `async openNext` (10)

**Calls:**
- `async open` (10)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:258` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1553` | Self: 0.0% (0us) | Total: 4.3% (70.9ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (56)

**Calls:**
- `readSync` (56)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1574` | Self: 0.0% (0us) | Total: 0.2% (3.8ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (3)

**Calls:**
- `recordFirstOpenGcRequest` (3)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:14` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Calls:**
- `getRegex` (1)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:306` | Self: 0.0% (0us) | Total: 1.6% (27.2ms) | Samples: 0

**Called by:**
- `async write` (22)

**Calls:**
- `byteLength` (22)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 0.5% (8.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/diag/ComponentLogger.js:8` | Self: 0.0% (0us) | Total: 1.9% (31.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `node:fs/promises`
`node:fs/promises:2` | Self: 0.0% (0us) | Total: 0.2% (3.4ms) | Samples: 0

**Calls:**
- `anonymous` (2)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:324` | Self: 0.0% (0us) | Total: 5.5% (91.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (68)

**Calls:**
- `serialize` (68)

### `async #initSessionFile`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8358` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `async #initSessionFile` (1)

**Calls:**
- `async #tryInitSessionFileFromSidecar` (1)

### `buildSessionContext`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16356` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `#getSessionContextForRead` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17454` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `async #initSessionFile` (1)

### `readResidentCacheOwnerSnapshot`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:284` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `async sweepResidentCacheRoot` (1)

**Calls:**
- `openVerifiedResidentCacheDirectory` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.runtime.js:12` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1476` | Self: 0.0% (0us) | Total: 0.7% (12.1ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (10)

**Calls:**
- `indexOf` (10)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:6` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `#prepareResidentTextStoreTransition`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6939` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (2)

**Calls:**
- `#newResidentTextStoreCandidate` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:7` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `bound call`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `internal:util/inspect` (1)

**Calls:**
- `filter` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:1452` | Self: 0.0% (0us) | Total: 1.2% (20.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `markedWrite` (1)
- `async runWorker` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/openai-responses-server-schema.ts:37` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Calls:**
- `_enum` (1)

### `#appendBytes`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1096` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `writeBytesSync` (1)

**Calls:**
- `#flushPending` (1)

### `internal:streams/readable`
`internal:streams/readable:2` | Self: 0.0% (0us) | Total: 0.5% (8.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:821` | Self: 0.0% (0us) | Total: 0.6% (10.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `memorySample` (4)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:900` | Self: 0.0% (0us) | Total: 0.1% (2.2ms) | Samples: 0

**Called by:**
- `async measurePhase` (2)

**Calls:**
- `getEntry` (2)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/usage.ts:77` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Calls:**
- `_enum` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:898` | Self: 0.0% (0us) | Total: 0.1% (2.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `async measurePhase` (2)

### `async #initSessionFile`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8350` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `async #initSessionFile` (1)

### `startFirstOpenPhase`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6512` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `cpuUsage` (1)

### `residentCacheProcessStartTimeMs`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:207` | Self: 0.0% (0us) | Total: 0.3% (4.9ms) | Samples: 0

**Called by:**
- `cachedResidentCacheProcessStartTimeMs` (2)
- `writeResidentCacheOwnerToken` (2)

**Calls:**
- `spawnSync` (4)

### `#flushPending`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1080` | Self: 0.0% (0us) | Total: 0.1% (2.5ms) | Samples: 0

**Called by:**
- `fsyncSync` (1)
- `#appendBytes` (1)

**Calls:**
- `#writeToKernel` (1)
- `#writeToKernel` (1)

### `getEntry`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16113` | Self: 0.0% (0us) | Total: 0.1% (2.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `#resolveEntry` (1)
- `#resolveEntry` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8044` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `BoundedDictionaryArtifactBuilder` (1)

### `async #tryInitSessionFileFromSidecar`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7331` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `async #initSessionFile` (1)

**Calls:**
- `async #tryInitSessionFileFromSidecar` (1)

### `onceWrapper`
`node:events:194` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `bound onceWrapper` (1)

**Calls:**
- `removeListener` (1)

### `internal:assert/assertion_error`
`internal:assert/assertion_error:2` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `require`
`[native code]` | Self: 0.0% (0us) | Total: 14.9% (245.2ms) | Samples: 0

**Called by:**
- `bound require` (49)

**Calls:**
- `anonymous` (41)
- `(anonymous)` (8)

### `#resolveEntry`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12614` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `getEntry` (1)

**Calls:**
- `#findColdEntryIndex` (1)

### `#disposeResidentTextStore`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7054` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `#releaseResidentTextStore` (1)

**Calls:**
- `dispose` (1)

### `parse`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:59` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `compileInput` (1)

**Calls:**
- `parseWithoutProcessing` (1)

### `_enum`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1007` | Self: 0.0% (0us) | Total: 0.2% (3.5ms) | Samples: 0

**Called by:**
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `ZodEnum` (3)

### `summarize`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:227` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `async runWorker` (1)

**Calls:**
- `at` (1)

### `assign`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `node:assert` (1)

**Calls:**
- `get` (1)

### `#scanBoundedTranscriptForFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7787` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `openFirstOpenSidecarWriter` (1)

### `node:util`
`node:util:2` | Self: 0.0% (0us) | Total: 0.2% (3.6ms) | Samples: 0

**Calls:**
- `anonymous` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/api/diag.js:8` | Self: 0.0% (0us) | Total: 1.9% (31.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `#withSessionPersistenceFenceSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10058` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `(anonymous)` (1)

### `map`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (5.3ms) | Samples: 0

**Called by:**
- `async runWorker` (1)
- `(anonymous)` (1)
- `#getSessionContextForRead` (1)
- `async runWorker` (1)

**Calls:**
- `getSessionMemoryStats` (2)
- `materializeProviderVisibleEntrySync` (1)
- `(anonymous)` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7637` | Self: 0.0% (0us) | Total: 1.9% (31.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (20)

**Calls:**
- `#buildBoundedFirstOpenSidecars` (16)
- `#buildBoundedFirstOpenSidecars` (1)
- `#buildBoundedFirstOpenSidecars` (1)
- `#buildBoundedFirstOpenSidecars` (1)
- `#buildBoundedFirstOpenSidecars` (1)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4130` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)

**Calls:**
- `residentizePersistedBlobRefs` (1)

### `fsyncSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1136` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `fsyncFirstOpenSidecarWriter` (1)

**Calls:**
- `#flushPending` (1)

### `markedWrite`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/postmortem.ts:182` | Self: 0.0% (0us) | Total: 1.1% (19.2ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `bound writeFast` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/internal/semver.js:110` | Self: 0.0% (0us) | Total: 1.9% (31.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `_makeCompatibilityCheck` (1)

### `secureOwnerOnlyFileDescriptor`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:668` | Self: 0.0% (0us) | Total: 0.1% (2.3ms) | Samples: 0

**Called by:**
- `FileSessionStorageWriter` (2)

**Calls:**
- `applyOwnerOnlyPathSecurity` (2)

### `computeLineDigest`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:693` | Self: 0.0% (0us) | Total: 20.9% (344.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (269)

**Calls:**
- `update` (267)
- `createHash` (2)

### `updateBoundedTranscriptHash`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1388` | Self: 0.0% (0us) | Total: 21.8% (359.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (279)

**Calls:**
- `update` (279)

### `bound check`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `bound min` (1)

**Calls:**
- `bound clone` (1)

### `parse`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:320` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `parseWithoutProcessing` (1)

**Calls:**
- `lex` (1)

### `lex`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:526` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `lex` (1)

**Calls:**
- `next` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1500` | Self: 0.0% (0us) | Total: 0.4% (6.5ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (5)

**Calls:**
- `copy` (5)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7644` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `#withSessionPersistenceFenceSync` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17414` | Self: 0.0% (0us) | Total: 0.7% (12.6ms) | Samples: 0

**Called by:**
- `async (anonymous)` (10)

**Calls:**
- `async open` (8)
- `async open` (1)
- `async open` (1)

### `async #initSessionFile`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8363` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `async #tryBoundedFirstOpen` (1)

### `async sweepResidentCacheRoot`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:565` | Self: 0.0% (0us) | Total: 0.1% (2.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `residentCacheOwnerIsStale` (2)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8146` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `readRangeSync` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7662` | Self: 0.0% (0us) | Total: 0.2% (3.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `#prepareResidentTextStoreTransition` (2)
- `#prepareResidentTextStoreTransition` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/index.js:16` | Self: 0.0% (0us) | Total: 0.5% (8.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (7)

**Calls:**
- `loadNative` (6)
- `loadNative` (1)

### `onConstruct`
`internal:streams/destroy:144` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `processTicksAndRejections` (1)

**Calls:**
- `emit` (1)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:307` | Self: 0.0% (0us) | Total: 8.3% (136.8ms) | Samples: 0

**Called by:**
- `async write` (107)

**Calls:**
- `write` (107)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/modes/theme/theme.ts:837` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Calls:**
- `bound min` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:882` | Self: 0.0% (0us) | Total: 0.8% (13.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (11)

**Calls:**
- `from` (11)

### `async sweepResidentCacheRoot`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:564` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `readResidentCacheOwnerSnapshot` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17428` | Self: 0.0% (0us) | Total: 0.5% (9.6ms) | Samples: 0

**Called by:**
- `async open` (8)

**Calls:**
- `canonicalizeTrustedPath` (8)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/gjc-runtime/state-schema.ts:45` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Calls:**
- `get` (1)

### `node:assert/strict`
`node:assert/strict:3` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `assign` (1)

### `compileChildren`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:822` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `compile` (1)

**Calls:**
- `matchExistingProgram` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7931` | Self: 0.0% (0us) | Total: 1.1% (18.1ms) | Samples: 0

**Called by:**
- `consume` (14)

**Calls:**
- `recordFirstOpenGcRequest` (14)

### `memorySample`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:232` | Self: 0.0% (0us) | Total: 2.0% (33.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (17)
- `async runWorker` (4)

**Calls:**
- `gc` (21)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7661` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `async resolveBlobRefsInEntries` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:28` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Calls:**
- `bound require` (1)

### `async resolveBlobRefsInEntries`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4124` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `async resolveBlobRefsInEntries` (1)

### `async worker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4113` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `from` (1)

**Calls:**
- `async (anonymous)` (1)

### `next`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:515` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `lex` (1)

**Calls:**
- `anonymous` (1)

### `ipv6Cidr`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/web/insane/url-guard.ts:127` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `parseIPv6Bytes` (1)

### `#newResidentTextStoreCandidate`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6861` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Called by:**
- `#prepareResidentTextStoreTransition` (2)

**Calls:**
- `openVerifiedResidentCacheInstanceDir` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:14` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` | Self: 0.0% (0us) | Total: 0.1% (2.8ms) | Samples: 0

**Calls:**
- `from` (2)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `get` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/api/propagation.js:11` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `openBufferedWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1815` | Self: 0.0% (0us) | Total: 0.1% (2.3ms) | Samples: 0

**Called by:**
- `openFirstOpenSidecarWriter` (2)

**Calls:**
- `FileSessionStorageWriter` (2)

### `bound clone`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `bound check` (1)

**Calls:**
- `clone` (1)

### `async resolveBlobRefsInEntries`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4134` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `async resolveBlobRefsInEntries` (1)

**Calls:**
- `async runWithConcurrency` (1)

### `openFirstOpenSidecarWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6547` | Self: 0.0% (0us) | Total: 0.1% (2.3ms) | Samples: 0

**Called by:**
- `#buildBoundedFirstOpenSidecars` (1)
- `#scanBoundedTranscriptForFirstOpen` (1)

**Calls:**
- `openBufferedWriter` (2)

### `compileInput`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:508` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `ret` (1)

**Calls:**
- `parse` (1)

### `inspectTranscriptHeaderBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3615` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `readRangeSync` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7859` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `consume` (1)

**Calls:**
- `writeFirstOpenSidecarBytes` (1)

### `matchExistingProgram`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:849` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `compileChildren` (1)

**Calls:**
- `equals` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7860` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `consume` (1)

**Calls:**
- `update` (1)

### `node:crypto`
`node:crypto:2` | Self: 0.0% (0us) | Total: 0.5% (8.8ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `cachedResidentCacheProcessStartTimeMs`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:457` | Self: 0.0% (0us) | Total: 0.1% (2.3ms) | Samples: 0

**Called by:**
- `residentCacheOwnerIsStale` (2)

**Calls:**
- `residentCacheProcessStartTimeMs` (2)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:1027` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `summarize` (1)

### `fsyncFirstOpenSidecarWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6570` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (1)

**Calls:**
- `fsyncSync` (1)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1557` | Self: 0.0% (0us) | Total: 51.5% (847.6ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (659)

**Calls:**
- `consume` (642)
- `consume` (10)
- `consume` (5)
- `consume` (2)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7609` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `startFirstOpenPhase` (1)

### `node:path`
`node:path:2` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `@lazy` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:768` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Calls:**
- `render` (1)

### `openVerifiedResidentCacheDirectory`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:178` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `readResidentCacheOwnerSnapshot` (1)

**Calls:**
- `openSync` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17433` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `inspectTranscriptHeaderBounded` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7629` | Self: 0.0% (0us) | Total: 56.2% (924.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (720)

**Calls:**
- `#scanBoundedTranscriptForFirstOpen` (718)
- `#scanBoundedTranscriptForFirstOpen` (1)
- `#scanBoundedTranscriptForFirstOpen` (1)

### `_makeCompatibilityCheck`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/internal/semver.js:29` | Self: 0.0% (0us) | Total: 1.9% (31.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `[Symbol.match]` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:21` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Calls:**
- `bound min` (1)

### `readRangeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1625` | Self: 0.0% (0us) | Total: 0.1% (2.4ms) | Samples: 0

**Called by:**
- `#buildBoundedFirstOpenSidecars` (1)
- `inspectTranscriptHeaderBounded` (1)

**Calls:**
- `readSync` (2)

### `getRegex`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:13` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `RegExp` (1)

### `#writeToKernel`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1070` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `#flushPending` (1)

**Calls:**
- `writeSync` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7579` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async #initSessionFile` (1)

**Calls:**
- `async #tryBoundedFirstOpen` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1490` | Self: 0.0% (0us) | Total: 50.2% (826.2ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (642)

**Calls:**
- `(anonymous)` (279)
- `(anonymous)` (270)
- `(anonymous)` (68)
- `(anonymous)` (14)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `async measurePhase`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:592` | Self: 0.0% (0us) | Total: 0.1% (2.2ms) | Samples: 0

**Called by:**
- `async runWorker` (2)

**Calls:**
- `async measurePhase` (2)

### `async close`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:14063` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `#releaseResidentTextStore` (1)

### `async #tryInitSessionFileFromSidecar`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7349` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `async #tryInitSessionFileFromSidecar` (1)

**Calls:**
- `#resetSidecarRuntime` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/lib/source-map-generator.js:8` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10456` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `#withSessionPersistenceFenceSync` (1)

**Calls:**
- `createSessionCommitMarkerCheckedSync` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 87.4% | 1.43s | `[native code]` |
| 8.8% | 145.8ms | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/dirs.ts` |
| 1.0% | 16.5ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.5% | 8.8ms | `internal:streams/destroy` |
| 0.5% | 8.2ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.3% | 5.0ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js` |
| 0.1% | 2.9ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts` |
| 0.1% | 2.6ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts` |
| 0.1% | 2.3ms | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js` |
| 0.1% | 2.2ms | `/Users/bellman/Documents/Workspace/gajae-code/packages/tui/src/components/input.ts` |
| 0.0% | 1.5ms | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts` |
| 0.0% | 1.3ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/web/insane/url-guard.ts` |
| 0.0% | 1.3ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js` |
| 0.0% | 1.3ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js` |
| 0.0% | 1.2ms | `node:events` |
| 0.0% | 1.1ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js` |
| 0.0% | 1.1ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/internal/decode-shared.js` |
| 0.0% | 1.1ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js` |
| 0.0% | 1.0ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts` |
