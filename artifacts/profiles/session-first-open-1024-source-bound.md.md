# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 1.62s | 936 | 1.0ms | 258 |

**Top 10:** `update` 44.8%, `write` 11.3%, `DirResolver` 6.8%, `byteLength` 5.1%, `stringify` 4.9%, `gc` 4.2%, `parse` 3.5%, `node:net` 3.5%, `readSync` 3.1%, `bound require` 2.1%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 44.8% | 730.6ms | 44.8% | 730.6ms | `update` | `[native code]` |
| 11.3% | 184.9ms | 11.3% | 184.9ms | `write` | `[native code]` |
| 6.8% | 112.0ms | 6.8% | 112.0ms | `DirResolver` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/dirs.ts:234` |
| 5.1% | 83.4ms | 5.1% | 83.4ms | `byteLength` | `[native code]` |
| 4.9% | 81.3ms | 4.9% | 81.3ms | `stringify` | `[native code]` |
| 4.2% | 68.8ms | 4.2% | 68.8ms | `gc` | `[native code]` |
| 3.5% | 58.2ms | 3.5% | 58.2ms | `parse` | `[native code]` |
| 3.5% | 57.5ms | 3.5% | 57.5ms | `node:net` | `node:net:1267` |
| 3.1% | 51.7ms | 3.1% | 51.7ms | `readSync` | `[native code]` |
| 2.1% | 34.8ms | 6.1% | 99.6ms | `bound require` | `[native code]` |
| 1.8% | 30.6ms | 7.4% | 121.5ms | `anonymous` | `[native code]` |
| 1.8% | 29.8ms | 1.8% | 29.8ms | `toString` | `[native code]` |
| 0.7% | 12.3ms | 0.7% | 12.3ms | `indexOf` | `[native code]` |
| 0.6% | 11.2ms | 0.6% | 11.2ms | `copy` | `[native code]` |
| 0.5% | 8.7ms | 1.0% | 17.5ms | `openSync` | `[native code]` |
| 0.4% | 7.6ms | 0.4% | 7.6ms | `dlopen` | `[native code]` |
| 0.1% | 2.9ms | 0.1% | 2.9ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:330` |
| 0.1% | 2.6ms | 0.1% | 2.6ms | `Hash` | `[native code]` |
| 0.1% | 2.4ms | 0.1% | 2.4ms | `defineProperty` | `[native code]` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:368` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/gjc-runtime/state-schema.ts:144` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `#assertOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `bigint` | `[native code]` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `Hash` | `node:crypto:179` |
| 0.1% | 1.6ms | 5.0% | 82.9ms | `serialize` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:302` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `spawnSync` | `[native code]` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `objectLiteral` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `next` | `[native code]` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `_string` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:7` |
| 0.0% | 1.6ms | 5.5% | 89.7ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7806` |
| 0.0% | 1.6ms | 0.0% | 1.6ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/checks.js` |
| 0.0% | 1.6ms | 0.0% | 1.6ms | `dictionaryPartitionPaths` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `#resolvedProviderStateEntries` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.5ms | 2.1% | 34.8ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:8` |
| 0.0% | 1.4ms | 0.7% | 11.8ms | `init` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:22` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `readEntity` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/internal/encode-shared.js:28` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1533` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7869` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `RegExp` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `tryCharge` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `getRandomValues` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `renameNoReplacePath` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:299` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `getSessionMemoryStats` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:14325` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `createRequire` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `preprocess` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `bytesStartWith` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1352` |
| 0.0% | 1.2ms | 0.1% | 2.4ms | `mkdirSync` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `assertResidentCacheDirectory` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:142` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `digest` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `Segmenter` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `verifyOwnerOnlyPathSecurity` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `subarray` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `opcode` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:348` |
| 0.0% | 987us | 0.0% | 987us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7848` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 85.7% | 1.39s | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 84.1% | 1.37s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 55.5% | 904.6ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7636` |
| 55.4% | 903.4ms | 0.0% | 0us | `#scanBoundedTranscriptForFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7796` |
| 52.2% | 851.3ms | 0.0% | 0us | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1542` |
| 50.8% | 829.1ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1475` |
| 44.8% | 730.6ms | 44.8% | 730.6ms | `update` | `[native code]` |
| 22.4% | 365.9ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7845` |
| 22.3% | 364.7ms | 0.0% | 0us | `computeLineDigest` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:693` |
| 21.2% | 346.2ms | 0.0% | 0us | `updateBoundedTranscriptHash` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1373` |
| 21.2% | 346.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7802` |
| 12.9% | 210.9ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:366` |
| 12.9% | 210.9ms | 0.0% | 0us | `async write` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:304` |
| 11.3% | 184.9ms | 11.3% | 184.9ms | `write` | `[native code]` |
| 11.1% | 181.6ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:307` |
| 7.4% | 121.5ms | 1.8% | 30.6ms | `anonymous` | `[native code]` |
| 6.8% | 112.0ms | 6.8% | 112.0ms | `DirResolver` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/dirs.ts:234` |
| 6.8% | 112.0ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/dirs.ts:337` |
| 6.1% | 99.6ms | 2.1% | 34.8ms | `bound require` | `[native code]` |
| 5.5% | 89.7ms | 0.0% | 1.6ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7806` |
| 5.1% | 83.4ms | 5.1% | 83.4ms | `byteLength` | `[native code]` |
| 5.0% | 82.9ms | 0.1% | 1.6ms | `serialize` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:302` |
| 4.9% | 81.3ms | 4.9% | 81.3ms | `stringify` | `[native code]` |
| 4.9% | 80.4ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:324` |
| 4.2% | 68.8ms | 4.2% | 68.8ms | `gc` | `[native code]` |
| 3.5% | 58.2ms | 3.5% | 58.2ms | `parse` | `[native code]` |
| 3.5% | 57.5ms | 3.5% | 57.5ms | `node:net` | `node:net:1267` |
| 3.5% | 57.0ms | 0.0% | 0us | `require` | `[native code]` |
| 3.3% | 54.1ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:349` |
| 3.1% | 51.7ms | 3.1% | 51.7ms | `readSync` | `[native code]` |
| 2.9% | 48.5ms | 0.0% | 0us | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1538` |
| 2.1% | 34.8ms | 0.0% | 1.5ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:8` |
| 1.9% | 31.2ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7644` |
| 1.8% | 29.8ms | 1.8% | 29.8ms | `toString` | `[native code]` |
| 1.7% | 29.2ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:306` |
| 1.6% | 27.3ms | 0.0% | 0us | `memorySample` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:232` |
| 1.5% | 25.3ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8159` |
| 1.4% | 22.9ms | 0.0% | 0us | `async settledMemorySample` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:245` |
| 1.1% | 18.5ms | 0.0% | 0us | `recordFirstOpenGcRequest` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6524` |
| 1.0% | 17.5ms | 0.5% | 8.7ms | `openSync` | `[native code]` |
| 1.0% | 16.8ms | 0.0% | 0us | `from` | `[native code]` |
| 0.9% | 15.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7939` |
| 0.8% | 13.9ms | 0.0% | 0us | `render` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:493` |
| 0.8% | 13.9ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:882` |
| 0.8% | 13.9ms | 0.0% | 0us | `async openNext` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:865` |
| 0.8% | 13.9ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17434` |
| 0.8% | 13.9ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:871` |
| 0.7% | 12.3ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1461` |
| 0.7% | 12.3ms | 0.7% | 12.3ms | `indexOf` | `[native code]` |
| 0.7% | 11.9ms | 0.0% | 0us | `internal:streams/transform` | `internal:streams/transform:2` |
| 0.7% | 11.9ms | 0.0% | 0us | `internal:streams/lazy_transform` | `internal:streams/lazy_transform:2` |
| 0.7% | 11.9ms | 0.0% | 0us | `internal:streams/readable` | `internal:streams/readable:14` |
| 0.7% | 11.9ms | 0.0% | 0us | `node:crypto` | `node:crypto:2` |
| 0.7% | 11.9ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 0.7% | 11.8ms | 0.0% | 1.4ms | `init` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:22` |
| 0.6% | 11.2ms | 0.6% | 11.2ms | `copy` | `[native code]` |
| 0.6% | 10.6ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17448` |
| 0.6% | 10.6ms | 0.0% | 0us | `canonicalizeTrustedPath` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/managed-session-scope.ts:406` |
| 0.5% | 9.4ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/utils.ts:185` |
| 0.5% | 9.4ms | 0.0% | 0us | `compile` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:485` |
| 0.5% | 9.4ms | 0.0% | 0us | `getHandlebars` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:237` |
| 0.5% | 8.9ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/index.js:16` |
| 0.4% | 8.0ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:821` |
| 0.4% | 7.8ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/lib/index.js:8` |
| 0.4% | 7.6ms | 0.4% | 7.6ms | `dlopen` | `[native code]` |
| 0.4% | 7.6ms | 0.0% | 0us | `loadFromCandidates` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:215` |
| 0.4% | 7.6ms | 0.0% | 0us | `loadNative` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:544` |
| 0.4% | 7.3ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1485` |
| 0.4% | 7.2ms | 0.0% | 0us | `externalizeResidentValueSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4731` |
| 0.4% | 7.0ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7670` |
| 0.3% | 4.9ms | 0.0% | 0us | `map` | `[native code]` |
| 0.2% | 4.3ms | 0.0% | 0us | `createHash` | `node:crypto:201` |
| 0.2% | 3.6ms | 0.0% | 0us | `#prepareResidentTextStoreTransition` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6939` |
| 0.2% | 3.6ms | 0.0% | 0us | `externalizeResidentValueSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4700` |
| 0.2% | 3.6ms | 0.0% | 0us | `putResidentCacheBlobSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:798` |
| 0.2% | 3.6ms | 0.0% | 0us | `#preparedResidentTransitionFromSource` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6897` |
| 0.2% | 3.6ms | 0.0% | 0us | `putSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:1133` |
| 0.2% | 3.4ms | 0.0% | 0us | `#newResidentTextStoreCandidate` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6860` |
| 0.2% | 3.4ms | 0.0% | 0us | `#prepareResidentTextStoreTransition` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6938` |
| 0.2% | 3.4ms | 0.0% | 0us | `openVerifiedResidentCacheInstanceDir` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:621` |
| 0.2% | 3.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7864` |
| 0.2% | 3.3ms | 0.0% | 0us | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1559` |
| 0.2% | 3.2ms | 0.0% | 0us | `writeFirstOpenSidecarBytes` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6556` |
| 0.2% | 3.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7867` |
| 0.1% | 3.1ms | 0.0% | 0us | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1625` |
| 0.1% | 3.0ms | 0.0% | 0us | `node:fs/promises` | `node:fs/promises:2` |
| 0.1% | 3.0ms | 0.0% | 0us | `internal:validators` | `internal:validators:2` |
| 0.1% | 3.0ms | 0.0% | 0us | `node:events` | `node:events:9` |
| 0.1% | 2.9ms | 0.0% | 0us | `async measurePhase` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:595` |
| 0.1% | 2.9ms | 0.0% | 0us | `async measurePhase` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:592` |
| 0.1% | 2.9ms | 0.1% | 2.9ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:330` |
| 0.1% | 2.8ms | 0.0% | 0us | `node:util` | `node:util:2` |
| 0.1% | 2.7ms | 0.0% | 0us | `ret` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:517` |
| 0.1% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/base.js:15` |
| 0.1% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:8` |
| 0.1% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.runtime.js:12` |
| 0.1% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/helpers.js:14` |
| 0.1% | 2.6ms | 0.0% | 0us | `Hash` | `node:crypto:178` |
| 0.1% | 2.6ms | 0.1% | 2.6ms | `Hash` | `[native code]` |
| 0.1% | 2.5ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1471` |
| 0.1% | 2.4ms | 0.0% | 1.2ms | `mkdirSync` | `[native code]` |
| 0.1% | 2.4ms | 0.1% | 2.4ms | `defineProperty` | `[native code]` |
| 0.1% | 2.1ms | 0.0% | 0us | `accept` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:108` |
| 0.1% | 1.8ms | 0.0% | 0us | `node:assert/strict` | `node:assert/strict:3` |
| 0.1% | 1.8ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:14` |
| 0.1% | 1.8ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:766` |
| 0.1% | 1.8ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:218` |
| 0.1% | 1.8ms | 0.0% | 0us | `ret` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:191` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:368` |
| 0.1% | 1.8ms | 0.0% | 0us | `addHelpers` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:366` |
| 0.1% | 1.8ms | 0.0% | 0us | `forEach` | `[native code]` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/gjc-runtime/state-schema.ts:144` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `#assertOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts` |
| 0.1% | 1.7ms | 0.0% | 0us | `writeBytesSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1103` |
| 0.1% | 1.7ms | 0.0% | 0us | `writeResidentCacheOwnerToken` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:326` |
| 0.1% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:6` |
| 0.1% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:16` |
| 0.1% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js:15` |
| 0.1% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/lib/source-map-generator.js:9` |
| 0.1% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:22` |
| 0.1% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7847` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `bigint` | `[native code]` |
| 0.1% | 1.7ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:807` |
| 0.1% | 1.7ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:1452` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.1% | 1.7ms | 0.0% | 0us | `getEntry` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16133` |
| 0.1% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:900` |
| 0.1% | 1.7ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:898` |
| 0.1% | 1.7ms | 0.0% | 0us | `#findColdEntryIndex` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12385` |
| 0.1% | 1.7ms | 0.0% | 0us | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1617` |
| 0.1% | 1.7ms | 0.0% | 0us | `#resolveEntry` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12634` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `Hash` | `node:crypto:179` |
| 0.1% | 1.6ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8182` |
| 0.1% | 1.6ms | 0.0% | 0us | `openFirstOpenSidecarWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6546` |
| 0.1% | 1.6ms | 0.0% | 0us | `openBufferedWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1815` |
| 0.1% | 1.6ms | 0.0% | 0us | `FileSessionStorageWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1020` |
| 0.1% | 1.6ms | 0.0% | 0us | `inspectTranscriptHeaderBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3600` |
| 0.1% | 1.6ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17453` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `spawnSync` | `[native code]` |
| 0.1% | 1.6ms | 0.0% | 0us | `writeResidentCacheOwnerToken` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:314` |
| 0.1% | 1.6ms | 0.0% | 0us | `residentCacheProcessStartTimeMs` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:207` |
| 0.1% | 1.6ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:770` |
| 0.1% | 1.6ms | 0.0% | 0us | `setupHelper` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:1030` |
| 0.1% | 1.6ms | 0.0% | 0us | `invokeAmbiguous` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:713` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `objectLiteral` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js` |
| 0.1% | 1.6ms | 0.0% | 0us | `compileChildren` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:829` |
| 0.1% | 1.6ms | 0.0% | 0us | `compile` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:99` |
| 0.1% | 1.6ms | 0.0% | 0us | `compile` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:115` |
| 0.1% | 1.6ms | 0.0% | 0us | `compileInput` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:510` |
| 0.1% | 1.6ms | 0.0% | 0us | `setupHelperArgs` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:1115` |
| 0.1% | 1.6ms | 0.0% | 0us | `#resetSidecarRuntime` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10533` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `next` | `[native code]` |
| 0.1% | 1.6ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7618` |
| 0.1% | 1.6ms | 0.0% | 0us | `listFilesSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1673` |
| 0.1% | 1.6ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/openai-responses-server-schema.ts:129` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `_string` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:7` |
| 0.1% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:18` |
| 0.1% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:22` |
| 0.0% | 1.6ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/anthropic-messages-server-schema.ts:43` |
| 0.0% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:21` |
| 0.0% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:156` |
| 0.0% | 1.6ms | 0.0% | 0us | `_url` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:85` |
| 0.0% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:188` |
| 0.0% | 1.6ms | 0.0% | 0us | `ZodURL` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.0% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:333` |
| 0.0% | 1.6ms | 0.0% | 1.6ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/checks.js` |
| 0.0% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:134` |
| 0.0% | 1.6ms | 0.0% | 0us | `#resetSidecarRuntime` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10516` |
| 0.0% | 1.6ms | 0.0% | 0us | `async #tryInitSessionFileFromSidecar` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7349` |
| 0.0% | 1.6ms | 0.0% | 0us | `async #initSessionFile` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8361` |
| 0.0% | 1.6ms | 0.0% | 0us | `async #initSessionFile` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8369` |
| 0.0% | 1.6ms | 0.0% | 1.6ms | `dictionaryPartitionPaths` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.6ms | 0.0% | 0us | `async #tryInitSessionFileFromSidecar` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7330` |
| 0.0% | 1.6ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17474` |
| 0.0% | 1.5ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17475` |
| 0.0% | 1.5ms | 0.0% | 0us | `#getSessionContextForRead` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16412` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `#resolvedProviderStateEntries` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.5ms | 0.0% | 0us | `buildSessionContext` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16376` |
| 0.0% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/lib/index.js:10` |
| 0.0% | 1.5ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8154` |
| 0.0% | 1.4ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/tools/gh.ts:263` |
| 0.0% | 1.4ms | 0.0% | 0us | `ZodArray` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.0% | 1.4ms | 0.0% | 0us | `_array` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:712` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `readEntity` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/internal/encode-shared.js:28` |
| 0.0% | 1.4ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/generated/encode-html.js:10` |
| 0.0% | 1.4ms | 0.0% | 0us | `parseEncodeTrie` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/internal/encode-shared.js:45` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:8` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:11` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:28` |
| 0.0% | 1.4ms | 0.0% | 0us | `#appendBytes` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1097` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1533` |
| 0.0% | 1.4ms | 0.0% | 0us | `writeBytesSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1105` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7869` |
| 0.0% | 1.4ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:340` |
| 0.0% | 1.4ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:14` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `RegExp` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 0us | `getRegex` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:13` |
| 0.0% | 1.4ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8277` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `tryCharge` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts` |
| 0.0% | 1.4ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:131` |
| 0.0% | 1.4ms | 0.0% | 0us | `randu32` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:5` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:88` |
| 0.0% | 1.4ms | 0.0% | 0us | `Source` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:60` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `getRandomValues` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 0us | `createSessionCommitMarkerCheckedSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:781` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `renameNoReplacePath` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 0us | `#withSessionPersistenceFenceSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10069` |
| 0.0% | 1.4ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7652` |
| 0.0% | 1.4ms | 0.0% | 0us | `createFileCommitMarkerCheckedSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:851` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10467` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:299` |
| 0.0% | 1.3ms | 0.0% | 0us | `get` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:37` |
| 0.0% | 1.3ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:23` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `getSessionMemoryStats` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:14325` |
| 0.0% | 1.3ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:892` |
| 0.0% | 1.3ms | 0.0% | 0us | `loadNative` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:532` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `createRequire` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/utils/discovery/antigravity.ts:63` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `preprocess` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js` |
| 0.0% | 1.2ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `bytesStartWith` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1352` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8069` |
| 0.0% | 1.2ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8064` |
| 0.0% | 1.2ms | 0.0% | 0us | `async #acquireBoundedFirstOpenLock` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7579` |
| 0.0% | 1.2ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7609` |
| 0.0% | 1.2ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7586` |
| 0.0% | 1.2ms | 0.0% | 0us | `async #initSessionFile` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8374` |
| 0.0% | 1.2ms | 0.0% | 0us | `ensureDirSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1574` |
| 0.0% | 1.2ms | 0.0% | 0us | `acquireExclusiveLockSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1524` |
| 0.0% | 1.2ms | 0.0% | 0us | `async #acquireBoundedFirstOpenLock` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7571` |
| 0.0% | 1.2ms | 0.0% | 0us | `assertResidentCacheDirectoryPathMatchesDescriptor` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:194` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `assertResidentCacheDirectory` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:142` |
| 0.0% | 1.2ms | 0.0% | 0us | `async sweepResidentCacheRoot` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:552` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.0% | 1.2ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:924` |
| 0.0% | 1.2ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:924` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `digest` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/tui/src/utils.ts:173` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `Segmenter` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `verifyOwnerOnlyPathSecurity` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 0us | `secureOwnerOnlyFileDescriptor` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:675` |
| 0.0% | 1.1ms | 0.0% | 0us | `closeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1170` |
| 0.0% | 1.1ms | 0.0% | 0us | `#scanBoundedTranscriptForFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8019` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `subarray` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:332` |
| 0.0% | 1.1ms | 0.0% | 0us | `ZodEnum` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:967` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:92` |
| 0.0% | 1.1ms | 0.0% | 0us | `_enum` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1007` |
| 0.0% | 1.1ms | 0.0% | 0us | `_installLazyMethods` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:32` |
| 0.0% | 1.1ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/usage.ts:77` |
| 0.0% | 1.0ms | 0.0% | 0us | `Program` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:119` |
| 0.0% | 1.0ms | 0.0% | 0us | `compileInput` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:509` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `opcode` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:348` |
| 0.0% | 1.0ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:1261` |
| 0.0% | 1.0ms | 0.0% | 0us | `ContentStatement` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:230` |
| 0.0% | 987us | 0.0% | 987us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7848` |

## Function Details

### `update`
`[native code]` | Self: 44.8% (730.6ms) | Total: 44.8% (730.6ms) | Samples: 478

**Called by:**
- `computeLineDigest` (237)
- `updateBoundedTranscriptHash` (228)
- `#buildBoundedFirstOpenSidecars` (13)

