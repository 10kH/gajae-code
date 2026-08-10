# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 1.62s | 1092 | 1.0ms | 301 |

**Top 10:** `update` 43.7%, `anonymous` 10.3%, `write` 8.7%, `stringify` 6.1%, `byteLength` 4.9%, `gc` 4.8%, `readSync` 3.8%, `parse` 3.2%, `registry` 2.3%, `_makeCompatibilityCheck` 2.1%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 43.7% | 712.1ms | 43.7% | 712.1ms | `update` | `[native code]` |
| 10.3% | 169.1ms | 26.5% | 432.0ms | `anonymous` | `[native code]` |
| 8.7% | 141.9ms | 8.7% | 141.9ms | `write` | `[native code]` |
| 6.1% | 100.2ms | 6.1% | 100.2ms | `stringify` | `[native code]` |
| 4.9% | 80.1ms | 4.9% | 80.1ms | `byteLength` | `[native code]` |
| 4.8% | 78.5ms | 4.8% | 78.5ms | `gc` | `[native code]` |
| 3.8% | 62.3ms | 3.8% | 62.3ms | `readSync` | `[native code]` |
| 3.2% | 53.0ms | 3.2% | 53.0ms | `parse` | `[native code]` |
| 2.3% | 38.3ms | 2.3% | 38.3ms | `registry` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/registries.js` |
| 2.1% | 34.5ms | 2.1% | 34.5ms | `_makeCompatibilityCheck` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/internal/semver.js` |
| 2.0% | 33.6ms | 2.0% | 33.6ms | `toString` | `[native code]` |
| 0.9% | 16.1ms | 0.9% | 16.1ms | `indexOf` | `[native code]` |
| 0.5% | 9.0ms | 0.5% | 9.0ms | `copy` | `[native code]` |
| 0.4% | 6.6ms | 0.4% | 6.6ms | `dlopen` | `[native code]` |
| 0.3% | 5.0ms | 0.3% | 5.0ms | `spawnSync` | `[native code]` |
| 0.2% | 4.3ms | 0.2% | 4.3ms | `defineLazy` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:62` |
| 0.2% | 4.1ms | 0.2% | 4.1ms | `RegExp` | `[native code]` |
| 0.2% | 3.9ms | 0.2% | 3.9ms | `ZodObject` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:40` |
| 0.2% | 3.7ms | 0.2% | 3.7ms | `bigint` | `[native code]` |
| 0.2% | 3.7ms | 84.7% | 1.37s | `(anonymous)` | `[native code]` |
| 0.2% | 3.7ms | 6.3% | 103.9ms | `serialize` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:302` |
| 0.1% | 2.5ms | 0.1% | 2.5ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/index.js` |
| 0.1% | 2.4ms | 0.2% | 4.8ms | `mkdirSync` | `[native code]` |
| 0.1% | 2.2ms | 0.1% | 2.2ms | `subarray` | `[native code]` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `anonymous` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `defineColorAlias` | `internal:util/inspect` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `keys` | `[native code]` |
| 0.0% | 1.4ms | 0.1% | 2.7ms | `add` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:1785` |
| 0.0% | 1.4ms | 0.1% | 2.5ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7807` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `digest` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `template` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:213` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `SourceNode` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/lib/source-node.js:43` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `repeat` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.0% | 1.3ms | 0.9% | 15.3ms | `from` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `counterEvidence` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `bytesStartWith` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1366` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `Writable` | `internal:streams/writable` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `get buffer` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `init` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:21` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `#getSessionContextForRead` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `isResidentCacheInstanceDirName` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts` |
| 0.0% | 1.3ms | 9.5% | 155.6ms | `async write` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:304` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `disposeVerifiedResidentCacheInstanceDir` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `Function` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `materializeResidentEntriesSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `has` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@anthropic-ai/sdk/resources/beta/beta.mjs:38` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `verifyOwnerOnlyPathSecurity` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `isProviderStateEntry` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1059` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:17` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `cpuUsage` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `dictionaryPartitionPaths` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_supportsColor` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/chalk/source/vendor/supports-color/index.js` |
| 0.0% | 1.1ms | 0.1% | 2.3ms | `realpathSync` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:323` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `aggregateStats` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:437` |
| 0.0% | 1.0ms | 3.7% | 60.8ms | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1553` |
| 0.0% | 1.0ms | 0.1% | 2.1ms | `openSync` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `visit` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.0ms | 8.7% | 141.9ms | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:307` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `renameNoReplacePath` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `hasStrictSessionSchema` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3399` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `replace` | `[native code]` |
| 0.0% | 866us | 0.0% | 866us | `join` | `[native code]` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 84.7% | 1.37s | 0.2% | 3.7ms | `(anonymous)` | `[native code]` |
| 83.1% | 1.35s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 55.5% | 904.0ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7629` |
| 55.4% | 901.9ms | 0.0% | 0us | `#scanBoundedTranscriptForFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7788` |
| 51.4% | 837.8ms | 0.0% | 0us | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1557` |
| 49.8% | 811.4ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1490` |
| 43.7% | 712.1ms | 43.7% | 712.1ms | `update` | `[native code]` |
| 26.5% | 432.0ms | 10.3% | 169.1ms | `anonymous` | `[native code]` |
| 21.6% | 352.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7794` |
| 21.6% | 352.0ms | 0.0% | 0us | `updateBoundedTranscriptHash` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1388` |
| 20.6% | 335.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7837` |
| 20.5% | 334.1ms | 0.0% | 0us | `computeLineDigest` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:693` |
| 14.1% | 230.9ms | 0.0% | 0us | `bound require` | `[native code]` |
| 13.7% | 224.2ms | 0.0% | 0us | `require` | `[native code]` |
| 9.5% | 155.6ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:366` |
| 9.5% | 155.6ms | 0.0% | 1.3ms | `async write` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:304` |
| 8.7% | 141.9ms | 8.7% | 141.9ms | `write` | `[native code]` |
| 8.7% | 141.9ms | 0.0% | 1.0ms | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:307` |
| 8.5% | 139.8ms | 0.0% | 0us | `node:dns/promises` | `node:dns/promises:3` |
| 6.3% | 103.9ms | 0.2% | 3.7ms | `serialize` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:302` |
| 6.1% | 100.2ms | 6.1% | 100.2ms | `stringify` | `[native code]` |
| 6.0% | 97.6ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:324` |
| 5.4% | 89.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7798` |
| 4.9% | 80.1ms | 4.9% | 80.1ms | `byteLength` | `[native code]` |
| 4.8% | 78.5ms | 4.8% | 78.5ms | `gc` | `[native code]` |
| 3.9% | 64.0ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:349` |
| 3.8% | 62.3ms | 3.8% | 62.3ms | `readSync` | `[native code]` |
| 3.7% | 60.8ms | 0.0% | 1.0ms | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1553` |
| 3.2% | 53.0ms | 3.2% | 53.0ms | `parse` | `[native code]` |
| 2.3% | 38.3ms | 2.3% | 38.3ms | `registry` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/registries.js` |
| 2.3% | 38.3ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/registries.js:50` |
| 2.1% | 34.5ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/baggage/utils.js:8` |
| 2.1% | 34.5ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/api/diag.js:8` |
| 2.1% | 34.5ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/diag/ComponentLogger.js:8` |
| 2.1% | 34.5ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/internal/global-utils.js:9` |
| 2.1% | 34.5ms | 2.1% | 34.5ms | `_makeCompatibilityCheck` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/internal/semver.js` |
| 2.1% | 34.5ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/internal/semver.js:110` |
| 2.1% | 34.5ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:8` |
| 2.0% | 33.6ms | 2.0% | 33.6ms | `toString` | `[native code]` |
| 1.9% | 32.3ms | 0.0% | 0us | `memorySample` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:232` |
| 1.9% | 31.0ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7637` |
| 1.5% | 25.9ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8151` |
| 1.4% | 23.4ms | 0.0% | 0us | `async settledMemorySample` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:245` |
| 1.3% | 22.6ms | 0.0% | 0us | `recordFirstOpenGcRequest` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6525` |
| 1.1% | 18.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7931` |
| 0.9% | 16.1ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1476` |
| 0.9% | 16.1ms | 0.9% | 16.1ms | `indexOf` | `[native code]` |
| 0.9% | 15.3ms | 0.0% | 1.3ms | `from` | `[native code]` |
| 0.8% | 13.4ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:306` |
| 0.8% | 13.4ms | 0.0% | 0us | `render` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:493` |
| 0.7% | 12.5ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:882` |
| 0.7% | 12.5ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:871` |
| 0.7% | 12.5ms | 0.0% | 0us | `async openNext` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:865` |
| 0.7% | 12.5ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17419` |
| 0.6% | 11.1ms | 0.0% | 0us | `init` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:22` |
| 0.6% | 10.7ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:821` |
| 0.6% | 10.5ms | 0.0% | 0us | `internal:streams/lazy_transform` | `internal:streams/lazy_transform:2` |
| 0.6% | 10.5ms | 0.0% | 0us | `internal:streams/transform` | `internal:streams/transform:2` |
| 0.6% | 10.5ms | 0.0% | 0us | `internal:streams/readable` | `internal:streams/readable:2` |
| 0.6% | 10.5ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 0.6% | 10.5ms | 0.0% | 0us | `node:crypto` | `node:crypto:2` |
| 0.5% | 9.3ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/utils.ts:185` |
| 0.5% | 9.0ms | 0.5% | 9.0ms | `copy` | `[native code]` |
| 0.5% | 8.9ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17433` |
| 0.5% | 8.9ms | 0.0% | 0us | `canonicalizeTrustedPath` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/managed-session-scope.ts:406` |
| 0.4% | 7.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/lib/index.js:8` |
| 0.4% | 7.7ms | 0.0% | 0us | `getHandlebars` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:237` |
| 0.4% | 7.7ms | 0.0% | 0us | `compile` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:485` |
| 0.4% | 6.6ms | 0.4% | 6.6ms | `dlopen` | `[native code]` |
| 0.4% | 6.6ms | 0.0% | 0us | `loadFromCandidates` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:215` |
| 0.4% | 6.6ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/index.js:16` |
| 0.4% | 6.6ms | 0.0% | 0us | `loadNative` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:544` |
| 0.3% | 5.7ms | 0.0% | 0us | `ret` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:517` |
| 0.3% | 5.6ms | 0.0% | 0us | `ZodOptional` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.3% | 5.6ms | 0.0% | 0us | `bound optional` | `[native code]` |
| 0.3% | 5.6ms | 0.0% | 0us | `optional` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1110` |
| 0.3% | 5.2ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:332` |
| 0.3% | 5.0ms | 0.0% | 0us | `residentCacheProcessStartTimeMs` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:207` |
| 0.3% | 5.0ms | 0.3% | 5.0ms | `spawnSync` | `[native code]` |
| 0.3% | 5.0ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1500` |
| 0.2% | 4.8ms | 0.1% | 2.4ms | `mkdirSync` | `[native code]` |
| 0.2% | 4.6ms | 0.0% | 0us | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1574` |
| 0.2% | 4.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1104` |
| 0.2% | 4.3ms | 0.2% | 4.3ms | `defineLazy` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:62` |
| 0.2% | 4.1ms | 0.2% | 4.1ms | `RegExp` | `[native code]` |
| 0.2% | 4.0ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7662` |
| 0.2% | 3.9ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1486` |
| 0.2% | 3.9ms | 0.2% | 3.9ms | `ZodObject` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:40` |
| 0.2% | 3.7ms | 0.0% | 0us | `async #initSessionFile` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8363` |
| 0.2% | 3.7ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7579` |
| 0.2% | 3.7ms | 0.2% | 3.7ms | `bigint` | `[native code]` |
| 0.2% | 3.6ms | 0.0% | 0us | `node:events` | `node:events:9` |
| 0.2% | 3.6ms | 0.0% | 0us | `internal:validators` | `internal:validators:2` |
| 0.2% | 3.6ms | 0.0% | 0us | `internal:shared` | `internal:shared:2` |
| 0.2% | 3.6ms | 0.0% | 0us | `node:fs/promises` | `node:fs/promises:2` |
| 0.1% | 2.9ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:1755` |
| 0.1% | 2.9ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/utils/discovery/antigravity.ts:63` |
| 0.1% | 2.9ms | 0.0% | 0us | `optional` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:125` |
| 0.1% | 2.9ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/usage.ts:96` |
| 0.1% | 2.9ms | 0.0% | 0us | `object` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:791` |
| 0.1% | 2.8ms | 0.0% | 0us | `#prepareResidentTextStoreTransition` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6939` |
| 0.1% | 2.8ms | 0.0% | 0us | `writeResidentCacheOwnerToken` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:314` |
| 0.1% | 2.8ms | 0.0% | 0us | `#newResidentTextStoreCandidate` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6861` |
| 0.1% | 2.8ms | 0.0% | 0us | `openVerifiedResidentCacheInstanceDir` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:621` |
| 0.1% | 2.7ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:14` |
| 0.1% | 2.7ms | 0.0% | 0us | `getRegex` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:13` |
| 0.1% | 2.7ms | 0.0% | 0us | `compileInput` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:510` |
| 0.1% | 2.7ms | 0.0% | 1.4ms | `add` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:1785` |
| 0.1% | 2.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7834` |
| 0.1% | 2.6ms | 0.0% | 0us | `decodeBoundedJsonLine` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1362` |
| 0.1% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7850` |
| 0.1% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js:15` |
| 0.1% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:22` |
| 0.1% | 2.6ms | 0.0% | 0us | `node:util` | `node:util:2` |
| 0.1% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:16` |
| 0.1% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7839` |
| 0.1% | 2.6ms | 0.0% | 0us | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1625` |
| 0.1% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:18` |
| 0.1% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:8` |
| 0.1% | 2.5ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/index.js:10` |
| 0.1% | 2.5ms | 0.1% | 2.5ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/index.js` |
| 0.1% | 2.5ms | 0.0% | 1.4ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7807` |
| 0.1% | 2.4ms | 0.0% | 0us | `async #acquireBoundedFirstOpenLock` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7572` |
| 0.1% | 2.4ms | 0.0% | 0us | `ensureDirSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1574` |
| 0.1% | 2.4ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7602` |
| 0.1% | 2.4ms | 0.0% | 0us | `async #acquireBoundedFirstOpenLock` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7564` |
| 0.1% | 2.4ms | 0.0% | 0us | `acquireExclusiveLockSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1524` |
| 0.1% | 2.3ms | 0.0% | 0us | `buildSessionContext` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16361` |
| 0.1% | 2.3ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17460` |
| 0.1% | 2.3ms | 0.0% | 1.1ms | `realpathSync` | `[native code]` |
| 0.1% | 2.2ms | 0.1% | 2.2ms | `subarray` | `[native code]` |
| 0.1% | 2.2ms | 0.0% | 0us | `cachedResidentCacheProcessStartTimeMs` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:457` |
| 0.1% | 2.2ms | 0.0% | 0us | `residentCacheOwnerIsStale` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:469` |
| 0.1% | 2.2ms | 0.0% | 0us | `async sweepResidentCacheRoot` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:565` |
| 0.1% | 2.1ms | 0.0% | 1.0ms | `openSync` | `[native code]` |
| 0.1% | 1.9ms | 0.0% | 0us | `openFirstOpenSidecarWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6547` |
| 0.1% | 1.9ms | 0.0% | 0us | `openBufferedWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1815` |
| 0.0% | 1.5ms | 0.0% | 0us | `next` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:515` |
| 0.0% | 1.5ms | 0.0% | 0us | `parseWithoutProcessing` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:53` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `anonymous` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js` |
| 0.0% | 1.5ms | 0.0% | 0us | `compileInput` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:508` |
| 0.0% | 1.5ms | 0.0% | 0us | `parse` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:59` |
| 0.0% | 1.5ms | 0.0% | 0us | `lex` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:297` |
| 0.0% | 1.5ms | 0.0% | 0us | `parse` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:320` |
| 0.0% | 1.5ms | 0.0% | 0us | `lex` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:526` |
| 0.0% | 1.4ms | 0.0% | 0us | `internal:util/inspect` | `internal:util/inspect:538` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `defineColorAlias` | `internal:util/inspect` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:18` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `keys` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 0us | `node:zlib` | `node:zlib:445` |
| 0.0% | 1.4ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8146` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.runtime.js:12` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/base.js:23` |
| 0.0% | 1.4ms | 0.0% | 0us | `get ReadStream` | `node:fs:578` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `digest` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `template` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:213` |
| 0.0% | 1.4ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/branch-summarization.ts:272` |
| 0.0% | 1.4ms | 0.0% | 0us | `wrap` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js:110` |
| 0.0% | 1.4ms | 0.0% | 0us | `objectLiteral` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js:137` |
| 0.0% | 1.4ms | 0.0% | 0us | `compileChildren` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:829` |
| 0.0% | 1.4ms | 0.0% | 0us | `setupHelperArgs` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:1115` |
| 0.0% | 1.4ms | 0.0% | 0us | `compile` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:115` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `SourceNode` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/lib/source-node.js:43` |
| 0.0% | 1.4ms | 0.0% | 0us | `castChunk` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js:57` |
| 0.0% | 1.4ms | 0.0% | 0us | `compile` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:99` |
| 0.0% | 1.4ms | 0.0% | 0us | `invokeAmbiguous` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:713` |
| 0.0% | 1.4ms | 0.0% | 0us | `setupHelper` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:1030` |
| 0.0% | 1.4ms | 0.0% | 0us | `generateList` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js:151` |
| 0.0% | 1.4ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:770` |
| 0.0% | 1.4ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:321` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `repeat` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` |
| 0.0% | 1.4ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` |
| 0.0% | 1.4ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:1452` |
| 0.0% | 1.4ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:807` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.0% | 1.4ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:58` |
| 0.0% | 1.3ms | 0.0% | 0us | `map` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 0us | `getSessionMemoryStats` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:14258` |
| 0.0% | 1.3ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:907` |
| 0.0% | 1.3ms | 0.0% | 0us | `#disposableSidecarPaths` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12166` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `counterEvidence` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.0% | 1.3ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:894` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:1752` |
| 0.0% | 1.3ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/anthropic-messages-server-schema.ts:213` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:6` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `bytesStartWith` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1366` |
| 0.0% | 1.3ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8056` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8061` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `Writable` | `internal:streams/writable` |
| 0.0% | 1.3ms | 0.0% | 0us | `WriteStream` | `internal:fs/streams:245` |
| 0.0% | 1.3ms | 0.0% | 0us | `node:assert/strict` | `node:assert/strict:3` |
| 0.0% | 1.3ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.0% | 1.3ms | 0.0% | 0us | `internal:assert/assertion_error` | `internal:assert/assertion_error:2` |
| 0.0% | 1.3ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 0.0% | 1.3ms | 0.0% | 0us | `assign` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 0us | `internal:util/colors` | `internal:util/colors:24` |
| 0.0% | 1.3ms | 0.0% | 0us | `refresh` | `internal:util/colors:18` |
| 0.0% | 1.3ms | 0.0% | 0us | `get` | `node:assert:70` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `get buffer` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `init` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:21` |
| 0.0% | 1.3ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:48` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `#getSessionContextForRead` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `isResidentCacheInstanceDirName` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts` |
| 0.0% | 1.3ms | 0.0% | 0us | `async sweepResidentCacheRoot` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:559` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `disposeVerifiedResidentCacheInstanceDir` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts` |
| 0.0% | 1.3ms | 0.0% | 0us | `#releaseResidentTextStore` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7145` |
| 0.0% | 1.3ms | 0.0% | 0us | `#disposeResidentTextStore` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7054` |
| 0.0% | 1.3ms | 0.0% | 0us | `dispose` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:1234` |
| 0.0% | 1.3ms | 0.0% | 0us | `async close` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:14068` |
| 0.0% | 1.3ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:768` |
| 0.0% | 1.3ms | 0.0% | 0us | `compile` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:144` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `Function` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.2ms | 0.0% | 0us | `SessionManager` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6762` |
| 0.0% | 1.2ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17451` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:7` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `materializeResidentEntriesSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.2ms | 0.0% | 0us | `#preparedResidentTransitionFromSource` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6888` |
| 0.0% | 1.2ms | 0.0% | 0us | `#prepareResidentTextStoreTransition` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6940` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `has` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1478` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@anthropic-ai/sdk/resources/beta/beta.mjs:38` |
| 0.0% | 1.1ms | 0.0% | 0us | `secureOwnerOnlyFileDescriptor` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:675` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `verifyOwnerOnlyPathSecurity` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8342` |
| 0.0% | 1.1ms | 0.0% | 0us | `closeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1170` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:59` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/propagation-api.js:10` |
| 0.0% | 1.1ms | 0.0% | 0us | `providerStateEntryKey` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1063` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `isProviderStateEntry` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1059` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7921` |
| 0.0% | 1.1ms | 0.0% | 0us | `_enum` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1007` |
| 0.0% | 1.1ms | 0.0% | 0us | `filter` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/gjc-runtime/state-schema.ts:18` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:966` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:1657` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:17` |
| 0.0% | 1.1ms | 0.0% | 0us | `getEnumValues` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:17` |
| 0.0% | 1.1ms | 0.0% | 0us | `ZodEnum` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.0% | 1.1ms | 0.0% | 0us | `fsyncFirstOpenSidecarWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6573` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `cpuUsage` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 0us | `#scanBoundedTranscriptForFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7972` |
| 0.0% | 1.1ms | 0.0% | 0us | `recordFirstOpenPhase` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6502` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:22` |
| 0.0% | 1.1ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17459` |
| 0.0% | 1.1ms | 0.0% | 0us | `async #initSessionFile` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8358` |
| 0.0% | 1.1ms | 0.0% | 0us | `async #tryInitSessionFileFromSidecar` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7349` |
| 0.0% | 1.1ms | 0.0% | 0us | `#resetSidecarRuntime` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10505` |
| 0.0% | 1.1ms | 0.0% | 0us | `async #initSessionFile` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8350` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `dictionaryPartitionPaths` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.1ms | 0.0% | 0us | `async #tryInitSessionFileFromSidecar` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7331` |
| 0.0% | 1.1ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/chalk/source/vendor/supports-color/index.js:186` |
| 0.0% | 1.1ms | 0.0% | 0us | `createSupportsColor` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/chalk/source/vendor/supports-color/index.js:177` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_supportsColor` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/chalk/source/vendor/supports-color/index.js` |
| 0.0% | 1.1ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17438` |
| 0.0% | 1.1ms | 0.0% | 0us | `inspectTranscriptHeaderBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3602` |
| 0.0% | 1.1ms | 0.0% | 0us | `resolveEquivalentPath` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/dirs.ts:107` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7861` |
| 0.0% | 1.1ms | 0.0% | 0us | `getEntry` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16118` |
| 0.0% | 1.1ms | 0.0% | 0us | `#findColdEntryIndex` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12354` |
| 0.0% | 1.1ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:898` |
| 0.0% | 1.1ms | 0.0% | 0us | `#resolveEntry` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12617` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:900` |
| 0.0% | 1.1ms | 0.0% | 0us | `async measurePhase` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:592` |
| 0.0% | 1.1ms | 0.0% | 0us | `async measurePhase` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:595` |
| 0.0% | 1.1ms | 0.0% | 0us | `#coldIndexDigestValid` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12300` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:323` |
| 0.0% | 1.1ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:1050` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `aggregateStats` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:437` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:8` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:11` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:28` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7858` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7856` |
| 0.0% | 1.0ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8174` |
| 0.0% | 1.0ms | 0.0% | 0us | `FileSessionStorageWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1020` |
| 0.0% | 1.0ms | 0.0% | 0us | `jsonLikeValueExceedsCacheLimit` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4917` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `visit` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.0ms | 0.0% | 0us | `#getSessionContextForRead` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16414` |
| 0.0% | 1.0ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7644` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `renameNoReplacePath` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10456` |
| 0.0% | 1.0ms | 0.0% | 0us | `#withSessionPersistenceFenceSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10058` |
| 0.0% | 1.0ms | 0.0% | 0us | `createFileCommitMarkerCheckedSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:851` |
| 0.0% | 1.0ms | 0.0% | 0us | `createSessionCommitMarkerCheckedSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:781` |
| 0.0% | 1.0ms | 0.0% | 0us | `bound clone` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `bound strict` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:234` |
| 0.0% | 1.0ms | 0.0% | 0us | `clone` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:262` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `hasStrictSessionSchema` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3399` |
| 0.0% | 1.0ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:340` |
| 0.0% | 1.0ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7611` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `replace` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `#resetSidecarRuntime` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10507` |
| 0.0% | 866us | 0.0% | 0us | `FileSessionStorageWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1011` |
| 0.0% | 866us | 0.0% | 0us | `bound join` | `[native code]` |
| 0.0% | 866us | 0.0% | 866us | `join` | `[native code]` |
| 0.0% | 866us | 0.0% | 0us | `#scanBoundedTranscriptForFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7787` |
| 0.0% | 866us | 0.0% | 0us | `assertNoReparsePath` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:701` |

## Function Details

### `update`
`[native code]` | Self: 43.7% (712.1ms) | Total: 43.7% (712.1ms) | Samples: 558

**Called by:**
- `updateBoundedTranscriptHash` (278)
- `computeLineDigest` (264)
- `#buildBoundedFirstOpenSidecars` (16)

