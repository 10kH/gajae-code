# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 1.55s | 904 | 1.0ms | 254 |

**Top 10:** `update` 45.1%, `write` 8.9%, `(anonymous)` 8.2%, `stringify` 6.3%, `byteLength` 4.8%, `gc` 4.1%, `readSync` 4.0%, `anonymous` 3.5%, `parse` 3.4%, `(module)` 2.2%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 45.1% | 702.8ms | 45.1% | 702.8ms | `update` | `[native code]` |
| 8.9% | 140.0ms | 8.9% | 140.0ms | `write` | `[native code]` |
| 8.2% | 127.6ms | 8.2% | 127.6ms | `(anonymous)` | `node:zlib:445` |
| 6.3% | 98.9ms | 6.3% | 98.9ms | `stringify` | `[native code]` |
| 4.8% | 75.8ms | 4.8% | 75.8ms | `byteLength` | `[native code]` |
| 4.1% | 63.9ms | 4.1% | 63.9ms | `gc` | `[native code]` |
| 4.0% | 63.7ms | 4.0% | 63.7ms | `readSync` | `[native code]` |
| 3.5% | 55.5ms | 8.9% | 139.1ms | `anonymous` | `[native code]` |
| 3.4% | 54.1ms | 3.4% | 54.1ms | `parse` | `[native code]` |
| 2.2% | 35.0ms | 2.2% | 35.0ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/dirs.ts:139` |
| 1.9% | 30.0ms | 1.9% | 30.0ms | `toString` | `[native code]` |
| 1.2% | 19.0ms | 1.2% | 19.0ms | `indexOf` | `[native code]` |
| 0.7% | 11.6ms | 0.7% | 11.6ms | `copy` | `[native code]` |
| 0.3% | 4.9ms | 0.3% | 4.9ms | `dlopen` | `[native code]` |
| 0.2% | 4.5ms | 0.2% | 4.5ms | `writer` | `[native code]` |
| 0.2% | 3.3ms | 0.2% | 3.3ms | `init` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:9` |
| 0.2% | 3.3ms | 0.2% | 3.3ms | `digest` | `[native code]` |
| 0.2% | 3.1ms | 0.2% | 3.1ms | `makeSafe` | `internal:primordials` |
| 0.1% | 3.0ms | 0.3% | 6.1ms | `writeSync` | `[native code]` |
| 0.1% | 2.4ms | 0.2% | 3.7ms | `statSync` | `[native code]` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `isSymbolicLink` | `[native code]` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4801` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `openVerifiedResidentCacheInstanceDir` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `#scanBoundedTranscriptForFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `SessionMemoryAccountant` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:148` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:323` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `spawnSync` | `[native code]` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `Segmenter` | `[native code]` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `subarray` | `[native code]` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `createStandardJSONSchemaMethod` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/to-json-schema.js:442` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:209` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `#readColdEntryRange` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `merge` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/modes/theme/theme.ts:35` |
| 0.0% | 1.4ms | 0.1% | 2.8ms | `openSync` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `mergeDefs` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:99` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `RegExp` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `#publishCommitMarkerFromCurrentTranscriptSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `applyOwnerOnlyPathSecurity` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `recordFirstOpenGcRequest` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `WriteStream` | `internal:fs/streams:244` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/config.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `maybeStageNodeModulesAddon` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `hasOwnProperty` | `[native code]` |
| 0.0% | 1.2ms | 85.4% | 1.32s | `(anonymous)` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/decode.js` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `bigint` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `Hash` | `[native code]` |
| 0.0% | 1.0ms | 0.1% | 2.1ms | `lstatSync` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `internal:streams/readable` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `get buffer` | `[native code]` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 85.4% | 1.32s | 0.0% | 1.2ms | `(anonymous)` | `[native code]` |
| 84.1% | 1.30s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 56.8% | 885.1ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7655` |
| 56.7% | 883.4ms | 0.0% | 0us | `#scanBoundedTranscriptForFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7815` |
| 52.7% | 820.4ms | 0.0% | 0us | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1551` |
| 50.7% | 789.7ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1484` |
| 45.1% | 702.8ms | 45.1% | 702.8ms | `update` | `[native code]` |
| 23.1% | 359.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7864` |
| 22.8% | 356.4ms | 0.0% | 0us | `computeLineDigest` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:693` |
| 20.6% | 321.6ms | 0.0% | 0us | `updateBoundedTranscriptHash` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1382` |
| 20.6% | 321.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7821` |
| 10.5% | 163.5ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:366` |
| 10.5% | 163.5ms | 0.0% | 0us | `async write` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:304` |
| 8.9% | 140.0ms | 8.9% | 140.0ms | `write` | `[native code]` |
| 8.9% | 140.0ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:307` |
| 8.9% | 139.1ms | 3.5% | 55.5ms | `anonymous` | `[native code]` |
| 8.6% | 135.1ms | 0.0% | 0us | `map` | `[native code]` |
| 8.2% | 127.6ms | 0.0% | 0us | `node:zlib` | `node:zlib:445` |
| 8.2% | 127.6ms | 8.2% | 127.6ms | `(anonymous)` | `node:zlib:445` |
| 6.3% | 98.9ms | 0.0% | 0us | `serialize` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:302` |
| 6.3% | 98.9ms | 6.3% | 98.9ms | `stringify` | `[native code]` |
| 6.1% | 96.2ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:324` |
| 5.4% | 85.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7825` |
| 5.4% | 84.4ms | 0.0% | 0us | `bound require` | `[native code]` |
| 5.1% | 79.5ms | 0.0% | 0us | `require` | `[native code]` |
| 4.8% | 75.8ms | 4.8% | 75.8ms | `byteLength` | `[native code]` |
| 4.1% | 63.9ms | 4.1% | 63.9ms | `gc` | `[native code]` |
| 4.0% | 63.7ms | 4.0% | 63.7ms | `readSync` | `[native code]` |
| 3.8% | 60.3ms | 0.0% | 0us | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1547` |
| 3.4% | 54.1ms | 3.4% | 54.1ms | `parse` | `[native code]` |
| 3.3% | 52.3ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:349` |
| 2.2% | 35.0ms | 2.2% | 35.0ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/dirs.ts:139` |
| 2.1% | 34.0ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7663` |
| 2.1% | 32.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:20` |
| 1.9% | 30.0ms | 1.9% | 30.0ms | `toString` | `[native code]` |
| 1.7% | 26.5ms | 0.0% | 0us | `memorySample` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:232` |
| 1.6% | 26.0ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8178` |
| 1.5% | 23.5ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:306` |
| 1.2% | 19.0ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1470` |
| 1.2% | 19.0ms | 1.2% | 19.0ms | `indexOf` | `[native code]` |
| 1.2% | 18.9ms | 0.0% | 0us | `async settledMemorySample` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:245` |
| 1.1% | 18.4ms | 0.0% | 0us | `recordFirstOpenGcRequest` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6543` |
| 1.1% | 17.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7958` |
| 0.9% | 14.6ms | 0.0% | 0us | `init` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:22` |
| 0.8% | 12.5ms | 0.0% | 0us | `from` | `[native code]` |
| 0.7% | 11.9ms | 0.0% | 0us | `render` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:493` |
| 0.7% | 11.6ms | 0.7% | 11.6ms | `copy` | `[native code]` |
| 0.7% | 10.9ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 0.7% | 10.9ms | 0.0% | 0us | `node:crypto` | `node:crypto:2` |
| 0.7% | 10.9ms | 0.0% | 0us | `internal:streams/lazy_transform` | `internal:streams/lazy_transform:2` |
| 0.7% | 10.9ms | 0.0% | 0us | `internal:streams/transform` | `internal:streams/transform:2` |
| 0.6% | 10.8ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:882` |
| 0.6% | 10.8ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17458` |
| 0.6% | 10.8ms | 0.0% | 0us | `async openNext` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:865` |
| 0.6% | 10.8ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:871` |
| 0.6% | 10.3ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1480` |
| 0.6% | 10.1ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/utils.ts:185` |
| 0.5% | 8.7ms | 0.0% | 0us | `getHandlebars` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:237` |
| 0.5% | 8.7ms | 0.0% | 0us | `compile` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:485` |
| 0.4% | 7.5ms | 0.0% | 0us | `canonicalizeTrustedPath` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/managed-session-scope.ts:406` |
| 0.4% | 7.5ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17472` |
| 0.4% | 7.2ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:821` |
| 0.4% | 6.9ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/lib/index.js:8` |
| 0.4% | 6.2ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/index.js:16` |
| 0.3% | 6.1ms | 0.1% | 3.0ms | `writeSync` | `[native code]` |
| 0.3% | 5.2ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7689` |
| 0.3% | 4.9ms | 0.3% | 4.9ms | `dlopen` | `[native code]` |
| 0.3% | 4.9ms | 0.0% | 0us | `loadFromCandidates` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:215` |
| 0.3% | 4.9ms | 0.0% | 0us | `loadNative` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:544` |
| 0.2% | 4.6ms | 0.0% | 0us | `openFirstOpenSidecarWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6565` |
| 0.2% | 4.6ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8201` |
| 0.2% | 4.6ms | 0.0% | 0us | `openBufferedWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1815` |
| 0.2% | 4.5ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:848` |
| 0.2% | 4.5ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:300` |
| 0.2% | 4.5ms | 0.2% | 4.5ms | `writer` | `[native code]` |
| 0.2% | 4.5ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:291` |
| 0.2% | 3.7ms | 0.1% | 2.4ms | `statSync` | `[native code]` |
| 0.2% | 3.4ms | 0.0% | 0us | `#prepareResidentTextStoreTransition` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6957` |
| 0.2% | 3.4ms | 0.0% | 0us | `#newResidentTextStoreCandidate` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6879` |
| 0.2% | 3.3ms | 0.2% | 3.3ms | `init` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:9` |
| 0.2% | 3.3ms | 0.0% | 0us | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1625` |
| 0.2% | 3.3ms | 0.2% | 3.3ms | `digest` | `[native code]` |
| 0.2% | 3.2ms | 0.0% | 0us | `ret` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:517` |
| 0.2% | 3.2ms | 0.0% | 0us | `compileInput` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:510` |
| 0.2% | 3.1ms | 0.2% | 3.1ms | `makeSafe` | `internal:primordials` |
| 0.2% | 3.1ms | 0.0% | 0us | `internal:validators` | `internal:validators:2` |
| 0.2% | 3.1ms | 0.0% | 0us | `node:fs/promises` | `node:fs/promises:2` |
| 0.2% | 3.1ms | 0.0% | 0us | `internal:shared` | `internal:shared:2` |
| 0.2% | 3.1ms | 0.0% | 0us | `internal:primordials` | `internal:primordials:71` |
| 0.2% | 3.1ms | 0.0% | 0us | `node:events` | `node:events:9` |
| 0.1% | 3.0ms | 0.0% | 0us | `ZodString` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.1% | 3.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:259` |
| 0.1% | 3.0ms | 0.0% | 0us | `#flushPending` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1080` |
| 0.1% | 3.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7886` |
| 0.1% | 3.0ms | 0.0% | 0us | `writeFirstOpenSidecarBytes` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6575` |
| 0.1% | 3.0ms | 0.0% | 0us | `#writeToKernel` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1070` |
| 0.1% | 3.0ms | 0.0% | 0us | `writeBytesSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1105` |
| 0.1% | 3.0ms | 0.0% | 0us | `#appendBytes` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1096` |
| 0.1% | 2.9ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:18` |
| 0.1% | 2.9ms | 0.0% | 0us | `bound check` | `[native code]` |
| 0.1% | 2.8ms | 0.0% | 1.4ms | `openSync` | `[native code]` |
| 0.1% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js:15` |
| 0.1% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:16` |
| 0.1% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:22` |
| 0.1% | 2.5ms | 0.0% | 0us | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1568` |
| 0.1% | 2.4ms | 0.0% | 0us | `statSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1668` |
| 0.1% | 2.4ms | 0.0% | 0us | `getSessionMemoryStats` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:14300` |
| 0.1% | 2.1ms | 0.0% | 1.0ms | `lstatSync` | `[native code]` |
| 0.1% | 1.8ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1030` |
| 0.1% | 1.8ms | 0.0% | 0us | `ZodLiteral` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.1% | 1.8ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/anthropic-messages-server-schema.ts:83` |
| 0.1% | 1.8ms | 0.0% | 0us | `literal` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1043` |
| 0.1% | 1.8ms | 0.0% | 0us | `FileSessionStorageWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1011` |
| 0.1% | 1.8ms | 0.0% | 0us | `assertNoReparsePath` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:703` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `isSymbolicLink` | `[native code]` |
| 0.1% | 1.8ms | 0.0% | 0us | `#prepareResidentTextStoreTransition` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6958` |
| 0.1% | 1.8ms | 0.0% | 0us | `materializeResidentValueSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4801` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4801` |
| 0.1% | 1.8ms | 0.0% | 0us | `#preparedResidentTransitionFromSource` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6906` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `openVerifiedResidentCacheInstanceDir` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts` |
| 0.1% | 1.7ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8173` |
| 0.1% | 1.7ms | 0.0% | 0us | `compileChildren` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:829` |
| 0.1% | 1.7ms | 0.0% | 0us | `lookupOnContext` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:457` |
| 0.1% | 1.7ms | 0.0% | 0us | `resolvePath` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:519` |
| 0.1% | 1.7ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:770` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js` |
| 0.1% | 1.7ms | 0.0% | 0us | `compile` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:99` |
| 0.1% | 1.7ms | 0.0% | 0us | `replaceStack` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:928` |
| 0.1% | 1.7ms | 0.0% | 0us | `_loop` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:504` |
| 0.1% | 1.7ms | 0.0% | 0us | `compile` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:115` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `#scanBoundedTranscriptForFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.1% | 1.7ms | 0.0% | 0us | `async #tryInitSessionFileFromSidecar` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7349` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `SessionMemoryAccountant` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:148` |
| 0.1% | 1.7ms | 0.0% | 0us | `async #initSessionFile` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8388` |
| 0.1% | 1.7ms | 0.0% | 0us | `async #tryInitSessionFileFromSidecar` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7368` |
| 0.1% | 1.7ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17498` |
| 0.1% | 1.7ms | 0.0% | 0us | `async #initSessionFile` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8380` |
| 0.1% | 1.7ms | 0.0% | 0us | `#resetSidecarRuntime` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10595` |
| 0.1% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:14` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:323` |
| 0.1% | 1.6ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` |
| 0.1% | 1.6ms | 0.0% | 0us | `residentCacheProcessStartTimeMs` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:207` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `spawnSync` | `[native code]` |
| 0.1% | 1.6ms | 0.0% | 0us | `openVerifiedResidentCacheInstanceDir` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:621` |
| 0.1% | 1.6ms | 0.0% | 0us | `writeResidentCacheOwnerToken` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:314` |
| 0.1% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:966` |
| 0.1% | 1.6ms | 0.0% | 0us | `_enum` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1007` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `Segmenter` | `[native code]` |
| 0.1% | 1.6ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/usage.ts:77` |
| 0.1% | 1.6ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/tui/src/utils.ts:173` |
| 0.1% | 1.6ms | 0.0% | 0us | `ZodEnum` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.1% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:1656` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js` |
| 0.1% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7885` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `subarray` | `[native code]` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.1% | 1.5ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/gjc-runtime/state-schema.ts:48` |
| 0.1% | 1.5ms | 0.0% | 0us | `bound optional` | `[native code]` |
| 0.1% | 1.5ms | 0.0% | 0us | `optional` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1110` |
| 0.1% | 1.5ms | 0.0% | 0us | `ZodOptional` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:61` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1105` |
| 0.1% | 1.5ms | 0.0% | 0us | `optional` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:125` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `createStandardJSONSchemaMethod` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/to-json-schema.js:442` |
| 0.1% | 1.5ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17477` |
| 0.1% | 1.5ms | 0.0% | 0us | `inspectTranscriptHeaderBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3609` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:53` |
| 0.0% | 1.5ms | 0.0% | 0us | `_string` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:7` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:209` |
| 0.0% | 1.5ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/utils/discovery/antigravity.ts:63` |
| 0.0% | 1.5ms | 0.0% | 0us | `string` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:290` |
| 0.0% | 1.5ms | 0.0% | 0us | `clone` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:262` |
| 0.0% | 1.5ms | 0.0% | 0us | `bound clone` | `[native code]` |
| 0.0% | 1.5ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:21` |
| 0.0% | 1.5ms | 0.0% | 0us | `bound min` | `[native code]` |
| 0.0% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:900` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `#readColdEntryRange` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.5ms | 0.0% | 0us | `#resolveEntry` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12655` |
| 0.0% | 1.5ms | 0.0% | 0us | `async measurePhase` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:595` |
| 0.0% | 1.5ms | 0.0% | 0us | `getEntry` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16157` |
| 0.0% | 1.5ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:898` |
| 0.0% | 1.5ms | 0.0% | 0us | `async measurePhase` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:592` |
| 0.0% | 1.4ms | 0.0% | 0us | `compile` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:144` |
| 0.0% | 1.4ms | 0.0% | 0us | `createFunctionContext` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:255` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `merge` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js` |
| 0.0% | 1.4ms | 0.0% | 0us | `node:util` | `node:util:2` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/modes/theme/theme.ts:35` |
| 0.0% | 1.4ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:332` |
| 0.0% | 1.4ms | 0.0% | 0us | `FileSessionStorageWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1020` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.0% | 1.4ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:1452` |
| 0.0% | 1.3ms | 0.0% | 0us | `bound refine` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/openai-responses-server-schema.ts:41` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `mergeDefs` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:99` |
| 0.0% | 1.3ms | 0.0% | 0us | `check` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:95` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/lib/source-map-generator.js:9` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:6` |
| 0.0% | 1.3ms | 0.0% | 0us | `getRegex` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:13` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `RegExp` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:14` |
| 0.0% | 1.3ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7671` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `#publishCommitMarkerFromCurrentTranscriptSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.3ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1494` |
| 0.0% | 1.3ms | 0.0% | 0us | `secureOwnerOnlyFileDescriptor` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:668` |
| 0.0% | 1.3ms | 0.0% | 0us | `FileSessionStorageWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1022` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `applyOwnerOnlyPathSecurity` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `recordFirstOpenGcRequest` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.3ms | 0.0% | 0us | `assign` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `WriteStream` | `internal:fs/streams:244` |
| 0.0% | 1.3ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 0.0% | 1.3ms | 0.0% | 0us | `get` | `node:assert:70` |
| 0.0% | 1.3ms | 0.0% | 0us | `node:assert/strict` | `node:assert/strict:3` |
| 0.0% | 1.3ms | 0.0% | 0us | `internal:util/colors` | `internal:util/colors:24` |
| 0.0% | 1.3ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.0% | 1.3ms | 0.0% | 0us | `internal:assert/assertion_error` | `internal:assert/assertion_error:2` |
| 0.0% | 1.3ms | 0.0% | 0us | `refresh` | `internal:util/colors:18` |
| 0.0% | 1.3ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/config.ts:53` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/config.ts` |
| 0.0% | 1.3ms | 0.0% | 0us | `get ReadStream` | `node:fs:578` |
| 0.0% | 1.3ms | 0.0% | 0us | `internal:stream` | `internal:stream:2` |
| 0.0% | 1.3ms | 0.0% | 0us | `node:stream` | `node:stream:2` |
| 0.0% | 1.3ms | 0.0% | 0us | `internal:fs/streams` | `internal:fs/streams:2` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `maybeStageNodeModulesAddon` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js` |
| 0.0% | 1.3ms | 0.0% | 0us | `loadNative` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:541` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:8` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/helpers.js:34` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/base.js:15` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.runtime.js:12` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:8` |
| 0.0% | 1.2ms | 0.0% | 0us | `extend` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/utils.js:31` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `hasOwnProperty` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:35` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/decode.js` |
| 0.0% | 1.2ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/decode.js:58` |
| 0.0% | 1.2ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:918` |
| 0.0% | 1.2ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:892` |
| 0.0% | 1.2ms | 0.0% | 0us | `createHash` | `node:crypto:201` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `Hash` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7866` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `bigint` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 0us | `Hash` | `node:crypto:178` |
| 0.0% | 1.2ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:340` |
| 0.0% | 1.0ms | 0.0% | 0us | `assertResidentCacheDirectory` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:142` |
| 0.0% | 1.0ms | 0.0% | 0us | `async sweepResidentCacheRoot` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:564` |
| 0.0% | 1.0ms | 0.0% | 0us | `readResidentCacheOwnerSnapshot` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:284` |
| 0.0% | 1.0ms | 0.0% | 0us | `openVerifiedResidentCacheDirectory` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:175` |
| 0.0% | 1.0ms | 0.0% | 0us | `bound onceWrapper` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `internal:streams/readable` |
| 0.0% | 1.0ms | 0.0% | 0us | `onceWrapper` | `node:events:194` |
| 0.0% | 1.0ms | 0.0% | 0us | `emit` | `node:events:92` |
| 0.0% | 1.0ms | 0.0% | 0us | `onConstruct` | `internal:streams/destroy:144` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `get buffer` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `decodeBoundedJsonLine` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1356` |

## Function Details

### `update`
`[native code]` | Self: 45.1% (702.8ms) | Total: 45.1% (702.8ms) | Samples: 464

**Called by:**
- `computeLineDigest` (237)
- `updateBoundedTranscriptHash` (214)
- `#buildBoundedFirstOpenSidecars` (13)