### `write`
`[native code]` | Self: 11.3% (184.9ms) | Total: 11.3% (184.9ms) | Samples: 127

**Called by:**
- `async (anonymous)` (125)
- `(anonymous)` (2)

### `DirResolver`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/dirs.ts:234` | Self: 6.8% (112.0ms) | Total: 6.8% (112.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `byteLength`
`[native code]` | Self: 5.1% (83.4ms) | Total: 5.1% (83.4ms) | Samples: 56

**Called by:**
- `async generateTranscript` (36)
- `async (anonymous)` (20)

### `stringify`
`[native code]` | Self: 4.9% (81.3ms) | Total: 4.9% (81.3ms) | Samples: 53

**Called by:**
- `serialize` (53)

### `gc`
`[native code]` | Self: 4.2% (68.8ms) | Total: 4.2% (68.8ms) | Samples: 44

**Called by:**
- `memorySample` (18)
- `async settledMemorySample` (14)
- `recordFirstOpenGcRequest` (12)

### `parse`
`[native code]` | Self: 3.5% (58.2ms) | Total: 3.5% (58.2ms) | Samples: 38

**Called by:**
- `(anonymous)` (38)

### `node:net`
`node:net:1267` | Self: 3.5% (57.5ms) | Total: 3.5% (57.5ms) | Samples: 1