### `anonymous`
`[native code]` | Self: 10.3% (169.1ms) | Total: 26.5% (432.0ms) | Samples: 15

**Called by:**
- `require` (39)
- `node:util` (2)
- `loadAssertionError` (1)
- `internal:assert/assertion_error` (1)
- `node:fs/promises` (1)
- `get ReadStream` (1)
- `node:dns/promises` (1)
- `internal:validators` (1)
- `internal:streams/transform` (1)
- `node:crypto` (1)
- `internal:streams/duplex` (1)
- `node:assert/strict` (1)
- `internal:streams/readable` (1)
- `internal:shared` (1)
- `internal:streams/lazy_transform` (1)
- `node:events` (1)

**Calls:**
- `(anonymous)` (6)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:streams/transform` (1)
- `(anonymous)` (1)
- `internal:streams/duplex` (1)
- `internal:streams/readable` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:util/colors` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:util/inspect` (1)
- `internal:validators` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:assert/assertion_error` (1)
- `node:assert` (1)
- `(anonymous)` (1)
- `internal:shared` (1)
- `internal:streams/lazy_transform` (1)
- `node:events` (1)

### `write`
`[native code]` | Self: 8.7% (141.9ms) | Total: 8.7% (141.9ms) | Samples: 110

**Called by:**
- `async (anonymous)` (109)
- `(anonymous)` (1)