### `write`
`[native code]` | Self: 8.9% (140.0ms) | Total: 8.9% (140.0ms) | Samples: 98

**Called by:**
- `async (anonymous)` (98)

### `(anonymous)`
`node:zlib:445` | Self: 8.2% (127.6ms) | Total: 8.2% (127.6ms) | Samples: 1

**Called by:**
- `map` (1)

### `stringify`
`[native code]` | Self: 6.3% (98.9ms) | Total: 6.3% (98.9ms) | Samples: 65

**Called by:**
- `serialize` (65)

### `byteLength`
`[native code]` | Self: 4.8% (75.8ms) | Total: 4.8% (75.8ms) | Samples: 51

**Called by:**
- `async generateTranscript` (35)
- `async (anonymous)` (16)

### `gc`
`[native code]` | Self: 4.1% (63.9ms) | Total: 4.1% (63.9ms) | Samples: 42

**Called by:**
- `memorySample` (17)
- `recordFirstOpenGcRequest` (13)
- `async settledMemorySample` (12)

### `readSync`
`[native code]` | Self: 4.0% (63.7ms) | Total: 4.0% (63.7ms) | Samples: 43

**Called by:**
- `scanTranscriptLinesBounded` (41)
- `readRangeSync` (2)

### `anonymous`
`[native code]` | Self: 3.5% (55.5ms) | Total: 8.9% (139.1ms) | Samples: 10