### `readSync`
`[native code]` | Self: 3.1% (51.7ms) | Total: 3.1% (51.7ms) | Samples: 35

**Called by:**
- `scanTranscriptLinesBounded` (33)
- `readRangeSync` (2)

### `bound require`
`[native code]` | Self: 2.1% (34.8ms) | Total: 6.1% (99.6ms) | Samples: 2

**Called by:**
- `canonicalizeTrustedPath` (7)
- `loadFromCandidates` (5)
- `getHandlebars` (5)
- `(anonymous)` (4)
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
- `require` (31)
- `(anonymous)` (5)

### `anonymous`
`[native code]` | Self: 1.8% (30.6ms) | Total: 7.4% (121.5ms) | Samples: 10

**Called by:**
- `require` (25)
- `internal:streams/transform` (1)
- `node:util` (1)
- `node:crypto` (1)
- `internal:streams/duplex` (1)
- `internal:streams/readable` (1)
- `node:fs/promises` (1)
- `node:assert/strict` (1)
- `internal:validators` (1)
- `internal:streams/lazy_transform` (1)
- `node:events` (1)

**Calls:**
- `(anonymous)` (4)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:streams/readable` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:validators` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:streams/transform` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:streams/duplex` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:streams/lazy_transform` (1)
- `node:events` (1)

### `toString`
`[native code]` | Self: 1.8% (29.8ms) | Total: 1.8% (29.8ms) | Samples: 20

**Called by:**
- `(anonymous)` (20)

### `indexOf`
`[native code]` | Self: 0.7% (12.3ms) | Total: 0.7% (12.3ms) | Samples: 8

**Called by:**
- `consume` (8)

### `copy`
`[native code]` | Self: 0.6% (11.2ms) | Total: 0.6% (11.2ms) | Samples: 8

**Called by:**
- `consume` (5)
- `consume` (2)
- `#appendBytes` (1)