### `stringify`
`[native code]` | Self: 6.1% (100.2ms) | Total: 6.1% (100.2ms) | Samples: 78

**Called by:**
- `serialize` (78)

### `byteLength`
`[native code]` | Self: 4.9% (80.1ms) | Total: 4.9% (80.1ms) | Samples: 62

**Called by:**
- `async generateTranscript` (49)
- `async (anonymous)` (11)
- `(anonymous)` (2)

### `gc`
`[native code]` | Self: 4.8% (78.5ms) | Total: 4.8% (78.5ms) | Samples: 57

**Called by:**
- `memorySample` (22)
- `recordFirstOpenGcRequest` (18)
- `async settledMemorySample` (17)

### `readSync`
`[native code]` | Self: 3.8% (62.3ms) | Total: 3.8% (62.3ms) | Samples: 49

**Called by:**
- `scanTranscriptLinesBounded` (47)
- `readRangeSync` (2)

### `parse`
`[native code]` | Self: 3.2% (53.0ms) | Total: 3.2% (53.0ms) | Samples: 41

**Called by:**
- `(anonymous)` (41)

### `registry`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/registries.js` | Self: 2.3% (38.3ms) | Total: 2.3% (38.3ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `_makeCompatibilityCheck`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/internal/semver.js` | Self: 2.1% (34.5ms) | Total: 2.1% (34.5ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `toString`
`[native code]` | Self: 2.0% (33.6ms) | Total: 2.0% (33.6ms) | Samples: 27