**Called by:**
- `require` (29)
- `node:util` (1)
- `loadAssertionError` (1)
- `node:stream` (1)
- `node:fs/promises` (1)
- `get ReadStream` (1)
- `internal:assert/assertion_error` (1)
- `internal:validators` (1)
- `internal:stream` (1)
- `internal:streams/transform` (1)
- `node:crypto` (1)
- `internal:fs/streams` (1)
- `internal:streams/duplex` (1)
- `node:assert/strict` (1)
- `internal:shared` (1)
- `internal:streams/lazy_transform` (1)
- `node:events` (1)

**Calls:**
- `(anonymous)` (5)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `internal:assert/assertion_error` (1)
- `(anonymous)` (1)
- `internal:stream` (1)
- `(anonymous)` (1)
- `internal:streams/transform` (1)
- `internal:streams/duplex` (1)
- `internal:primordials` (1)
- `internal:util/colors` (1)
- `(anonymous)` (1)
- `node:stream` (1)
- `(anonymous)` (1)
- `internal:validators` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:fs/streams` (1)
- `(anonymous)` (1)
- `node:assert` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:shared` (1)
- `internal:streams/lazy_transform` (1)
- `node:events` (1)

### `parse`
`[native code]` | Self: 3.4% (54.1ms) | Total: 3.4% (54.1ms) | Samples: 37