### `openSync`
`[native code]` | Self: 0.5% (8.7ms) | Total: 1.0% (17.5ms) | Samples: 5

**Called by:**
- `openSync` (5)
- `putResidentCacheBlobSync` (2)
- `readRangeSync` (1)
- `FileSessionStorageWriter` (1)
- `writeResidentCacheOwnerToken` (1)

**Calls:**
- `openSync` (5)

### `dlopen`
`[native code]` | Self: 0.4% (7.6ms) | Total: 0.4% (7.6ms) | Samples: 5

**Called by:**
- `(anonymous)` (5)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:330` | Self: 0.1% (2.9ms) | Total: 0.1% (2.9ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `Hash`
`[native code]` | Self: 0.1% (2.6ms) | Total: 0.1% (2.6ms) | Samples: 2

**Called by:**
- `Hash` (2)

### `defineProperty`
`[native code]` | Self: 0.1% (2.4ms) | Total: 0.1% (2.4ms) | Samples: 2

**Called by:**
- `_installLazyMethods` (1)
- `get` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:368` | Self: 0.1% (1.8ms) | Total: 0.1% (1.8ms) | Samples: 1

**Called by:**
- `forEach` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/gjc-runtime/state-schema.ts:144` | Self: 0.1% (1.7ms) | Total: 0.1% (1.7ms) | Samples: 1

### `#assertOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts` | Self: 0.1% (1.7ms) | Total: 0.1% (1.7ms) | Samples: 1

**Called by:**
- `writeBytesSync` (1)