**Called by:**
- `(anonymous)` (27)

### `indexOf`
`[native code]` | Self: 0.9% (16.1ms) | Total: 0.9% (16.1ms) | Samples: 13

**Called by:**
- `consume` (13)

### `copy`
`[native code]` | Self: 0.5% (9.0ms) | Total: 0.5% (9.0ms) | Samples: 7

**Called by:**
- `consume` (4)
- `consume` (3)

### `dlopen`
`[native code]` | Self: 0.4% (6.6ms) | Total: 0.4% (6.6ms) | Samples: 5

**Called by:**
- `(anonymous)` (5)

### `spawnSync`
`[native code]` | Self: 0.3% (5.0ms) | Total: 0.3% (5.0ms) | Samples: 4

**Called by:**
- `residentCacheProcessStartTimeMs` (4)

### `defineLazy`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:62` | Self: 0.2% (4.3ms) | Total: 0.2% (4.3ms) | Samples: 2

**Called by:**
- `(anonymous)` (1)
- `(anonymous)` (1)

### `RegExp`
`[native code]` | Self: 0.2% (4.1ms) | Total: 0.2% (4.1ms) | Samples: 2

**Called by:**
- `getRegex` (1)
- `(module)` (1)

### `ZodObject`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:40` | Self: 0.2% (3.9ms) | Total: 0.2% (3.9ms) | Samples: 2

**Called by:**
- `object` (1)
- `clone` (1)

### `bigint`
`[native code]` | Self: 0.2% (3.7ms) | Total: 0.2% (3.7ms) | Samples: 3

**Called by:**
- `(anonymous)` (2)
- `(anonymous)` (1)

### `(anonymous)`
`[native code]` | Self: 0.2% (3.7ms) | Total: 84.7% (1.37s) | Samples: 3

**Called by:**
- `processTicksAndRejections` (1056)
- `require` (6)
- `(anonymous)` (6)
- `bound require` (5)
- `decodeBoundedJsonLine` (1)
- `refresh` (1)

**Calls:**
- `async #tryBoundedFirstOpen` (714)
- `async generateTranscript` (121)
- `async generateTranscript` (76)
- `async generateTranscript` (49)
- `async #tryBoundedFirstOpen` (20)
- `memorySample` (18)
- `async settledMemorySample` (17)
- `async runWorker` (10)
- `(anonymous)` (6)
- `dlopen` (5)
- `(module)` (5)
- `async runWorker` (4)
- `async generateTranscript` (4)
- `async #initSessionFile` (3)
- `async #tryBoundedFirstOpen` (3)
- `async open` (2)
- `async sweepResidentCacheRoot` (2)
- `async runWorker` (1)
- `async runWorker` (1)
- `async #tryBoundedFirstOpen` (1)
- `async close` (1)
- `async runWorker` (1)
- `async (anonymous)` (1)
- `async generateTranscript` (1)
- `async sweepResidentCacheRoot` (1)
- `WriteStream` (1)
- `async generateTranscript` (1)
- `async runWorker` (1)
- `async #tryBoundedFirstOpen` (1)
- `async generateTranscript` (1)

### `serialize`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:302` | Self: 0.2% (3.7ms) | Total: 6.3% (103.9ms) | Samples: 3

**Called by:**
- `async generateTranscript` (76)
- `async generateTranscript` (4)
- `async generateTranscript` (1)

**Calls:**
- `stringify` (78)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/index.js` | Self: 0.1% (2.5ms) | Total: 0.1% (2.5ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `mkdirSync`
`[native code]` | Self: 0.1% (2.4ms) | Total: 0.2% (4.8ms) | Samples: 2

**Called by:**
- `mkdirSync` (2)
- `ensureDirSync` (2)

**Calls:**
- `mkdirSync` (2)

### `subarray`
`[native code]` | Self: 0.1% (2.2ms) | Total: 0.1% (2.2ms) | Samples: 2

**Called by:**
- `consume` (1)
- `(anonymous)` (1)

### `anonymous`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `next` (1)

### `defineColorAlias`
`internal:util/inspect` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `internal:util/inspect` (1)

### `keys`
`[native code]` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `node:zlib` (1)

### `add`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:1785` | Self: 0.0% (1.4ms) | Total: 0.1% (2.7ms) | Samples: 1

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `has` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7807` | Self: 0.0% (1.4ms) | Total: 0.1% (2.5ms) | Samples: 1

**Called by:**
- `consume` (2)

**Calls:**
- `hasStrictSessionSchema` (1)

### `digest`
`[native code]` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `template`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:213` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `ret` (1)