**Called by:**
- `(anonymous)` (37)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/dirs.ts:139` | Self: 2.2% (35.0ms) | Total: 2.2% (35.0ms) | Samples: 1

### `toString`
`[native code]` | Self: 1.9% (30.0ms) | Total: 1.9% (30.0ms) | Samples: 20

**Called by:**
- `(anonymous)` (20)

### `indexOf`
`[native code]` | Self: 1.2% (19.0ms) | Total: 1.2% (19.0ms) | Samples: 13

**Called by:**
- `consume` (13)

### `copy`
`[native code]` | Self: 0.7% (11.6ms) | Total: 0.7% (11.6ms) | Samples: 8

**Called by:**
- `consume` (7)
- `consume` (1)

### `dlopen`
`[native code]` | Self: 0.3% (4.9ms) | Total: 0.3% (4.9ms) | Samples: 3

**Called by:**
- `(anonymous)` (3)

### `writer`
`[native code]` | Self: 0.2% (4.5ms) | Total: 0.2% (4.5ms) | Samples: 3

**Called by:**
- `async generateTranscript` (3)

### `init`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:9` | Self: 0.2% (3.3ms) | Total: 0.2% (3.3ms) | Samples: 2

**Called by:**
- `(anonymous)` (1)
- `(anonymous)` (1)