### `bigint`
`[native code]` | Self: 0.1% (1.7ms) | Total: 0.1% (1.7ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` | Self: 0.1% (1.7ms) | Total: 0.1% (1.7ms) | Samples: 1

**Called by:**
- `async runWorker` (1)

### `Hash`
`node:crypto:179` | Self: 0.1% (1.7ms) | Total: 0.1% (1.7ms) | Samples: 1

**Called by:**
- `createHash` (1)

### `serialize`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:302` | Self: 0.1% (1.6ms) | Total: 5.0% (82.9ms) | Samples: 1

**Called by:**
- `async generateTranscript` (52)
- `async generateTranscript` (1)
- `async generateTranscript` (1)

**Calls:**
- `stringify` (53)

### `spawnSync`
`[native code]` | Self: 0.1% (1.6ms) | Total: 0.1% (1.6ms) | Samples: 1

**Called by:**
- `residentCacheProcessStartTimeMs` (1)

### `objectLiteral`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js` | Self: 0.1% (1.6ms) | Total: 0.1% (1.6ms) | Samples: 1

**Called by:**
- `setupHelperArgs` (1)

### `next`
`[native code]` | Self: 0.1% (1.6ms) | Total: 0.1% (1.6ms) | Samples: 1

**Called by:**
- `from` (1)

### `_string`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:7` | Self: 0.1% (1.6ms) | Total: 0.1% (1.6ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7806` | Self: 0.0% (1.6ms) | Total: 5.5% (89.7ms) | Samples: 1

**Called by:**
- `consume` (59)

**Calls:**
- `parse` (38)
- `toString` (20)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/checks.js` | Self: 0.0% (1.6ms) | Total: 0.0% (1.6ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `dictionaryPartitionPaths`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.6ms) | Total: 0.0% (1.6ms) | Samples: 1

**Called by:**
- `#resetSidecarRuntime` (1)

### `#resolvedProviderStateEntries`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `#getSessionContextForRead` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:8` | Self: 0.0% (1.5ms) | Total: 2.1% (34.8ms) | Samples: 1

**Calls:**
- `bound require` (1)

### `init`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:22` | Self: 0.0% (1.4ms) | Total: 0.7% (11.8ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)
- `ZodURL` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `ZodEnum` (1)
- `(anonymous)` (1)
- `ZodArray` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `readEntity`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/internal/encode-shared.js:28` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `parseEncodeTrie` (1)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1533` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7869` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `consume` (1)

### `RegExp`
`[native code]` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `getRegex` (1)

### `tryCharge`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `#buildBoundedFirstOpenSidecars` (1)

### `getRandomValues`
`[native code]` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `randu32` (1)

### `renameNoReplacePath`
`[native code]` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `createFileCommitMarkerCheckedSync` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:299` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `getSessionMemoryStats`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:14325` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `map` (1)

### `createRequire`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `loadNative` (1)

### `preprocess`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `from` (1)

### `bytesStartWith`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1352` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `mkdirSync`
`[native code]` | Self: 0.0% (1.2ms) | Total: 0.1% (2.4ms) | Samples: 1

**Called by:**
- `mkdirSync` (1)
- `ensureDirSync` (1)

**Calls:**
- `mkdirSync` (1)

### `assertResidentCacheDirectory`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:142` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `assertResidentCacheDirectoryPathMatchesDescriptor` (1)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `digest`
`[native code]` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `Segmenter`
`[native code]` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `verifyOwnerOnlyPathSecurity`
`[native code]` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `secureOwnerOnlyFileDescriptor` (1)

### `subarray`
`[native code]` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `updateBoundedTranscriptHash` (1)

### `opcode`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:348` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `ContentStatement` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7848` | Self: 0.0% (987us) | Total: 0.0% (987us) | Samples: 1

**Called by:**
- `consume` (1)

### `readRangeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1617` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `#findColdEntryIndex` (1)

**Calls:**
- `openSync` (1)

### `internal:streams/lazy_transform`
`internal:streams/lazy_transform:2` | Self: 0.0% (0us) | Total: 0.7% (11.9ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `#scanBoundedTranscriptForFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8019` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `closeSync` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:8` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async openNext`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:865` | Self: 0.0% (0us) | Total: 0.8% (13.9ms) | Samples: 0

**Called by:**
- `from` (9)

**Calls:**
- `async (anonymous)` (9)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/tools/gh.ts:263` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Calls:**
- `_array` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js:15` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:807` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `async runWorker` (1)

### `from`
`[native code]` | Self: 0.0% (0us) | Total: 1.0% (16.8ms) | Samples: 0

**Called by:**
- `async runWorker` (9)
- `(module)` (1)
- `listFilesSync` (1)

**Calls:**
- `async openNext` (9)
- `(anonymous)` (1)
- `next` (1)

### `Hash`
`node:crypto:178` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Called by:**
- `createHash` (2)

**Calls:**
- `Hash` (2)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:340` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `serialize` (1)

### `openVerifiedResidentCacheInstanceDir`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:621` | Self: 0.0% (0us) | Total: 0.2% (3.4ms) | Samples: 0

**Called by:**
- `#newResidentTextStoreCandidate` (2)

**Calls:**
- `writeResidentCacheOwnerToken` (1)
- `writeResidentCacheOwnerToken` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/helpers.js:14` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async #initSessionFile`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8374` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `async #tryBoundedFirstOpen` (1)

### `createSessionCommitMarkerCheckedSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:781` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `createFileCommitMarkerCheckedSync` (1)

### `forEach`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `addHelpers` (1)

**Calls:**
- `(anonymous)` (1)

### `#resetSidecarRuntime`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10516` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `async #tryInitSessionFileFromSidecar` (1)

**Calls:**
- `dictionaryPartitionPaths` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7652` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `#withSessionPersistenceFenceSync` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17474` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `async #initSessionFile` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:92` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `_installLazyMethods` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/tui/src/utils.ts:173` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Calls:**
- `Segmenter` (1)

### `getEntry`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16133` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `#resolveEntry` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17448` | Self: 0.0% (0us) | Total: 0.6% (10.6ms) | Samples: 0

**Called by:**
- `async open` (7)

**Calls:**
- `canonicalizeTrustedPath` (7)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/utils.ts:185` | Self: 0.0% (0us) | Total: 0.5% (9.4ms) | Samples: 0

**Calls:**
- `render` (5)

### `#prepareResidentTextStoreTransition`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6938` | Self: 0.0% (0us) | Total: 0.2% (3.4ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (2)

**Calls:**
- `#newResidentTextStoreCandidate` (2)

### `_installLazyMethods`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:32` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `defineProperty` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:18` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `compileInput`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:509` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `ret` (1)

**Calls:**
- `accept` (1)

### `compile`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:115` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `compileChildren` (1)

**Calls:**
- `invokeAmbiguous` (1)

### `ZodEnum`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `_enum` (1)

**Calls:**
- `init` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:8` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `acquireExclusiveLockSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1524` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `async #acquireBoundedFirstOpenLock` (1)

**Calls:**
- `ensureDirSync` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:892` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `map` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/base.js:15` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `getHandlebars`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:237` | Self: 0.0% (0us) | Total: 0.5% (9.4ms) | Samples: 0

**Called by:**
- `compile` (5)

**Calls:**
- `bound require` (5)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:22` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:366` | Self: 0.0% (0us) | Total: 12.9% (210.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (145)

**Calls:**
- `async write` (145)

### `async #acquireBoundedFirstOpenLock`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7579` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `async #acquireBoundedFirstOpenLock` (1)

**Calls:**
- `acquireExclusiveLockSync` (1)

### `externalizeResidentValueSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4731` | Self: 0.0% (0us) | Total: 0.4% (7.2ms) | Samples: 0

**Called by:**
- `externalizeResidentValueSync` (2)
- `map` (2)

**Calls:**
- `externalizeResidentValueSync` (2)
- `externalizeResidentValueSync` (2)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/utils/discovery/antigravity.ts:63` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Calls:**
- `preprocess` (1)

### `canonicalizeTrustedPath`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/managed-session-scope.ts:406` | Self: 0.0% (0us) | Total: 0.6% (10.6ms) | Samples: 0

**Called by:**
- `async open` (7)

**Calls:**
- `bound require` (7)

### `putResidentCacheBlobSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:798` | Self: 0.0% (0us) | Total: 0.2% (3.6ms) | Samples: 0

**Called by:**
- `putSync` (2)

**Calls:**
- `openSync` (2)

### `render`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:493` | Self: 0.0% (0us) | Total: 0.8% (13.9ms) | Samples: 0

**Called by:**
- `(module)` (5)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `compile` (5)
- `ret` (2)
- `ret` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:967` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7847` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `consume` (1)

**Calls:**
- `bigint` (1)

### `compileInput`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:510` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `ret` (1)

**Calls:**
- `compile` (1)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 84.1% (1.37s) | Samples: 0

**Calls:**
- `(anonymous)` (906)

### `async #initSessionFile`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8361` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `async #initSessionFile` (1)

### `writeBytesSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1105` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `writeFirstOpenSidecarBytes` (1)

**Calls:**
- `#appendBytes` (1)

### `get`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:37` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `defineProperty` (1)

### `accept`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:108` | Self: 0.0% (0us) | Total: 0.1% (2.1ms) | Samples: 0

**Called by:**
- `Program` (1)
- `compileInput` (1)

**Calls:**
- `Program` (1)
- `ContentStatement` (1)

### `Program`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:119` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `accept` (1)

**Calls:**
- `accept` (1)

### `async settledMemorySample`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:245` | Self: 0.0% (0us) | Total: 1.4% (22.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (14)

**Calls:**
- `gc` (14)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:770` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Calls:**
- `render` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17453` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `inspectTranscriptHeaderBounded` (1)

### `loadFromCandidates`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:215` | Self: 0.0% (0us) | Total: 0.4% (7.6ms) | Samples: 0

**Called by:**
- `loadNative` (5)

**Calls:**
- `bound require` (5)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:156` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/lib/index.js:10` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `randu32`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:5` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `Source` (1)

**Calls:**
- `getRandomValues` (1)

### `createFileCommitMarkerCheckedSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:851` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `createSessionCommitMarkerCheckedSync` (1)

**Calls:**
- `renameNoReplacePath` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:332` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `serialize` (1)

### `internal:validators`
`internal:validators:2` | Self: 0.0% (0us) | Total: 0.1% (3.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/lib/index.js:8` | Self: 0.0% (0us) | Total: 0.4% (7.8ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `compile`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:485` | Self: 0.0% (0us) | Total: 0.5% (9.4ms) | Samples: 0

**Called by:**
- `render` (5)

**Calls:**
- `getHandlebars` (5)

### `compile`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:99` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `compileInput` (1)

**Calls:**
- `compileChildren` (1)

### `#resetSidecarRuntime`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10533` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `listFilesSync` (1)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1559` | Self: 0.0% (0us) | Total: 0.2% (3.3ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (2)

**Calls:**
- `recordFirstOpenGcRequest` (2)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1542` | Self: 0.0% (0us) | Total: 52.2% (851.3ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (561)
- `#buildBoundedFirstOpenSidecars` (1)

**Calls:**
- `consume` (547)
- `consume` (8)
- `consume` (5)
- `consume` (2)

### `invokeAmbiguous`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:713` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `compile` (1)

**Calls:**
- `setupHelper` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/dirs.ts:337` | Self: 0.0% (0us) | Total: 6.8% (112.0ms) | Samples: 0

**Calls:**
- `DirResolver` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:349` | Self: 0.0% (0us) | Total: 3.3% (54.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (36)

**Calls:**
- `byteLength` (36)

### `readRangeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1625` | Self: 0.0% (0us) | Total: 0.1% (3.1ms) | Samples: 0

**Called by:**
- `#buildBoundedFirstOpenSidecars` (1)
- `inspectTranscriptHeaderBounded` (1)

**Calls:**
- `readSync` (2)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7618` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `#resetSidecarRuntime` (1)

### `internal:streams/readable`
`internal:streams/readable:14` | Self: 0.0% (0us) | Total: 0.7% (11.9ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `createHash`
`node:crypto:201` | Self: 0.0% (0us) | Total: 0.2% (4.3ms) | Samples: 0

**Called by:**
- `computeLineDigest` (3)

**Calls:**
- `Hash` (2)
- `Hash` (1)

### `ret`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:517` | Self: 0.0% (0us) | Total: 0.1% (2.7ms) | Samples: 0

**Called by:**
- `render` (2)

**Calls:**
- `compileInput` (1)
- `compileInput` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7939` | Self: 0.0% (0us) | Total: 0.9% (15.2ms) | Samples: 0

**Called by:**
- `consume` (10)

**Calls:**
- `recordFirstOpenGcRequest` (10)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:16` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async measurePhase`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:595` | Self: 0.0% (0us) | Total: 0.1% (2.9ms) | Samples: 0

**Called by:**
- `async measurePhase` (2)

**Calls:**
- `(anonymous)` (1)
- `async (anonymous)` (1)

### `_array`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:712` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `ZodArray` (1)

### `internal:streams/transform`
`internal:streams/transform:2` | Self: 0.0% (0us) | Total: 0.7% (11.9ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1461` | Self: 0.0% (0us) | Total: 0.7% (12.3ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (8)

**Calls:**
- `indexOf` (8)

### `setupHelper`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:1030` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `invokeAmbiguous` (1)

**Calls:**
- `setupHelperArgs` (1)

### `#preparedResidentTransitionFromSource`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6897` | Self: 0.0% (0us) | Total: 0.2% (3.6ms) | Samples: 0

**Called by:**
- `#prepareResidentTextStoreTransition` (2)

**Calls:**
- `map` (2)

### `ZodArray`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `_array` (1)

**Calls:**
- `init` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:14` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Calls:**
- `getRegex` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:131` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:21` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:134` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `writeResidentCacheOwnerToken`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:314` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `openVerifiedResidentCacheInstanceDir` (1)

**Calls:**
- `residentCacheProcessStartTimeMs` (1)

### `ret`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:191` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `render` (1)

**Calls:**
- `(anonymous)` (1)

### `loadNative`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:532` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `createRequire` (1)

### `buildSessionContext`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16376` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `#getSessionContextForRead` (1)

### `ContentStatement`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:230` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `accept` (1)

**Calls:**
- `opcode` (1)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:871` | Self: 0.0% (0us) | Total: 0.8% (13.9ms) | Samples: 0

**Called by:**
- `async openNext` (9)

**Calls:**
- `async open` (9)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/generated/encode-html.js:10` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Calls:**
- `parseEncodeTrie` (1)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 0.7% (11.9ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `ensureDirSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1574` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `acquireExclusiveLockSync` (1)

**Calls:**
- `mkdirSync` (1)

### `writeBytesSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1103` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `writeFirstOpenSidecarBytes` (1)

**Calls:**
- `#assertOpen` (1)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 85.7% (1.39s) | Samples: 0

**Called by:**
- `processTicksAndRejections` (906)
- `require` (6)
- `(anonymous)` (6)
- `bound require` (5)

**Calls:**
- `async #tryBoundedFirstOpen` (598)
- `async generateTranscript` (145)
- `async generateTranscript` (52)
- `async generateTranscript` (36)
- `async #tryBoundedFirstOpen` (17)
- `async settledMemorySample` (14)
- `memorySample` (13)
- `async runWorker` (9)
- `(anonymous)` (6)
- `(module)` (6)
- `async runWorker` (5)
- `dlopen` (5)
- `async #tryBoundedFirstOpen` (4)
- `async generateTranscript` (2)
- `async runWorker` (1)
- `async #initSessionFile` (1)
- `async generateTranscript` (1)
- `async runWorker` (1)
- `async generateTranscript` (1)
- `async sweepResidentCacheRoot` (1)
- `async generateTranscript` (1)
- `async open` (1)
- `async runWorker` (1)
- `async #tryBoundedFirstOpen` (1)
- `async #tryBoundedFirstOpen` (1)

### `loadNative`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:544` | Self: 0.0% (0us) | Total: 0.4% (7.6ms) | Samples: 0

**Called by:**
- `(module)` (5)

**Calls:**
- `loadFromCandidates` (5)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7636` | Self: 0.0% (0us) | Total: 55.5% (904.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (598)

**Calls:**
- `#scanBoundedTranscriptForFirstOpen` (597)
- `#scanBoundedTranscriptForFirstOpen` (1)

### `node:fs/promises`
`node:fs/promises:2` | Self: 0.0% (0us) | Total: 0.1% (3.0ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:324` | Self: 0.0% (0us) | Total: 4.9% (80.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (52)

**Calls:**
- `serialize` (52)

### `_url`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:85` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `ZodURL` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8069` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `consume` (1)

**Calls:**
- `bytesStartWith` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.runtime.js:12` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `#prepareResidentTextStoreTransition`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6939` | Self: 0.0% (0us) | Total: 0.2% (3.6ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (2)

**Calls:**
- `#preparedResidentTransitionFromSource` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:6` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `inspectTranscriptHeaderBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3600` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `readRangeSync` (1)

### `listFilesSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1673` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `#resetSidecarRuntime` (1)

**Calls:**
- `from` (1)

### `recordFirstOpenGcRequest`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6524` | Self: 0.0% (0us) | Total: 1.1% (18.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (10)
- `scanTranscriptLinesBounded` (2)

**Calls:**
- `gc` (12)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:821` | Self: 0.0% (0us) | Total: 0.4% (8.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `memorySample` (5)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:898` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `async measurePhase` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/usage.ts:77` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Calls:**
- `_enum` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:22` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1485` | Self: 0.0% (0us) | Total: 0.4% (7.3ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (5)

**Calls:**
- `copy` (5)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7864` | Self: 0.0% (0us) | Total: 0.2% (3.3ms) | Samples: 0

**Called by:**
- `consume` (2)

**Calls:**
- `write` (2)

### `residentCacheProcessStartTimeMs`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:207` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `writeResidentCacheOwnerToken` (1)

**Calls:**
- `spawnSync` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/openai-responses-server-schema.ts:129` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Calls:**
- `_string` (1)

### `FileSessionStorageWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1020` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `openBufferedWriter` (1)

**Calls:**
- `openSync` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8277` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `tryCharge` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:1452` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Calls:**
- `async runWorker` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7670` | Self: 0.0% (0us) | Total: 0.4% (7.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `#prepareResidentTextStoreTransition` (2)
- `#prepareResidentTextStoreTransition` (2)

### `secureOwnerOnlyFileDescriptor`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:675` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `closeSync` (1)

**Calls:**
- `verifyOwnerOnlyPathSecurity` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:23` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Calls:**
- `get` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/lib/source-map-generator.js:9` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:188` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `writeResidentCacheOwnerToken`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:326` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `openVerifiedResidentCacheInstanceDir` (1)

**Calls:**
- `openSync` (1)

### `_enum`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1007` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `ZodEnum` (1)

### `setupHelperArgs`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:1115` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `setupHelper` (1)

**Calls:**
- `objectLiteral` (1)

### `parseEncodeTrie`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/internal/encode-shared.js:45` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `readEntity` (1)

### `async sweepResidentCacheRoot`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:552` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `assertResidentCacheDirectoryPathMatchesDescriptor` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1471` | Self: 0.0% (0us) | Total: 0.1% (2.5ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (2)

**Calls:**
- `copy` (2)

### `addHelpers`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:366` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `forEach` (1)

### `node:util`
`node:util:2` | Self: 0.0% (0us) | Total: 0.1% (2.8ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `externalizeResidentValueSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4700` | Self: 0.0% (0us) | Total: 0.2% (3.6ms) | Samples: 0

**Called by:**
- `externalizeResidentValueSync` (2)

**Calls:**
- `putSync` (2)

### `map`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (4.9ms) | Samples: 0

**Called by:**
- `#preparedResidentTransitionFromSource` (2)
- `async runWorker` (1)

**Calls:**
- `externalizeResidentValueSync` (2)
- `getSessionMemoryStats` (1)

### `closeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1170` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (1)

**Calls:**
- `secureOwnerOnlyFileDescriptor` (1)

### `require`
`[native code]` | Self: 0.0% (0us) | Total: 3.5% (57.0ms) | Samples: 0

**Called by:**
- `bound require` (31)

**Calls:**
- `anonymous` (25)
- `(anonymous)` (6)

### `updateBoundedTranscriptHash`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1373` | Self: 0.0% (0us) | Total: 21.2% (346.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (229)

**Calls:**
- `update` (228)
- `subarray` (1)

### `openFirstOpenSidecarWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6546` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `#buildBoundedFirstOpenSidecars` (1)

**Calls:**
- `openBufferedWriter` (1)

### `computeLineDigest`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:693` | Self: 0.0% (0us) | Total: 22.3% (364.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (240)

**Calls:**
- `update` (237)
- `createHash` (3)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:900` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `async measurePhase` (1)

**Calls:**
- `getEntry` (1)

### `async write`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:304` | Self: 0.0% (0us) | Total: 12.9% (210.9ms) | Samples: 0

**Called by:**
- `async generateTranscript` (145)

**Calls:**
- `async (anonymous)` (125)
- `async (anonymous)` (20)

### `#resolveEntry`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12634` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `getEntry` (1)

**Calls:**
- `#findColdEntryIndex` (1)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1538` | Self: 0.0% (0us) | Total: 2.9% (48.5ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (33)

**Calls:**
- `readSync` (33)

### `assertResidentCacheDirectoryPathMatchesDescriptor`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:194` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `async sweepResidentCacheRoot` (1)

**Calls:**
- `assertResidentCacheDirectory` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7644` | Self: 0.0% (0us) | Total: 1.9% (31.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (17)

**Calls:**
- `#buildBoundedFirstOpenSidecars` (13)
- `#buildBoundedFirstOpenSidecars` (1)
- `#buildBoundedFirstOpenSidecars` (1)
- `#buildBoundedFirstOpenSidecars` (1)
- `#buildBoundedFirstOpenSidecars` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7845` | Self: 0.0% (0us) | Total: 22.4% (365.9ms) | Samples: 0

**Called by:**
- `consume` (241)

**Calls:**
- `computeLineDigest` (240)
- `digest` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8154` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `readRangeSync` (1)

### `#withSessionPersistenceFenceSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10069` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `(anonymous)` (1)

### `#getSessionContextForRead`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16412` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `buildSessionContext` (1)

**Calls:**
- `#resolvedProviderStateEntries` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/anthropic-messages-server-schema.ts:43` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Calls:**
- `_url` (1)

### `compileChildren`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:829` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `compile` (1)

**Calls:**
- `compile` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:882` | Self: 0.0% (0us) | Total: 0.8% (13.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (9)

**Calls:**
- `from` (9)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:307` | Self: 0.0% (0us) | Total: 11.1% (181.6ms) | Samples: 0

**Called by:**
- `async write` (125)

**Calls:**
- `write` (125)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10467` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `#withSessionPersistenceFenceSync` (1)

**Calls:**
- `createSessionCommitMarkerCheckedSync` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/index.js:16` | Self: 0.0% (0us) | Total: 0.5% (8.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (6)

**Calls:**
- `loadNative` (5)
- `loadNative` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:28` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Calls:**
- `bound require` (1)

### `ZodURL`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `_url` (1)

**Calls:**
- `init` (1)

### `node:assert/strict`
`node:assert/strict:3` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17475` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `buildSessionContext` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17434` | Self: 0.0% (0us) | Total: 0.8% (13.9ms) | Samples: 0

**Called by:**
- `async (anonymous)` (9)

**Calls:**
- `async open` (7)
- `async open` (1)
- `async open` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:218` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `ret` (1)

**Calls:**
- `addHelpers` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7586` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `async #initSessionFile` (1)

**Calls:**
- `async #tryBoundedFirstOpen` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8182` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `openFirstOpenSidecarWriter` (1)

### `writeFirstOpenSidecarBytes`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6556` | Self: 0.0% (0us) | Total: 0.2% (3.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `writeBytesSync` (1)
- `writeBytesSync` (1)

### `node:crypto`
`node:crypto:2` | Self: 0.0% (0us) | Total: 0.7% (11.9ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `memorySample`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:232` | Self: 0.0% (0us) | Total: 1.6% (27.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (13)
- `async runWorker` (5)

**Calls:**
- `gc` (18)

### `node:events`
`node:events:9` | Self: 0.0% (0us) | Total: 0.1% (3.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:333` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `async #tryInitSessionFileFromSidecar`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7330` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `async #initSessionFile` (1)

**Calls:**
- `async #tryInitSessionFileFromSidecar` (1)

### `async #acquireBoundedFirstOpenLock`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7571` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `async #acquireBoundedFirstOpenLock` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7802` | Self: 0.0% (0us) | Total: 21.2% (346.2ms) | Samples: 0

**Called by:**
- `consume` (229)

**Calls:**
- `updateBoundedTranscriptHash` (229)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:14` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Calls:**
- `from` (1)

### `#appendBytes`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1097` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `writeBytesSync` (1)

**Calls:**
- `copy` (1)

### `#newResidentTextStoreCandidate`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6860` | Self: 0.0% (0us) | Total: 0.2% (3.4ms) | Samples: 0

**Called by:**
- `#prepareResidentTextStoreTransition` (2)

**Calls:**
- `openVerifiedResidentCacheInstanceDir` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7867` | Self: 0.0% (0us) | Total: 0.2% (3.2ms) | Samples: 0

**Called by:**
- `consume` (2)

**Calls:**
- `writeFirstOpenSidecarBytes` (2)

### `openBufferedWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1815` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `openFirstOpenSidecarWriter` (1)

**Calls:**
- `FileSessionStorageWriter` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1475` | Self: 0.0% (0us) | Total: 50.8% (829.1ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (547)

**Calls:**
- `(anonymous)` (241)
- `(anonymous)` (229)
- `(anonymous)` (59)
- `(anonymous)` (10)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:88` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `Source` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:11` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `putSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:1133` | Self: 0.0% (0us) | Total: 0.2% (3.6ms) | Samples: 0

**Called by:**
- `externalizeResidentValueSync` (2)

**Calls:**
- `putResidentCacheBlobSync` (2)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:924` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `async measurePhase` (1)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:924` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `async measurePhase` (1)

**Calls:**
- `async (anonymous)` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8159` | Self: 0.0% (0us) | Total: 1.5% (25.3ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (13)

**Calls:**
- `update` (13)

### `Source`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:60` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `randu32` (1)

### `async #initSessionFile`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8369` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `async #initSessionFile` (1)

**Calls:**
- `async #tryInitSessionFileFromSidecar` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7609` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `async #acquireBoundedFirstOpenLock` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8064` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `scanTranscriptLinesBounded` (1)

### `async measurePhase`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:592` | Self: 0.0% (0us) | Total: 0.1% (2.9ms) | Samples: 0

**Called by:**
- `async runWorker` (1)
- `async runWorker` (1)

**Calls:**
- `async measurePhase` (2)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:1261` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Calls:**
- `render` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:766` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Calls:**
- `render` (1)

### `getRegex`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:13` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `RegExp` (1)

### `#scanBoundedTranscriptForFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7796` | Self: 0.0% (0us) | Total: 55.4% (903.4ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (597)

**Calls:**
- `scanTranscriptLinesBounded` (561)
- `scanTranscriptLinesBounded` (33)
- `scanTranscriptLinesBounded` (2)
- `scanTranscriptLinesBounded` (1)

### `#findColdEntryIndex`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12385` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `#resolveEntry` (1)

**Calls:**
- `readRangeSync` (1)

### `async #tryInitSessionFileFromSidecar`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7349` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `async #tryInitSessionFileFromSidecar` (1)

**Calls:**
- `#resetSidecarRuntime` (1)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:306` | Self: 0.0% (0us) | Total: 1.7% (29.2ms) | Samples: 0

**Called by:**
- `async write` (20)

**Calls:**
- `byteLength` (20)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 86.9% | 1.41s | `[native code]` |
| 6.8% | 112.0ms | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/dirs.ts` |
| 3.5% | 57.5ms | `node:net` |
| 0.6% | 11.3ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.5% | 8.9ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.1% | 1.8ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js` |
| 0.1% | 1.7ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/gjc-runtime/state-schema.ts` |
| 0.1% | 1.7ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts` |
| 0.1% | 1.7ms | `node:crypto` |
| 0.1% | 1.6ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js` |
| 0.1% | 1.6ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js` |
| 0.0% | 1.6ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/checks.js` |
| 0.0% | 1.5ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js` |
| 0.0% | 1.4ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js` |
| 0.0% | 1.4ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/internal/encode-shared.js` |
| 0.0% | 1.4ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts` |
| 0.0% | 1.2ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js` |
| 0.0% | 1.2ms | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts` |
| 0.0% | 1.2ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts` |
| 0.0% | 1.0ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js` |