### `SourceNode`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/lib/source-node.js:43` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `wrap` (1)

### `repeat`
`[native code]` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `async generateTranscript` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `from` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `async runWorker` (1)

### `from`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.9% (15.3ms) | Samples: 1

**Called by:**
- `async runWorker` (10)
- `#disposableSidecarPaths` (1)
- `(module)` (1)

**Calls:**
- `async openNext` (10)
- `(anonymous)` (1)

### `counterEvidence`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `async runWorker` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `async #tryBoundedFirstOpen` (1)

### `bytesStartWith`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1366` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `Writable`
`internal:streams/writable` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `WriteStream` (1)

### `get buffer`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `decodeBoundedJsonLine` (1)

### `init`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:21` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `ZodOptional` (1)

### `#getSessionContextForRead`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `buildSessionContext` (1)

### `isResidentCacheInstanceDirName`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `async sweepResidentCacheRoot` (1)

### `async write`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:304` | Self: 0.0% (1.3ms) | Total: 9.5% (155.6ms) | Samples: 1

**Called by:**
- `async generateTranscript` (121)

**Calls:**
- `async (anonymous)` (109)
- `async (anonymous)` (11)

### `disposeVerifiedResidentCacheInstanceDir`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `dispose` (1)

### `Function`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `compile` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `SessionManager` (1)

### `materializeResidentEntriesSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `#preparedResidentTransitionFromSource` (1)

### `has`
`[native code]` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `add` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@anthropic-ai/sdk/resources/beta/beta.mjs:38` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

### `verifyOwnerOnlyPathSecurity`
`[native code]` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `secureOwnerOnlyFileDescriptor` (1)

### `isProviderStateEntry`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1059` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `providerStateEntryKey` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:17` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `filter` (1)

### `cpuUsage`
`[native code]` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `recordFirstOpenPhase` (1)

### `dictionaryPartitionPaths`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `#resetSidecarRuntime` (1)

### `_supportsColor`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/chalk/source/vendor/supports-color/index.js` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `createSupportsColor` (1)

### `realpathSync`
`[native code]` | Self: 0.0% (1.1ms) | Total: 0.1% (2.3ms) | Samples: 1

**Called by:**
- `resolveEquivalentPath` (1)
- `realpathSync` (1)

**Calls:**
- `realpathSync` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:323` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `aggregateStats`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:437` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `async runWorker` (1)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1553` | Self: 0.0% (1.0ms) | Total: 3.7% (60.8ms) | Samples: 1

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (48)

**Calls:**
- `readSync` (47)

### `openSync`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.1% (2.1ms) | Samples: 1

**Called by:**
- `FileSessionStorageWriter` (1)
- `openSync` (1)

**Calls:**
- `openSync` (1)

### `visit`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `jsonLikeValueExceedsCacheLimit` (1)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:307` | Self: 0.0% (1.0ms) | Total: 8.7% (141.9ms) | Samples: 1

**Called by:**
- `async write` (109)
- `(anonymous)` (1)

**Calls:**
- `write` (109)

### `renameNoReplacePath`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `createFileCommitMarkerCheckedSync` (1)

### `hasStrictSessionSchema`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3399` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `replace`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `#resetSidecarRuntime` (1)

### `join`
`[native code]` | Self: 0.0% (866us) | Total: 0.0% (866us) | Samples: 1

**Called by:**
- `bound join` (1)

### `readRangeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1625` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Called by:**
- `#buildBoundedFirstOpenSidecars` (1)
- `#coldIndexDigestValid` (1)

**Calls:**
- `readSync` (2)