### `digest`
`[native code]` | Self: 0.2% (3.3ms) | Total: 0.2% (3.3ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `makeSafe`
`internal:primordials` | Self: 0.2% (3.1ms) | Total: 0.2% (3.1ms) | Samples: 1

**Called by:**
- `internal:primordials` (1)

### `writeSync`
`[native code]` | Self: 0.1% (3.0ms) | Total: 0.3% (6.1ms) | Samples: 2

**Called by:**
- `writeSync` (2)
- `#writeToKernel` (2)

**Calls:**
- `writeSync` (2)

### `statSync`
`[native code]` | Self: 0.1% (2.4ms) | Total: 0.2% (3.7ms) | Samples: 2

**Called by:**
- `statSync` (2)
- `statSync` (1)

**Calls:**
- `statSync` (1)

### `isSymbolicLink`
`[native code]` | Self: 0.1% (1.8ms) | Total: 0.1% (1.8ms) | Samples: 1

**Called by:**
- `assertNoReparsePath` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4801` | Self: 0.1% (1.8ms) | Total: 0.1% (1.8ms) | Samples: 1

**Called by:**
- `map` (1)

### `openVerifiedResidentCacheInstanceDir`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts` | Self: 0.1% (1.7ms) | Total: 0.1% (1.7ms) | Samples: 1

**Called by:**
- `#newResidentTextStoreCandidate` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js` | Self: 0.1% (1.7ms) | Total: 0.1% (1.7ms) | Samples: 1

**Called by:**
- `replaceStack` (1)

### `#scanBoundedTranscriptForFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.1% (1.7ms) | Total: 0.1% (1.7ms) | Samples: 1

**Called by:**
- `async #tryBoundedFirstOpen` (1)

### `SessionMemoryAccountant`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:148` | Self: 0.1% (1.7ms) | Total: 0.1% (1.7ms) | Samples: 1

**Called by:**
- `#resetSidecarRuntime` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:323` | Self: 0.1% (1.7ms) | Total: 0.1% (1.7ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` | Self: 0.1% (1.6ms) | Total: 0.1% (1.6ms) | Samples: 1

**Called by:**
- `from` (1)

### `spawnSync`
`[native code]` | Self: 0.1% (1.6ms) | Total: 0.1% (1.6ms) | Samples: 1

**Called by:**
- `residentCacheProcessStartTimeMs` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js` | Self: 0.1% (1.6ms) | Total: 0.1% (1.6ms) | Samples: 1

**Called by:**
- `init` (1)

### `Segmenter`
`[native code]` | Self: 0.1% (1.6ms) | Total: 0.1% (1.6ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `subarray`
`[native code]` | Self: 0.1% (1.6ms) | Total: 0.1% (1.6ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.1% (1.6ms) | Total: 0.1% (1.6ms) | Samples: 1

**Called by:**
- `async #tryBoundedFirstOpen` (1)

### `createStandardJSONSchemaMethod`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/to-json-schema.js:442` | Self: 0.1% (1.5ms) | Total: 0.1% (1.5ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:209` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `init` (1)

### `#readColdEntryRange`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `#resolveEntry` (1)

### `merge`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `createFunctionContext` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/modes/theme/theme.ts:35` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

### `openSync`
`[native code]` | Self: 0.0% (1.4ms) | Total: 0.1% (2.8ms) | Samples: 1

**Called by:**
- `FileSessionStorageWriter` (1)
- `openSync` (1)

**Calls:**
- `openSync` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `mergeDefs`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:99` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `check` (1)

### `RegExp`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `getRegex` (1)

### `#publishCommitMarkerFromCurrentTranscriptSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `async #tryBoundedFirstOpen` (1)

### `applyOwnerOnlyPathSecurity`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `secureOwnerOnlyFileDescriptor` (1)

### `recordFirstOpenGcRequest`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `WriteStream`
`internal:fs/streams:244` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/config.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `map` (1)

### `maybeStageNodeModulesAddon`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `loadNative` (1)

### `hasOwnProperty`
`[native code]` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `extend` (1)

### `(anonymous)`
`[native code]` | Self: 0.0% (1.2ms) | Total: 85.4% (1.32s) | Samples: 1

**Called by:**
- `processTicksAndRejections` (873)
- `require` (5)
- `(anonymous)` (5)
- `bound require` (3)
- `refresh` (1)

**Calls:**
- `async #tryBoundedFirstOpen` (593)
- `async generateTranscript` (114)
- `async generateTranscript` (63)
- `async generateTranscript` (35)
- `async #tryBoundedFirstOpen` (18)
- `memorySample` (13)
- `async settledMemorySample` (12)
- `async runWorker` (7)
- `(anonymous)` (5)
- `(module)` (4)
- `async runWorker` (4)
- `dlopen` (3)
- `async runWorker` (3)
- `async #tryBoundedFirstOpen` (3)
- `async generateTranscript` (1)
- `async runWorker` (1)
- `async generateTranscript` (1)
- `async generateTranscript` (1)
- `async sweepResidentCacheRoot` (1)
- `async #tryBoundedFirstOpen` (1)
- `WriteStream` (1)
- `async runWorker` (1)
- `async runWorker` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/decode.js` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `bigint`
`[native code]` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `Hash`
`[native code]` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `Hash` (1)

### `lstatSync`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.1% (2.1ms) | Samples: 1

**Called by:**
- `assertResidentCacheDirectory` (1)
- `lstatSync` (1)

**Calls:**
- `lstatSync` (1)

### `(anonymous)`
`internal:streams/readable` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `onceWrapper` (1)

### `get buffer`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `decodeBoundedJsonLine` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:966` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `decodeBoundedJsonLine`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1356` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `get buffer` (1)

### `node:zlib`
`node:zlib:445` | Self: 0.0% (0us) | Total: 8.2% (127.6ms) | Samples: 0

**Calls:**
- `map` (1)

### `#preparedResidentTransitionFromSource`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6906` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `#prepareResidentTextStoreTransition` (1)

**Calls:**
- `map` (1)

### `emit`
`node:events:92` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `onConstruct` (1)

**Calls:**
- `bound onceWrapper` (1)

### `bound require`
`[native code]` | Self: 0.0% (0us) | Total: 5.4% (84.4ms) | Samples: 0

**Called by:**
- `getHandlebars` (6)
- `(anonymous)` (5)
- `canonicalizeTrustedPath` (5)
- `loadFromCandidates` (3)
- `(anonymous)` (2)
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

**Calls:**
- `require` (34)
- `(anonymous)` (3)

### `loadNative`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:544` | Self: 0.0% (0us) | Total: 0.3% (4.9ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `loadFromCandidates` (3)

### `async openNext`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:865` | Self: 0.0% (0us) | Total: 0.6% (10.8ms) | Samples: 0

**Called by:**
- `from` (7)

**Calls:**
- `async (anonymous)` (7)

### `writeFirstOpenSidecarBytes`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6575` | Self: 0.0% (0us) | Total: 0.1% (3.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `writeBytesSync` (2)

### `updateBoundedTranscriptHash`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1382` | Self: 0.0% (0us) | Total: 20.6% (321.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (214)

**Calls:**
- `update` (214)

### `ZodEnum`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `_enum` (1)

**Calls:**
- `init` (1)

### `statSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1668` | Self: 0.0% (0us) | Total: 0.1% (2.4ms) | Samples: 0

**Called by:**
- `getSessionMemoryStats` (2)

**Calls:**
- `statSync` (2)

### `serialize`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:302` | Self: 0.0% (0us) | Total: 6.3% (98.9ms) | Samples: 0

**Called by:**
- `async generateTranscript` (63)
- `async generateTranscript` (1)
- `async generateTranscript` (1)

**Calls:**
- `stringify` (65)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:918` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `map` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js:15` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `from`
`[native code]` | Self: 0.0% (0us) | Total: 0.8% (12.5ms) | Samples: 0

**Called by:**
- `async runWorker` (7)
- `(module)` (1)

**Calls:**
- `async openNext` (7)
- `(anonymous)` (1)

### `Hash`
`node:crypto:178` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `createHash` (1)

**Calls:**
- `Hash` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:340` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `serialize` (1)

### `refresh`
`internal:util/colors:18` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `internal:util/colors` (1)

**Calls:**
- `(anonymous)` (1)

### `extend`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/utils.js:31` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `hasOwnProperty` (1)

### `openVerifiedResidentCacheInstanceDir`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:621` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `#newResidentTextStoreCandidate` (1)

**Calls:**
- `writeResidentCacheOwnerToken` (1)

### `createHash`
`node:crypto:201` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `computeLineDigest` (1)

**Calls:**
- `Hash` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17498` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `async #initSessionFile` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:259` | Self: 0.0% (0us) | Total: 0.1% (3.0ms) | Samples: 0

**Called by:**
- `init` (2)

**Calls:**
- `init` (1)
- `init` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7825` | Self: 0.0% (0us) | Total: 5.4% (85.2ms) | Samples: 0

**Called by:**
- `consume` (58)

**Calls:**
- `parse` (37)
- `toString` (20)
- `decodeBoundedJsonLine` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/lib/index.js:8` | Self: 0.0% (0us) | Total: 0.4% (6.9ms) | Samples: 0

**Called by:**
- `anonymous` (5)

**Calls:**
- `bound require` (5)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/tui/src/utils.ts:173` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Calls:**
- `Segmenter` (1)

### `internal:util/colors`
`internal:util/colors:24` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `refresh` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:35` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `extend` (1)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `assign` (1)

**Calls:**
- `loadAssertionError` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/utils.ts:185` | Self: 0.0% (0us) | Total: 0.6% (10.1ms) | Samples: 0

**Calls:**
- `render` (7)

### `get ReadStream`
`node:fs:578` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:53` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:61` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `createStandardJSONSchemaMethod` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:18` | Self: 0.0% (0us) | Total: 0.1% (2.9ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/config.ts:53` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Calls:**
- `map` (1)

### `bound onceWrapper`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `emit` (1)

**Calls:**
- `onceWrapper` (1)

### `compile`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:115` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `compileChildren` (1)

**Calls:**
- `lookupOnContext` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17472` | Self: 0.0% (0us) | Total: 0.4% (7.5ms) | Samples: 0

**Called by:**
- `async open` (5)

**Calls:**
- `canonicalizeTrustedPath` (5)

### `bound optional`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `optional` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:349` | Self: 0.0% (0us) | Total: 3.3% (52.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (35)

**Calls:**
- `byteLength` (35)

### `FileSessionStorageWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1022` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `openBufferedWriter` (1)

**Calls:**
- `secureOwnerOnlyFileDescriptor` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7958` | Self: 0.0% (0us) | Total: 1.1% (17.1ms) | Samples: 0

**Called by:**
- `consume` (12)

**Calls:**
- `recordFirstOpenGcRequest` (11)
- `recordFirstOpenGcRequest` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:8` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7821` | Self: 0.0% (0us) | Total: 20.6% (321.6ms) | Samples: 0

**Called by:**
- `consume` (214)

**Calls:**
- `updateBoundedTranscriptHash` (214)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:892` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `map` (1)

### `ZodLiteral`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `literal` (1)

**Calls:**
- `init` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/base.js:15` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `getHandlebars`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:237` | Self: 0.0% (0us) | Total: 0.5% (8.7ms) | Samples: 0

**Called by:**
- `compile` (6)

**Calls:**
- `bound require` (6)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1030` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:22` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:366` | Self: 0.0% (0us) | Total: 10.5% (163.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (114)

**Calls:**
- `async write` (114)

### `init`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:22` | Self: 0.0% (0us) | Total: 0.9% (14.6ms) | Samples: 0

**Called by:**
- `ZodString` (2)
- `(anonymous)` (1)
- `ZodOptional` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `ZodEnum` (1)
- `ZodLiteral` (1)
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

### `optional`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1110` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `optional` (1)

**Calls:**
- `ZodOptional` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/utils/discovery/antigravity.ts:63` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Calls:**
- `string` (1)

### `render`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:493` | Self: 0.0% (0us) | Total: 0.7% (11.9ms) | Samples: 0

**Called by:**
- `(module)` (7)
- `(module)` (1)

**Calls:**
- `compile` (6)
- `ret` (2)

### `canonicalizeTrustedPath`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/managed-session-scope.ts:406` | Self: 0.0% (0us) | Total: 0.4% (7.5ms) | Samples: 0

**Called by:**
- `async open` (5)

**Calls:**
- `bound require` (5)

### `getSessionMemoryStats`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:14300` | Self: 0.0% (0us) | Total: 0.1% (2.4ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `statSync` (2)

### `#scanBoundedTranscriptForFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7815` | Self: 0.0% (0us) | Total: 56.7% (883.4ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (592)

**Calls:**
- `scanTranscriptLinesBounded` (549)
- `scanTranscriptLinesBounded` (41)
- `scanTranscriptLinesBounded` (2)

### `compileInput`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:510` | Self: 0.0% (0us) | Total: 0.2% (3.2ms) | Samples: 0

**Called by:**
- `ret` (2)

**Calls:**
- `compile` (1)
- `compile` (1)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 84.1% (1.30s) | Samples: 0

**Calls:**
- `(anonymous)` (873)
- `onConstruct` (1)

### `writeBytesSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1105` | Self: 0.0% (0us) | Total: 0.1% (3.0ms) | Samples: 0

**Called by:**
- `writeFirstOpenSidecarBytes` (2)

**Calls:**
- `#appendBytes` (2)

### `async settledMemorySample`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:245` | Self: 0.0% (0us) | Total: 1.2% (18.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (12)

**Calls:**
- `gc` (12)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:770` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Calls:**
- `render` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/openai-responses-server-schema.ts:41` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Calls:**
- `bound refine` (1)

### `loadFromCandidates`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:215` | Self: 0.0% (0us) | Total: 0.3% (4.9ms) | Samples: 0

**Called by:**
- `loadNative` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:16` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:332` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `serialize` (1)

### `internal:validators`
`internal:validators:2` | Self: 0.0% (0us) | Total: 0.2% (3.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `compile`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:99` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `compileInput` (1)

**Calls:**
- `compileChildren` (1)

### `compile`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:485` | Self: 0.0% (0us) | Total: 0.5% (8.7ms) | Samples: 0

**Called by:**
- `render` (6)

**Calls:**
- `getHandlebars` (6)

### `readRangeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1625` | Self: 0.0% (0us) | Total: 0.2% (3.3ms) | Samples: 0

**Called by:**
- `inspectTranscriptHeaderBounded` (1)
- `#buildBoundedFirstOpenSidecars` (1)

**Calls:**
- `readSync` (2)

### `ZodString`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.1% (3.0ms) | Samples: 0

**Called by:**
- `_string` (1)
- `clone` (1)

**Calls:**
- `init` (2)

### `internal:fs/streams`
`internal:fs/streams:2` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `openVerifiedResidentCacheDirectory`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:175` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `readResidentCacheOwnerSnapshot` (1)

**Calls:**
- `assertResidentCacheDirectory` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:14` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Calls:**
- `getRegex` (1)

### `getEntry`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16157` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `#resolveEntry` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:1656` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 0.7% (10.9ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `openFirstOpenSidecarWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6565` | Self: 0.0% (0us) | Total: 0.2% (4.6ms) | Samples: 0

**Called by:**
- `#buildBoundedFirstOpenSidecars` (3)

**Calls:**
- `openBufferedWriter` (3)

### `internal:stream`
`internal:stream:2` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `readResidentCacheOwnerSnapshot`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:284` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `async sweepResidentCacheRoot` (1)

**Calls:**
- `openVerifiedResidentCacheDirectory` (1)

### `ret`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:517` | Self: 0.0% (0us) | Total: 0.2% (3.2ms) | Samples: 0

**Called by:**
- `render` (2)

**Calls:**
- `compileInput` (2)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:1452` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Calls:**
- `async runWorker` (1)

### `async measurePhase`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:595` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `async measurePhase` (1)

**Calls:**
- `(anonymous)` (1)

### `#prepareResidentTextStoreTransition`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6958` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `#preparedResidentTransitionFromSource` (1)

### `internal:streams/transform`
`internal:streams/transform:2` | Self: 0.0% (0us) | Total: 0.7% (10.9ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `secureOwnerOnlyFileDescriptor`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:668` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `FileSessionStorageWriter` (1)

**Calls:**
- `applyOwnerOnlyPathSecurity` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17458` | Self: 0.0% (0us) | Total: 0.6% (10.8ms) | Samples: 0

**Called by:**
- `async (anonymous)` (7)

**Calls:**
- `async open` (5)
- `async open` (1)
- `async open` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8178` | Self: 0.0% (0us) | Total: 1.6% (26.0ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (13)

**Calls:**
- `update` (13)

### `string`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:290` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `_string` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7663` | Self: 0.0% (0us) | Total: 2.1% (34.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (18)

**Calls:**
- `#buildBoundedFirstOpenSidecars` (13)
- `#buildBoundedFirstOpenSidecars` (3)
- `#buildBoundedFirstOpenSidecars` (1)
- `#buildBoundedFirstOpenSidecars` (1)

### `bound refine`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `bound check` (1)

### `loadNative`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:541` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `maybeStageNodeModulesAddon` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1480` | Self: 0.0% (0us) | Total: 0.6% (10.3ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (7)

**Calls:**
- `copy` (7)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/helpers.js:34` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `#flushPending`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1080` | Self: 0.0% (0us) | Total: 0.1% (3.0ms) | Samples: 0

**Called by:**
- `#appendBytes` (2)

**Calls:**
- `#writeToKernel` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7886` | Self: 0.0% (0us) | Total: 0.1% (3.0ms) | Samples: 0

**Called by:**
- `consume` (2)

**Calls:**
- `writeFirstOpenSidecarBytes` (2)

### `#prepareResidentTextStoreTransition`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6957` | Self: 0.0% (0us) | Total: 0.2% (3.4ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (2)

**Calls:**
- `#newResidentTextStoreCandidate` (2)

### `clone`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:262` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `bound clone` (1)

**Calls:**
- `ZodString` (1)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:871` | Self: 0.0% (0us) | Total: 0.6% (10.8ms) | Samples: 0

**Called by:**
- `async openNext` (7)

**Calls:**
- `async open` (7)

### `assertResidentCacheDirectory`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:142` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `openVerifiedResidentCacheDirectory` (1)

**Calls:**
- `lstatSync` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1470` | Self: 0.0% (0us) | Total: 1.2% (19.0ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (13)

**Calls:**
- `indexOf` (13)

### `internal:assert/assertion_error`
`internal:assert/assertion_error:2` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `require`
`[native code]` | Self: 0.0% (0us) | Total: 5.1% (79.5ms) | Samples: 0

**Called by:**
- `bound require` (34)

**Calls:**
- `anonymous` (29)
- `(anonymous)` (5)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/anthropic-messages-server-schema.ts:83` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Calls:**
- `literal` (1)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:306` | Self: 0.0% (0us) | Total: 1.5% (23.5ms) | Samples: 0

**Called by:**
- `async write` (16)

**Calls:**
- `byteLength` (16)

### `assertNoReparsePath`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:703` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `FileSessionStorageWriter` (1)

**Calls:**
- `isSymbolicLink` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1105` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `node:stream`
`node:stream:2` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `node:fs/promises`
`node:fs/promises:2` | Self: 0.0% (0us) | Total: 0.2% (3.1ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:900` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `async measurePhase` (1)

**Calls:**
- `getEntry` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:324` | Self: 0.0% (0us) | Total: 6.1% (96.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (63)

**Calls:**
- `serialize` (63)

### `async #initSessionFile`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8388` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `async #initSessionFile` (1)

**Calls:**
- `async #tryInitSessionFileFromSidecar` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/gjc-runtime/state-schema.ts:48` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Calls:**
- `bound optional` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.runtime.js:12` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `bound check`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (2.9ms) | Samples: 0

**Called by:**
- `bound min` (1)
- `bound refine` (1)

**Calls:**
- `bound clone` (1)
- `check` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:6` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `internal:shared`
`internal:shared:2` | Self: 0.0% (0us) | Total: 0.2% (3.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `ZodOptional`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `optional` (1)

**Calls:**
- `init` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/index.js:16` | Self: 0.0% (0us) | Total: 0.4% (6.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `loadNative` (3)
- `loadNative` (1)

### `#appendBytes`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1096` | Self: 0.0% (0us) | Total: 0.1% (3.0ms) | Samples: 0

**Called by:**
- `writeBytesSync` (2)

**Calls:**
- `#flushPending` (2)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:821` | Self: 0.0% (0us) | Total: 0.4% (7.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `memorySample` (4)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:898` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `async measurePhase` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/usage.ts:77` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Calls:**
- `_enum` (1)

### `async #initSessionFile`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8380` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `async #initSessionFile` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8201` | Self: 0.0% (0us) | Total: 0.2% (4.6ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (3)

**Calls:**
- `openFirstOpenSidecarWriter` (3)

### `residentCacheProcessStartTimeMs`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:207` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `writeResidentCacheOwnerToken` (1)

**Calls:**
- `spawnSync` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1484` | Self: 0.0% (0us) | Total: 50.7% (789.7ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (528)

**Calls:**
- `(anonymous)` (240)
- `(anonymous)` (214)
- `(anonymous)` (58)
- `(anonymous)` (12)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `inspectTranscriptHeaderBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3609` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `readRangeSync` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7864` | Self: 0.0% (0us) | Total: 23.1% (359.7ms) | Samples: 0

**Called by:**
- `consume` (240)

**Calls:**
- `computeLineDigest` (238)
- `digest` (2)

### `FileSessionStorageWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1020` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `openBufferedWriter` (1)

**Calls:**
- `openSync` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:848` | Self: 0.0% (0us) | Total: 0.2% (4.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `async generateTranscript` (3)

### `onceWrapper`
`node:events:194` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `bound onceWrapper` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/lib/source-map-generator.js:9` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7671` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `#publishCommitMarkerFromCurrentTranscriptSync` (1)

### `_enum`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1007` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `ZodEnum` (1)

### `assign`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `node:assert` (1)

**Calls:**
- `get` (1)

### `optional`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:125` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `bound optional` (1)

**Calls:**
- `optional` (1)

### `node:util`
`node:util:2` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7885` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `consume` (1)

**Calls:**
- `subarray` (1)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1551` | Self: 0.0% (0us) | Total: 52.7% (820.4ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (549)

**Calls:**
- `consume` (528)
- `consume` (13)
- `consume` (7)
- `consume` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1494` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (1)

**Calls:**
- `copy` (1)

### `map`
`[native code]` | Self: 0.0% (0us) | Total: 8.6% (135.1ms) | Samples: 0

**Called by:**
- `node:zlib` (1)
- `#preparedResidentTransitionFromSource` (1)
- `materializeResidentValueSync` (1)
- `async runWorker` (1)
- `async runWorker` (1)
- `(module)` (1)

**Calls:**
- `getSessionMemoryStats` (2)
- `(anonymous)` (1)
- `materializeResidentValueSync` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `computeLineDigest`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:693` | Self: 0.0% (0us) | Total: 22.8% (356.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (238)

**Calls:**
- `update` (237)
- `createHash` (1)

### `_loop`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:504` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `resolvePath` (1)

**Calls:**
- `replaceStack` (1)

### `async write`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:304` | Self: 0.0% (0us) | Total: 10.5% (163.5ms) | Samples: 0

**Called by:**
- `async generateTranscript` (114)

**Calls:**
- `async (anonymous)` (98)
- `async (anonymous)` (16)

### `lookupOnContext`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:457` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `compile` (1)

**Calls:**
- `resolvePath` (1)

### `async sweepResidentCacheRoot`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:564` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `readResidentCacheOwnerSnapshot` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:8` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `onConstruct`
`internal:streams/destroy:144` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `processTicksAndRejections` (1)

**Calls:**
- `emit` (1)

### `_string`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:7` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `string` (1)

**Calls:**
- `ZodString` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:300` | Self: 0.0% (0us) | Total: 0.2% (4.5ms) | Samples: 0

**Called by:**
- `async generateTranscript` (3)

**Calls:**
- `writer` (3)

### `compileChildren`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:829` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `compile` (1)

**Calls:**
- `compile` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:882` | Self: 0.0% (0us) | Total: 0.6% (10.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (7)

**Calls:**
- `from` (7)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:307` | Self: 0.0% (0us) | Total: 8.9% (140.0ms) | Samples: 0

**Called by:**
- `async write` (98)

**Calls:**
- `write` (98)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8173` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `readRangeSync` (1)

### `node:assert/strict`
`node:assert/strict:3` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:291` | Self: 0.0% (0us) | Total: 0.2% (4.5ms) | Samples: 0

**Called by:**
- `async runWorker` (3)

**Calls:**
- `async generateTranscript` (3)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `assign` (1)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `get` (1)

**Calls:**
- `anonymous` (1)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1547` | Self: 0.0% (0us) | Total: 3.8% (60.3ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (41)

**Calls:**
- `readSync` (41)

### `#resolveEntry`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12655` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `getEntry` (1)

**Calls:**
- `#readColdEntryRange` (1)

### `memorySample`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:232` | Self: 0.0% (0us) | Total: 1.7% (26.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (13)
- `async runWorker` (4)

**Calls:**
- `gc` (17)

### `node:events`
`node:events:9` | Self: 0.0% (0us) | Total: 0.2% (3.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `createFunctionContext`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:255` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `compile` (1)

**Calls:**
- `merge` (1)

### `FileSessionStorageWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1011` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `openBufferedWriter` (1)

**Calls:**
- `assertNoReparsePath` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Calls:**
- `from` (1)

### `internal:primordials`
`internal:primordials:71` | Self: 0.0% (0us) | Total: 0.2% (3.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `makeSafe` (1)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1568` | Self: 0.0% (0us) | Total: 0.1% (2.5ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (2)

**Calls:**
- `recordFirstOpenGcRequest` (2)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7689` | Self: 0.0% (0us) | Total: 0.3% (5.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `#prepareResidentTextStoreTransition` (2)
- `#prepareResidentTextStoreTransition` (1)

### `#resetSidecarRuntime`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10595` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `async #tryInitSessionFileFromSidecar` (1)

**Calls:**
- `SessionMemoryAccountant` (1)

### `openBufferedWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1815` | Self: 0.0% (0us) | Total: 0.2% (4.6ms) | Samples: 0

**Called by:**
- `openFirstOpenSidecarWriter` (3)

**Calls:**
- `FileSessionStorageWriter` (1)
- `FileSessionStorageWriter` (1)
- `FileSessionStorageWriter` (1)

### `bound clone`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `bound check` (1)

**Calls:**
- `clone` (1)

### `materializeResidentValueSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4801` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `map` (1)

### `async #tryInitSessionFileFromSidecar`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7368` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `async #tryInitSessionFileFromSidecar` (1)

**Calls:**
- `#resetSidecarRuntime` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:20` | Self: 0.0% (0us) | Total: 2.1% (32.7ms) | Samples: 0

**Calls:**
- `bound require` (1)

### `#newResidentTextStoreCandidate`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6879` | Self: 0.0% (0us) | Total: 0.2% (3.4ms) | Samples: 0

**Called by:**
- `#prepareResidentTextStoreTransition` (2)

**Calls:**
- `openVerifiedResidentCacheInstanceDir` (1)
- `openVerifiedResidentCacheInstanceDir` (1)

### `node:crypto`
`node:crypto:2` | Self: 0.0% (0us) | Total: 0.7% (10.9ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `literal`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1043` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `ZodLiteral` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7866` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `consume` (1)

**Calls:**
- `bigint` (1)

### `compile`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:144` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `compileInput` (1)

**Calls:**
- `createFunctionContext` (1)

### `check`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:95` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `bound check` (1)

**Calls:**
- `mergeDefs` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17477` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `inspectTranscriptHeaderBounded` (1)

### `async measurePhase`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:592` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `async runWorker` (1)

**Calls:**
- `async measurePhase` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/decode.js:58` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Calls:**
- `(anonymous)` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7655` | Self: 0.0% (0us) | Total: 56.8% (885.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (593)

**Calls:**
- `#scanBoundedTranscriptForFirstOpen` (592)
- `#scanBoundedTranscriptForFirstOpen` (1)

### `resolvePath`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:519` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `lookupOnContext` (1)

**Calls:**
- `_loop` (1)

### `bound min`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `bound check` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:21` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Calls:**
- `bound min` (1)

### `internal:streams/lazy_transform`
`internal:streams/lazy_transform:2` | Self: 0.0% (0us) | Total: 0.7% (10.9ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `getRegex`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:13` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `RegExp` (1)

### `#writeToKernel`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1070` | Self: 0.0% (0us) | Total: 0.1% (3.0ms) | Samples: 0

**Called by:**
- `#flushPending` (2)

**Calls:**
- `writeSync` (2)

### `recordFirstOpenGcRequest`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6543` | Self: 0.0% (0us) | Total: 1.1% (18.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (11)
- `scanTranscriptLinesBounded` (2)

**Calls:**
- `gc` (13)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:14` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async #tryInitSessionFileFromSidecar`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7349` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `async #initSessionFile` (1)

**Calls:**
- `async #tryInitSessionFileFromSidecar` (1)

### `replaceStack`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:928` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `_loop` (1)

**Calls:**
- `(anonymous)` (1)

### `writeResidentCacheOwnerToken`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:314` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `openVerifiedResidentCacheInstanceDir` (1)

**Calls:**
- `residentCacheProcessStartTimeMs` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 86.8% | 1.35s | `[native code]` |
| 8.2% | 127.6ms | `node:zlib` |
| 2.2% | 35.0ms | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/dirs.ts` |
| 0.6% | 9.4ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.2% | 3.3ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js` |
| 0.2% | 3.1ms | `internal:primordials` |
| 0.2% | 3.1ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.1% | 1.7ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts` |
| 0.1% | 1.7ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js` |
| 0.1% | 1.7ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts` |
| 0.1% | 1.6ms | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts` |
| 0.1% | 1.6ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js` |
| 0.1% | 1.5ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/to-json-schema.js` |
| 0.0% | 1.5ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js` |
| 0.0% | 1.4ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js` |
| 0.0% | 1.4ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/modes/theme/theme.ts` |
| 0.0% | 1.3ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js` |
| 0.0% | 1.3ms | `internal:fs/streams` |
| 0.0% | 1.3ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/config.ts` |
| 0.0% | 1.3ms | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js` |
| 0.0% | 1.2ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/decode.js` |
| 0.0% | 1.0ms | `internal:streams/readable` |