### `internal:streams/lazy_transform`
`internal:streams/lazy_transform:2` | Self: 0.0% (0us) | Total: 0.6% (10.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `recordFirstOpenPhase`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6502` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `fsyncFirstOpenSidecarWriter` (1)

**Calls:**
- `cpuUsage` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js:15` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:807` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `async runWorker` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17459` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `async #initSessionFile` (1)

### `openVerifiedResidentCacheInstanceDir`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:621` | Self: 0.0% (0us) | Total: 0.1% (2.8ms) | Samples: 0

**Called by:**
- `#newResidentTextStoreCandidate` (2)

**Calls:**
- `writeResidentCacheOwnerToken` (2)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:340` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

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

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:1755` | Self: 0.0% (0us) | Total: 0.1% (2.9ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `defineLazy` (1)

### `#scanBoundedTranscriptForFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7788` | Self: 0.0% (0us) | Total: 55.4% (901.9ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (712)

**Calls:**
- `scanTranscriptLinesBounded` (660)
- `scanTranscriptLinesBounded` (48)
- `scanTranscriptLinesBounded` (4)

### `filter`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `getEnumValues` (1)

**Calls:**
- `(anonymous)` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:58` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Calls:**
- `RegExp` (1)

### `#findColdEntryIndex`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12354` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `#resolveEntry` (1)

**Calls:**
- `#coldIndexDigestValid` (1)

### `#scanBoundedTranscriptForFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7972` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `fsyncFirstOpenSidecarWriter` (1)

### `createSessionCommitMarkerCheckedSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:781` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `createFileCommitMarkerCheckedSync` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:8` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/gjc-runtime/state-schema.ts:18` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Calls:**
- `_enum` (1)

### `loadNative`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:544` | Self: 0.0% (0us) | Total: 0.4% (6.6ms) | Samples: 0

**Called by:**
- `(module)` (5)

**Calls:**
- `loadFromCandidates` (5)

### `bound require`
`[native code]` | Self: 0.0% (0us) | Total: 14.1% (230.9ms) | Samples: 0

**Called by:**
- `canonicalizeTrustedPath` (7)
- `(anonymous)` (6)
- `getHandlebars` (6)
- `loadFromCandidates` (5)
- `(anonymous)` (2)
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
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `require` (45)
- `(anonymous)` (5)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8061` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `consume` (1)

**Calls:**
- `bytesStartWith` (1)

### `internal:util/colors`
`internal:util/colors:24` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `refresh` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:59` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Calls:**
- `bound require` (1)

### `recordFirstOpenGcRequest`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6525` | Self: 0.0% (0us) | Total: 1.3% (22.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (14)
- `scanTranscriptLinesBounded` (4)

**Calls:**
- `gc` (18)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `assign` (1)

**Calls:**
- `loadAssertionError` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/utils.ts:185` | Self: 0.0% (0us) | Total: 0.5% (9.3ms) | Samples: 0

**Calls:**
- `render` (7)

### `get ReadStream`
`node:fs:578` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `node:zlib`
`node:zlib:445` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Calls:**
- `keys` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:48` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Calls:**
- `bound optional` (1)

### `bound optional`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (5.6ms) | Samples: 0

**Called by:**
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `optional` (2)
- `optional` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:18` | Self: 0.0% (0us) | Total: 0.1% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `#resetSidecarRuntime`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10507` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `replace` (1)

### `compile`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:115` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `compileChildren` (1)

**Calls:**
- `invokeAmbiguous` (1)

### `clone`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:262` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `bound clone` (1)

**Calls:**
- `ZodObject` (1)

### `object`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:791` | Self: 0.0% (0us) | Total: 0.1% (2.9ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `ZodObject` (1)

### `bound strict`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `bound clone` (1)

### `parseWithoutProcessing`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:53` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `parse` (1)

**Calls:**
- `parse` (1)

### `#coldIndexDigestValid`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12300` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `#findColdEntryIndex` (1)

**Calls:**
- `readRangeSync` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:8` | Self: 0.0% (0us) | Total: 0.1% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `acquireExclusiveLockSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1524` | Self: 0.0% (0us) | Total: 0.1% (2.4ms) | Samples: 0

**Called by:**
- `async #acquireBoundedFirstOpenLock` (2)

**Calls:**
- `ensureDirSync` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7839` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Called by:**
- `consume` (2)

**Calls:**
- `bigint` (2)

### `providerStateEntryKey`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1063` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `isProviderStateEntry` (1)

### `ZodEnum`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `_enum` (1)

**Calls:**
- `init` (1)

### `getHandlebars`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:237` | Self: 0.0% (0us) | Total: 0.4% (7.7ms) | Samples: 0

**Called by:**
- `compile` (6)

**Calls:**
- `bound require` (6)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7837` | Self: 0.0% (0us) | Total: 20.6% (335.6ms) | Samples: 0

**Called by:**
- `consume` (265)

**Calls:**
- `computeLineDigest` (264)
- `digest` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7856` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `consume` (1)

**Calls:**
- `write` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:22` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:366` | Self: 0.0% (0us) | Total: 9.5% (155.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (121)

**Calls:**
- `async write` (121)

### `init`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:22` | Self: 0.0% (0us) | Total: 0.6% (11.1ms) | Samples: 0

**Called by:**
- `ZodOptional` (2)
- `(anonymous)` (2)
- `ZodEnum` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `fsyncFirstOpenSidecarWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6573` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (1)

**Calls:**
- `recordFirstOpenPhase` (1)

### `dispose`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:1234` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `#disposeResidentTextStore` (1)

**Calls:**
- `disposeVerifiedResidentCacheInstanceDir` (1)

### `optional`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1110` | Self: 0.0% (0us) | Total: 0.3% (5.6ms) | Samples: 0

**Called by:**
- `bound optional` (2)
- `optional` (1)

**Calls:**
- `ZodOptional` (3)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/utils/discovery/antigravity.ts:63` | Self: 0.0% (0us) | Total: 0.1% (2.9ms) | Samples: 0

**Calls:**
- `bound optional` (1)

### `render`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:493` | Self: 0.0% (0us) | Total: 0.8% (13.4ms) | Samples: 0

**Called by:**
- `(module)` (7)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `compile` (6)
- `ret` (4)

### `async close`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:14068` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `#releaseResidentTextStore` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17419` | Self: 0.0% (0us) | Total: 0.7% (12.5ms) | Samples: 0

**Called by:**
- `async (anonymous)` (10)

**Calls:**
- `async open` (7)
- `async open` (1)
- `async open` (1)
- `async open` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/branch-summarization.ts:272` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Calls:**
- `render` (1)

### `canonicalizeTrustedPath`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/managed-session-scope.ts:406` | Self: 0.0% (0us) | Total: 0.5% (8.9ms) | Samples: 0

**Called by:**
- `async open` (7)

**Calls:**
- `bound require` (7)

### `compileInput`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:510` | Self: 0.0% (0us) | Total: 0.1% (2.7ms) | Samples: 0

**Called by:**
- `ret` (2)

**Calls:**
- `compile` (1)
- `compile` (1)

### `#resolveEntry`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12617` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `getEntry` (1)

**Calls:**
- `#findColdEntryIndex` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/lib/index.js:8` | Self: 0.0% (0us) | Total: 0.4% (7.7ms) | Samples: 0

**Called by:**
- `anonymous` (6)

**Calls:**
- `bound require` (6)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 83.1% (1.35s) | Samples: 0

**Calls:**
- `(anonymous)` (1056)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17451` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `SessionManager` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17438` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `inspectTranscriptHeaderBounded` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7834` | Self: 0.0% (0us) | Total: 0.1% (2.7ms) | Samples: 0

**Called by:**
- `consume` (2)

**Calls:**
- `add` (2)

### `createFileCommitMarkerCheckedSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:851` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `createSessionCommitMarkerCheckedSync` (1)

**Calls:**
- `renameNoReplacePath` (1)

### `async settledMemorySample`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:245` | Self: 0.0% (0us) | Total: 1.4% (23.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (17)

**Calls:**
- `gc` (17)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:770` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Calls:**
- `render` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:349` | Self: 0.0% (0us) | Total: 3.9% (64.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (49)

**Calls:**
- `byteLength` (49)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/internal/global-utils.js:9` | Self: 0.0% (0us) | Total: 2.1% (34.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `loadFromCandidates`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:215` | Self: 0.0% (0us) | Total: 0.4% (6.6ms) | Samples: 0

**Called by:**
- `loadNative` (5)

**Calls:**
- `bound require` (5)

### `decodeBoundedJsonLine`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1362` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `(anonymous)` (1)
- `get buffer` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:8` | Self: 0.0% (0us) | Total: 2.1% (34.5ms) | Samples: 0

**Calls:**
- `bound require` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8342` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `closeSync` (1)

### `internal:util/inspect`
`internal:util/inspect:538` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `defineColorAlias` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8056` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `scanTranscriptLinesBounded` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:332` | Self: 0.0% (0us) | Total: 0.3% (5.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `serialize` (4)

### `internal:validators`
`internal:validators:2` | Self: 0.0% (0us) | Total: 0.2% (3.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `compile`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:485` | Self: 0.0% (0us) | Total: 0.4% (7.7ms) | Samples: 0

**Called by:**
- `render` (6)

**Calls:**
- `getHandlebars` (6)

### `compile`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:99` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `compileInput` (1)

**Calls:**
- `compileChildren` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:966` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `jsonLikeValueExceedsCacheLimit`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4917` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `#getSessionContextForRead` (1)

**Calls:**
- `visit` (1)

### `#prepareResidentTextStoreTransition`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6940` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `#preparedResidentTransitionFromSource` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/chalk/source/vendor/supports-color/index.js:186` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Calls:**
- `createSupportsColor` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:16` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `#releaseResidentTextStore`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7145` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `async close` (1)

**Calls:**
- `#disposeResidentTextStore` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:14` | Self: 0.0% (0us) | Total: 0.1% (2.7ms) | Samples: 0

**Calls:**
- `getRegex` (1)

### `resolveEquivalentPath`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/dirs.ts:107` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `inspectTranscriptHeaderBounded` (1)

**Calls:**
- `realpathSync` (1)

### `invokeAmbiguous`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:713` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `compile` (1)

**Calls:**
- `setupHelper` (1)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 0.6% (10.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `buildSessionContext`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16361` | Self: 0.0% (0us) | Total: 0.1% (2.3ms) | Samples: 0

**Called by:**
- `async open` (2)

**Calls:**
- `#getSessionContextForRead` (1)
- `#getSessionContextForRead` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10456` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `#withSessionPersistenceFenceSync` (1)

**Calls:**
- `createSessionCommitMarkerCheckedSync` (1)

### `lex`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:297` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `parse` (1)

**Calls:**
- `lex` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:1752` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `defineLazy` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1478` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (1)

**Calls:**
- `subarray` (1)

### `ensureDirSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1574` | Self: 0.0% (0us) | Total: 0.1% (2.4ms) | Samples: 0

**Called by:**
- `acquireExclusiveLockSync` (2)

**Calls:**
- `mkdirSync` (2)

### `ret`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:517` | Self: 0.0% (0us) | Total: 0.3% (5.7ms) | Samples: 0

**Called by:**
- `render` (4)

**Calls:**
- `compileInput` (2)
- `template` (1)
- `compileInput` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:22` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Calls:**
- `bound require` (1)

### `residentCacheOwnerIsStale`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:469` | Self: 0.0% (0us) | Total: 0.1% (2.2ms) | Samples: 0

**Called by:**
- `async sweepResidentCacheRoot` (2)

**Calls:**
- `cachedResidentCacheProcessStartTimeMs` (2)

### `async measurePhase`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:595` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async measurePhase` (1)

**Calls:**
- `(anonymous)` (1)

### `internal:streams/transform`
`internal:streams/transform:2` | Self: 0.0% (0us) | Total: 0.6% (10.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8174` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `openFirstOpenSidecarWriter` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:7` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `getSessionMemoryStats`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:14258` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `#disposableSidecarPaths` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1104` | Self: 0.0% (0us) | Total: 0.2% (4.3ms) | Samples: 0

**Called by:**
- `init` (2)

**Calls:**
- `init` (2)

### `setupHelper`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:1030` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `invokeAmbiguous` (1)

**Calls:**
- `setupHelperArgs` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8151` | Self: 0.0% (0us) | Total: 1.5% (25.9ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (16)

**Calls:**
- `update` (16)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1486` | Self: 0.0% (0us) | Total: 0.2% (3.9ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (3)

**Calls:**
- `copy` (3)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7794` | Self: 0.0% (0us) | Total: 21.6% (352.0ms) | Samples: 0

**Called by:**
- `consume` (278)

**Calls:**
- `updateBoundedTranscriptHash` (278)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/propagation-api.js:10` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:18` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `SessionManager`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6762` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `(anonymous)` (1)

### `assertNoReparsePath`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:701` | Self: 0.0% (0us) | Total: 0.0% (866us) | Samples: 0

**Called by:**
- `FileSessionStorageWriter` (1)

**Calls:**
- `bound join` (1)

### `writeResidentCacheOwnerToken`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:314` | Self: 0.0% (0us) | Total: 0.1% (2.8ms) | Samples: 0

**Called by:**
- `openVerifiedResidentCacheInstanceDir` (2)

**Calls:**
- `residentCacheProcessStartTimeMs` (2)

### `getEnumValues`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:17` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `filter` (1)

### `WriteStream`
`internal:fs/streams:245` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `Writable` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/baggage/utils.js:8` | Self: 0.0% (0us) | Total: 2.1% (34.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async openNext`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:865` | Self: 0.0% (0us) | Total: 0.7% (12.5ms) | Samples: 0

**Called by:**
- `from` (10)

**Calls:**
- `async (anonymous)` (10)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:1452` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Calls:**
- `async runWorker` (1)

### `async #initSessionFile`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8350` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `async #initSessionFile` (1)

### `objectLiteral`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js:137` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `setupHelperArgs` (1)

**Calls:**
- `generateList` (1)

### `internal:assert/assertion_error`
`internal:assert/assertion_error:2` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `require`
`[native code]` | Self: 0.0% (0us) | Total: 13.7% (224.2ms) | Samples: 0

**Called by:**
- `bound require` (45)

**Calls:**
- `anonymous` (39)
- `(anonymous)` (6)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1574` | Self: 0.0% (0us) | Total: 0.2% (4.6ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (4)

**Calls:**
- `recordFirstOpenGcRequest` (4)

### `#withSessionPersistenceFenceSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10058` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `(anonymous)` (1)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:306` | Self: 0.0% (0us) | Total: 0.8% (13.4ms) | Samples: 0

**Called by:**
- `async write` (11)

**Calls:**
- `byteLength` (11)

### `#disposableSidecarPaths`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12166` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `getSessionMemoryStats` (1)

**Calls:**
- `from` (1)

### `async #acquireBoundedFirstOpenLock`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7572` | Self: 0.0% (0us) | Total: 0.1% (2.4ms) | Samples: 0

**Called by:**
- `async #acquireBoundedFirstOpenLock` (2)

**Calls:**
- `acquireExclusiveLockSync` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:900` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async measurePhase` (1)

**Calls:**
- `getEntry` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/diag/ComponentLogger.js:8` | Self: 0.0% (0us) | Total: 2.1% (34.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `node:fs/promises`
`node:fs/promises:2` | Self: 0.0% (0us) | Total: 0.2% (3.6ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/registries.js:50` | Self: 0.0% (0us) | Total: 2.3% (38.3ms) | Samples: 0

**Calls:**
- `registry` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:324` | Self: 0.0% (0us) | Total: 6.0% (97.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (76)

**Calls:**
- `serialize` (76)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7921` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `consume` (1)

**Calls:**
- `providerStateEntryKey` (1)

### `getEntry`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16118` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `#resolveEntry` (1)

### `async #initSessionFile`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8358` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async #initSessionFile` (1)

**Calls:**
- `async #tryInitSessionFileFromSidecar` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.runtime.js:12` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7602` | Self: 0.0% (0us) | Total: 0.1% (2.4ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (2)

**Calls:**
- `async #acquireBoundedFirstOpenLock` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:6` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1476` | Self: 0.0% (0us) | Total: 0.9% (16.1ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (13)

**Calls:**
- `indexOf` (13)

### `internal:shared`
`internal:shared:2` | Self: 0.0% (0us) | Total: 0.2% (3.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `ZodOptional`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.3% (5.6ms) | Samples: 0

**Called by:**
- `optional` (3)

**Calls:**
- `init` (2)
- `init` (1)

### `#prepareResidentTextStoreTransition`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6939` | Self: 0.0% (0us) | Total: 0.1% (2.8ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (2)

**Calls:**
- `#newResidentTextStoreCandidate` (2)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7644` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `#withSessionPersistenceFenceSync` (1)

### `internal:streams/readable`
`internal:streams/readable:2` | Self: 0.0% (0us) | Total: 0.6% (10.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:821` | Self: 0.0% (0us) | Total: 0.6% (10.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `memorySample` (4)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:898` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `async measurePhase` (1)

### `residentCacheProcessStartTimeMs`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:207` | Self: 0.0% (0us) | Total: 0.3% (5.0ms) | Samples: 0

**Called by:**
- `cachedResidentCacheProcessStartTimeMs` (2)
- `writeResidentCacheOwnerToken` (2)

**Calls:**
- `spawnSync` (4)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7858` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `consume` (1)

**Calls:**
- `subarray` (1)

### `FileSessionStorageWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1020` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `openBufferedWriter` (1)

**Calls:**
- `openSync` (1)

### `async #tryInitSessionFileFromSidecar`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7331` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async #initSessionFile` (1)

**Calls:**
- `async #tryInitSessionFileFromSidecar` (1)

### `secureOwnerOnlyFileDescriptor`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:675` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `closeSync` (1)

**Calls:**
- `verifyOwnerOnlyPathSecurity` (1)

### `async #acquireBoundedFirstOpenLock`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7564` | Self: 0.0% (0us) | Total: 0.1% (2.4ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (2)

**Calls:**
- `async #acquireBoundedFirstOpenLock` (2)

### `#disposeResidentTextStore`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7054` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `#releaseResidentTextStore` (1)

**Calls:**
- `dispose` (1)

### `parse`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:59` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `compileInput` (1)

**Calls:**
- `parseWithoutProcessing` (1)

### `setupHelperArgs`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:1115` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `setupHelper` (1)

**Calls:**
- `objectLiteral` (1)

### `_enum`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1007` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

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

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/index.js:16` | Self: 0.0% (0us) | Total: 0.4% (6.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `loadNative` (5)

### `#scanBoundedTranscriptForFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7787` | Self: 0.0% (0us) | Total: 0.0% (866us) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `openFirstOpenSidecarWriter` (1)

### `optional`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:125` | Self: 0.0% (0us) | Total: 0.1% (2.9ms) | Samples: 0

**Called by:**
- `bound optional` (1)

**Calls:**
- `optional` (1)

### `generateList`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js:151` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `objectLiteral` (1)

**Calls:**
- `castChunk` (1)

### `node:util`
`node:util:2` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Calls:**
- `anonymous` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/api/diag.js:8` | Self: 0.0% (0us) | Total: 2.1% (34.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `#resetSidecarRuntime`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10505` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async #tryInitSessionFileFromSidecar` (1)

**Calls:**
- `dictionaryPartitionPaths` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:907` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `map` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7637` | Self: 0.0% (0us) | Total: 1.9% (31.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (20)

**Calls:**
- `#buildBoundedFirstOpenSidecars` (16)
- `#buildBoundedFirstOpenSidecars` (1)
- `#buildBoundedFirstOpenSidecars` (1)
- `#buildBoundedFirstOpenSidecars` (1)
- `#buildBoundedFirstOpenSidecars` (1)

### `map`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `async runWorker` (1)

**Calls:**
- `getSessionMemoryStats` (1)

### `closeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1170` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `#buildBoundedFirstOpenSidecars` (1)

**Calls:**
- `secureOwnerOnlyFileDescriptor` (1)

### `#getSessionContextForRead`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16414` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `buildSessionContext` (1)

**Calls:**
- `jsonLikeValueExceedsCacheLimit` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/internal/semver.js:110` | Self: 0.0% (0us) | Total: 2.1% (34.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `_makeCompatibilityCheck` (1)

### `computeLineDigest`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:693` | Self: 0.0% (0us) | Total: 20.5% (334.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (264)

**Calls:**
- `update` (264)

### `updateBoundedTranscriptHash`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1388` | Self: 0.0% (0us) | Total: 21.6% (352.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (278)

**Calls:**
- `update` (278)

### `parse`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:320` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `parseWithoutProcessing` (1)

**Calls:**
- `lex` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:321` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `repeat` (1)

### `lex`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:526` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `lex` (1)

**Calls:**
- `next` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1500` | Self: 0.0% (0us) | Total: 0.3% (5.0ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (4)

**Calls:**
- `copy` (4)

### `async #initSessionFile`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8363` | Self: 0.0% (0us) | Total: 0.2% (3.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `async #tryBoundedFirstOpen` (3)

### `async sweepResidentCacheRoot`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:565` | Self: 0.0% (0us) | Total: 0.1% (2.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `residentCacheOwnerIsStale` (2)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8146` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `readRangeSync` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7662` | Self: 0.0% (0us) | Total: 0.2% (4.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `#prepareResidentTextStoreTransition` (2)
- `#prepareResidentTextStoreTransition` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:28` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Calls:**
- `bound require` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:894` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `counterEvidence` (1)

### `castChunk`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js:57` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `generateList` (1)

**Calls:**
- `wrap` (1)

### `compileChildren`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:829` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `compile` (1)

**Calls:**
- `compile` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:882` | Self: 0.0% (0us) | Total: 0.7% (12.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (10)

**Calls:**
- `from` (10)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `get` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7798` | Self: 0.0% (0us) | Total: 5.4% (89.4ms) | Samples: 0

**Called by:**
- `consume` (70)

**Calls:**
- `parse` (41)
- `toString` (27)
- `decodeBoundedJsonLine` (2)

### `FileSessionStorageWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1011` | Self: 0.0% (0us) | Total: 0.0% (866us) | Samples: 0

**Called by:**
- `openBufferedWriter` (1)

**Calls:**
- `assertNoReparsePath` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/index.js:10` | Self: 0.0% (0us) | Total: 0.1% (2.5ms) | Samples: 0

**Calls:**
- `(anonymous)` (1)

### `node:assert/strict`
`node:assert/strict:3` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7850` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Called by:**
- `consume` (2)

**Calls:**
- `byteLength` (2)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `assign` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17460` | Self: 0.0% (0us) | Total: 0.1% (2.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `buildSessionContext` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7931` | Self: 0.0% (0us) | Total: 1.1% (18.0ms) | Samples: 0

**Called by:**
- `consume` (14)

**Calls:**
- `recordFirstOpenGcRequest` (14)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:234` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Calls:**
- `bound strict` (1)

### `memorySample`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:232` | Self: 0.0% (0us) | Total: 1.9% (32.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (18)
- `async runWorker` (4)

**Calls:**
- `gc` (22)

### `node:events`
`node:events:9` | Self: 0.0% (0us) | Total: 0.2% (3.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `#preparedResidentTransitionFromSource`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6888` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `#prepareResidentTextStoreTransition` (1)

**Calls:**
- `materializeResidentEntriesSync` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7861` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `consume` (1)

**Calls:**
- `bigint` (1)

### `next`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:515` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `lex` (1)

**Calls:**
- `anonymous` (1)

### `#newResidentTextStoreCandidate`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6861` | Self: 0.0% (0us) | Total: 0.1% (2.8ms) | Samples: 0

**Called by:**
- `#prepareResidentTextStoreTransition` (2)

**Calls:**
- `openVerifiedResidentCacheInstanceDir` (2)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Calls:**
- `from` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7611` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `#resetSidecarRuntime` (1)

### `openBufferedWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1815` | Self: 0.0% (0us) | Total: 0.1% (1.9ms) | Samples: 0

**Called by:**
- `openFirstOpenSidecarWriter` (2)

**Calls:**
- `FileSessionStorageWriter` (1)
- `FileSessionStorageWriter` (1)

### `bound clone`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `bound strict` (1)

**Calls:**
- `clone` (1)

### `openFirstOpenSidecarWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6547` | Self: 0.0% (0us) | Total: 0.1% (1.9ms) | Samples: 0

**Called by:**
- `#buildBoundedFirstOpenSidecars` (1)
- `#scanBoundedTranscriptForFirstOpen` (1)

**Calls:**
- `openBufferedWriter` (2)

### `compileInput`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:508` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `ret` (1)

**Calls:**
- `parse` (1)

### `bound join`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (866us) | Samples: 0

**Called by:**
- `assertNoReparsePath` (1)

**Calls:**
- `join` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:11` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:1657` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `getEnumValues` (1)

### `node:crypto`
`node:crypto:2` | Self: 0.0% (0us) | Total: 0.6% (10.5ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `compile`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:144` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `compileInput` (1)

**Calls:**
- `Function` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/anthropic-messages-server-schema.ts:213` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Calls:**
- `bound optional` (1)

### `cachedResidentCacheProcessStartTimeMs`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:457` | Self: 0.0% (0us) | Total: 0.1% (2.2ms) | Samples: 0

**Called by:**
- `residentCacheOwnerIsStale` (2)

**Calls:**
- `residentCacheProcessStartTimeMs` (2)

### `node:dns/promises`
`node:dns/promises:3` | Self: 0.0% (0us) | Total: 8.5% (139.8ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `createSupportsColor`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/chalk/source/vendor/supports-color/index.js:177` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `_supportsColor` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:768` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Calls:**
- `render` (1)

### `inspectTranscriptHeaderBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3602` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `resolveEquivalentPath` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17433` | Self: 0.0% (0us) | Total: 0.5% (8.9ms) | Samples: 0

**Called by:**
- `async open` (7)

**Calls:**
- `canonicalizeTrustedPath` (7)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1557` | Self: 0.0% (0us) | Total: 51.4% (837.8ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (660)
- `#buildBoundedFirstOpenSidecars` (1)

**Calls:**
- `consume` (640)
- `consume` (13)
- `consume` (4)
- `consume` (3)
- `consume` (1)

### `async sweepResidentCacheRoot`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:559` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `isResidentCacheInstanceDirName` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7629` | Self: 0.0% (0us) | Total: 55.5% (904.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (714)

**Calls:**
- `#scanBoundedTranscriptForFirstOpen` (712)
- `#scanBoundedTranscriptForFirstOpen` (1)
- `#scanBoundedTranscriptForFirstOpen` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/base.js:23` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `getRegex`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:13` | Self: 0.0% (0us) | Total: 0.1% (2.7ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `RegExp` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7579` | Self: 0.0% (0us) | Total: 0.2% (3.7ms) | Samples: 0

**Called by:**
- `async #initSessionFile` (3)

**Calls:**
- `async #tryBoundedFirstOpen` (2)
- `async #tryBoundedFirstOpen` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1490` | Self: 0.0% (0us) | Total: 49.8% (811.4ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (640)

**Calls:**
- `(anonymous)` (278)
- `(anonymous)` (265)
- `(anonymous)` (70)
- `(anonymous)` (14)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `async measurePhase`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:592` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async runWorker` (1)

**Calls:**
- `async measurePhase` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:1050` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `aggregateStats` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/usage.ts:96` | Self: 0.0% (0us) | Total: 0.1% (2.9ms) | Samples: 0

**Calls:**
- `object` (1)

### `wrap`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js:110` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `castChunk` (1)

**Calls:**
- `SourceNode` (1)

### `async #tryInitSessionFileFromSidecar`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7349` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async #tryInitSessionFileFromSidecar` (1)

**Calls:**
- `#resetSidecarRuntime` (1)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:871` | Self: 0.0% (0us) | Total: 0.7% (12.5ms) | Samples: 0

**Called by:**
- `async openNext` (10)

**Calls:**
- `async open` (10)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 92.2% | 1.50s | `[native code]` |
| 2.3% | 38.3ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/registries.js` |
| 2.1% | 34.5ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/internal/semver.js` |
| 0.8% | 13.5ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.6% | 11.1ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.3% | 5.5ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js` |
| 0.3% | 5.2ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js` |
| 0.1% | 2.6ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts` |
| 0.1% | 2.5ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/index.js` |
| 0.0% | 1.5ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js` |
| 0.0% | 1.4ms | `internal:util/inspect` |
| 0.0% | 1.4ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts` |
| 0.0% | 1.4ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js` |
| 0.0% | 1.4ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/lib/source-node.js` |
| 0.0% | 1.4ms | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts` |
| 0.0% | 1.3ms | `internal:streams/writable` |
| 0.0% | 1.2ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@anthropic-ai/sdk/resources/beta/beta.mjs` |
| 0.0% | 1.1ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/chalk/source/vendor/supports-color/index.js` |
