# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 4.80s | 2116 | 1.0ms | 458 |

**Top 10:** `update` 32.9%, `write` 11.6%, `byteLength` 6.4%, `stringify` 6.0%, `anonymous` 5.8%, `readSync` 5.4%, `gc` 5.3%, `(anonymous)` 4.0%, `parse` 4.0%, `toString` 2.8%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 32.9% | 1.58s | 32.9% | 1.58s | `update` | `[native code]` |
| 11.6% | 561.3ms | 11.6% | 561.3ms | `write` | `[native code]` |
| 6.4% | 308.8ms | 6.4% | 308.8ms | `byteLength` | `[native code]` |
| 6.0% | 292.5ms | 6.0% | 292.5ms | `stringify` | `[native code]` |
| 5.8% | 279.3ms | 11.8% | 569.6ms | `anonymous` | `[native code]` |
| 5.4% | 264.1ms | 5.4% | 264.1ms | `readSync` | `[native code]` |
| 5.3% | 259.0ms | 5.3% | 259.0ms | `gc` | `[native code]` |
| 4.0% | 195.0ms | 93.6% | 4.50s | `(anonymous)` | `[native code]` |
| 4.0% | 194.9ms | 4.0% | 194.9ms | `parse` | `[native code]` |
| 2.8% | 139.1ms | 2.8% | 139.1ms | `toString` | `[native code]` |
| 2.2% | 110.2ms | 2.2% | 110.2ms | `exec` | `[native code]` |
| 2.1% | 101.9ms | 2.1% | 101.9ms | `getBundledRootCertificates` | `[native code]` |
| 1.1% | 56.3ms | 1.1% | 56.3ms | `markedWrite` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/postmortem.ts` |
| 0.9% | 45.4ms | 0.9% | 45.4ms | `indexOf` | `[native code]` |
| 0.8% | 40.7ms | 0.8% | 40.7ms | `dlopen` | `[native code]` |
| 0.6% | 30.3ms | 0.6% | 30.3ms | `(anonymous)` | `node:zlib:438` |
| 0.4% | 19.7ms | 0.4% | 19.7ms | `copy` | `[native code]` |
| 0.2% | 13.5ms | 0.5% | 27.1ms | `openSync` | `[native code]` |
| 0.2% | 11.2ms | 0.2% | 11.2ms | `digest` | `[native code]` |
| 0.2% | 10.6ms | 0.2% | 10.6ms | `subarray` | `[native code]` |
| 0.1% | 9.1ms | 0.3% | 15.2ms | `statSync` | `[native code]` |
| 0.1% | 9.0ms | 0.1% | 9.0ms | `verifyOwnerOnlyPathSecurity` | `[native code]` |
| 0.1% | 7.3ms | 0.1% | 7.3ms | `Hash` | `[native code]` |
| 0.1% | 7.1ms | 0.1% | 7.1ms | `spawnSync` | `[native code]` |
| 0.1% | 6.8ms | 0.1% | 6.8ms | `applyOwnerOnlyPathSecurity` | `[native code]` |
| 0.1% | 6.3ms | 0.1% | 6.3ms | `RegExp` | `[native code]` |
| 0.1% | 5.9ms | 0.1% | 5.9ms | `register` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/postmortem.ts` |
| 0.1% | 5.4ms | 0.1% | 5.4ms | `Hash` | `node:crypto:179` |
| 0.1% | 5.3ms | 0.1% | 5.3ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:341` |
| 0.1% | 5.2ms | 0.1% | 5.2ms | `driveAsyncFunction` | `[native code]` |
| 0.1% | 5.1ms | 0.1% | 5.1ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:322` |
| 0.1% | 5.0ms | 0.1% | 5.0ms | `alloc` | `[native code]` |
| 0.1% | 5.0ms | 0.1% | 5.0ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7819` |
| 0.1% | 4.9ms | 0.1% | 4.9ms | `aliasable` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:1015` |
| 0.1% | 4.8ms | 0.2% | 10.4ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7770` |
| 0.0% | 4.6ms | 0.0% | 4.6ms | `get buffer` | `[native code]` |
| 0.0% | 4.2ms | 0.0% | 4.2ms | `hasStrictSessionSchema` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3401` |
| 0.0% | 4.2ms | 0.0% | 4.2ms | `bigint` | `[native code]` |
| 0.0% | 3.8ms | 0.0% | 3.8ms | `WriteStream` | `internal:fs/streams` |
| 0.0% | 3.6ms | 0.0% | 3.6ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js` |
| 0.0% | 3.6ms | 0.0% | 3.6ms | `async #initSessionFile` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 3.6ms | 0.0% | 3.6ms | `init` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:9` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `defineLazy` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:62` |
| 0.0% | 3.4ms | 0.0% | 3.4ms | `padStart` | `[native code]` |
| 0.0% | 3.3ms | 0.0% | 3.3ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js` |
| 0.0% | 2.9ms | 0.0% | 2.9ms | `createSupportsColor` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/chalk/source/vendor/supports-color/index.js` |
| 0.0% | 2.7ms | 13.6% | 654.6ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:365` |
| 0.0% | 2.6ms | 0.0% | 2.6ms | `recordFirstOpenPhase` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6494` |
| 0.0% | 2.6ms | 0.0% | 2.6ms | `bind` | `[native code]` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `#scanBoundedTranscriptForFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `memoryUsage` | `[native code]` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `Map` | `[native code]` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `compile` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/model-thinking.ts:861` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `ret` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js` |
| 0.0% | 2.2ms | 5.3% | 258.2ms | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1555` |
| 0.0% | 2.2ms | 0.1% | 9.5ms | `Hash` | `node:crypto:178` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `maybeExtractEmbeddedAddons` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `Buffer` | `[native code]` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `Hash` | `node:crypto:177` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `update` | `node:crypto` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:258` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `async runWithConcurrency` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4124` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7791` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `makeSetter` | `internal:streams/lazy_transform` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `updateBoundedTranscriptHash` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1394` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `isTrustedResidentCacheBlobDescriptor` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `escapeRegex` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `get` | `[native code]` |
| 0.0% | 1.9ms | 0.1% | 6.7ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:331` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `writeBytesSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1096` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/exception.js:60` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `async #tryInitSessionFileFromSidecar` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `typedArrayViewLength` | `[native code]` |
| 0.0% | 1.8ms | 0.0% | 3.8ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:14` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/peek-file.ts` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `writeTerminalBreadcrumb` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `has` | `[native code]` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `#buildIndexForEntries` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.8ms | 0.1% | 8.6ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7798` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `init` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:24` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `$ZodCheckMinLength` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:42` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8024` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `hasOwnProperty` | `[native code]` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `readDiff` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/internal/encode-shared.js:16` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `mkdtemp` | `[native code]` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7757` |
| 0.0% | 1.7ms | 13.5% | 651.9ms | `async write` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:303` |
| 0.0% | 1.6ms | 0.0% | 1.6ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/glob.ts:2` |
| 0.0% | 1.6ms | 0.1% | 6.3ms | `writeFirstOpenSidecarBytes` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6550` |
| 0.0% | 1.6ms | 16.1% | 777.6ms | `updateBoundedTranscriptHash` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1390` |
| 0.0% | 1.6ms | 0.0% | 1.6ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:10` |
| 0.0% | 1.6ms | 0.0% | 1.6ms | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.0% | 1.6ms | 0.0% | 1.6ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js` |
| 0.0% | 1.6ms | 16.2% | 781.3ms | `computeLineDigest` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:693` |
| 0.0% | 1.6ms | 0.0% | 1.6ms | `forEach` | `[native code]` |
| 0.0% | 1.6ms | 0.0% | 1.6ms | `get` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:64` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1550` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1486` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:279` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `template` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:65` |
| 0.0% | 1.5ms | 0.0% | 3.1ms | `fsyncSync` | `[native code]` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `Segmenter` | `[native code]` |
| 0.0% | 1.5ms | 0.0% | 4.5ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7792` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@anthropic-ai/sdk/lib/stainless-helper-header.mjs:8` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/agent-loop.ts:902` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `get` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:36` |
| 0.0% | 1.5ms | 0.0% | 3.0ms | `readdirSync` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `isView` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/NoopTracerProvider.js:6` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `Symbol` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:373` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `assertResidentCacheDirectoryPathMatchesDescriptor` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `internal:streams/destroy` | `internal:streams/destroy:16` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/api/diag.js:6` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `opendirSync` | `node:fs` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `#publishCommitMarkerFromCurrentTranscriptSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `renameNoReplacePath` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `hasStrictSessionSchema` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3416` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `#preparedResidentTransitionFromSource` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/partial-json/dist/index.js` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/provider-models/openai-compat.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:14` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `add` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:1787` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:92` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `async #retryPreparedNewSessionCleanups` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:9056` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `writer` | `[native code]` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 93.6% | 4.50s | 4.0% | 195.0ms | `(anonymous)` | `[native code]` |
| 83.1% | 4.00s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 51.8% | 2.49s | 0.0% | 0us | `async #initSessionFile` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8318` |
| 51.8% | 2.49s | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7555` |
| 50.2% | 2.41s | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7599` |
| 49.9% | 2.40s | 0.0% | 0us | `#scanBoundedTranscriptForFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7752` |
| 44.1% | 2.12s | 0.0% | 0us | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1559` |
| 42.7% | 2.05s | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1492` |
| 32.9% | 1.58s | 32.9% | 1.58s | `update` | `[native code]` |
| 16.4% | 792.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7795` |
| 16.2% | 781.3ms | 0.0% | 1.6ms | `computeLineDigest` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:693` |
| 16.2% | 779.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7758` |
| 16.1% | 777.6ms | 0.0% | 1.6ms | `updateBoundedTranscriptHash` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1390` |
| 13.6% | 654.6ms | 0.0% | 2.7ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:365` |
| 13.5% | 651.9ms | 0.0% | 1.7ms | `async write` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:303` |
| 11.8% | 569.6ms | 5.8% | 279.3ms | `anonymous` | `[native code]` |
| 11.6% | 561.3ms | 11.6% | 561.3ms | `write` | `[native code]` |
| 11.4% | 550.9ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:306` |
| 9.6% | 463.5ms | 0.0% | 0us | `bound require` | `[native code]` |
| 8.7% | 422.8ms | 0.0% | 0us | `require` | `[native code]` |
| 7.1% | 346.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7762` |
| 6.4% | 308.8ms | 6.4% | 308.8ms | `byteLength` | `[native code]` |
| 6.0% | 292.5ms | 6.0% | 292.5ms | `stringify` | `[native code]` |
| 5.9% | 285.7ms | 0.0% | 0us | `serialize` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:301` |
| 5.6% | 273.7ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:323` |
| 5.4% | 264.1ms | 5.4% | 264.1ms | `readSync` | `[native code]` |
| 5.3% | 259.0ms | 5.3% | 259.0ms | `gc` | `[native code]` |
| 5.3% | 258.2ms | 0.0% | 2.2ms | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1555` |
| 4.2% | 202.6ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:348` |
| 4.0% | 194.9ms | 4.0% | 194.9ms | `parse` | `[native code]` |
| 3.6% | 175.7ms | 0.0% | 0us | `stream` | `[native code]` |
| 2.8% | 139.1ms | 2.8% | 139.1ms | `toString` | `[native code]` |
| 2.2% | 110.2ms | 0.0% | 0us | `parseShellEnvFile` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/env-file.ts:56` |
| 2.2% | 110.2ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/env.ts:42` |
| 2.2% | 110.2ms | 2.2% | 110.2ms | `exec` | `[native code]` |
| 2.2% | 108.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:8` |
| 2.1% | 101.9ms | 2.1% | 101.9ms | `getBundledRootCertificates` | `[native code]` |
| 2.1% | 101.9ms | 0.0% | 0us | `cacheBundledRootCertificates` | `node:tls:569` |
| 2.0% | 100.8ms | 0.0% | 0us | `memorySample` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:231` |
| 2.0% | 97.5ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:305` |
| 1.8% | 86.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/partial-json/dist/index.js:18` |
| 1.6% | 79.9ms | 0.0% | 0us | `async settledMemorySample` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:244` |
| 1.6% | 78.2ms | 0.0% | 0us | `recordFirstOpenGcRequest` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6518` |
| 1.5% | 73.6ms | 0.0% | 0us | `from` | `[native code]` |
| 1.3% | 66.7ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7607` |
| 1.3% | 64.8ms | 0.0% | 0us | `async openNext` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:852` |
| 1.3% | 64.8ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:869` |
| 1.3% | 64.8ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:858` |
| 1.3% | 64.8ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17338` |
| 1.3% | 63.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7889` |
| 1.2% | 59.7ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:1352` |
| 1.1% | 56.3ms | 1.1% | 56.3ms | `markedWrite` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/postmortem.ts` |
| 1.0% | 52.5ms | 0.0% | 0us | `init` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:22` |
| 1.0% | 50.1ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17352` |
| 1.0% | 50.1ms | 0.0% | 0us | `canonicalizeTrustedPath` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/managed-session-scope.ts:406` |
| 1.0% | 49.4ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8112` |
| 0.9% | 45.4ms | 0.9% | 45.4ms | `indexOf` | `[native code]` |
| 0.9% | 45.4ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1478` |
| 0.9% | 43.3ms | 0.0% | 0us | `map` | `[native code]` |
| 0.8% | 42.8ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/index.js:16` |
| 0.8% | 41.0ms | 0.0% | 0us | `render` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:493` |
| 0.8% | 40.7ms | 0.8% | 40.7ms | `dlopen` | `[native code]` |
| 0.8% | 40.7ms | 0.0% | 0us | `loadFromCandidates` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:215` |
| 0.8% | 40.7ms | 0.0% | 0us | `loadNative` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:544` |
| 0.8% | 40.1ms | 0.0% | 0us | `node:crypto` | `node:crypto:2` |
| 0.7% | 38.1ms | 0.0% | 0us | `internal:streams/transform` | `internal:streams/transform:2` |
| 0.7% | 38.1ms | 0.0% | 0us | `internal:streams/lazy_transform` | `internal:streams/lazy_transform:2` |
| 0.6% | 32.8ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/utils.ts:185` |
| 0.6% | 30.3ms | 0.0% | 0us | `node:zlib` | `node:zlib:438` |
| 0.6% | 30.3ms | 0.6% | 30.3ms | `(anonymous)` | `node:zlib:438` |
| 0.6% | 30.3ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:808` |
| 0.5% | 27.1ms | 0.2% | 13.5ms | `openSync` | `[native code]` |
| 0.5% | 26.6ms | 0.0% | 0us | `getHandlebars` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:237` |
| 0.5% | 26.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/lib/index.js:8` |
| 0.5% | 26.6ms | 0.0% | 0us | `compile` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:485` |
| 0.4% | 19.7ms | 0.4% | 19.7ms | `copy` | `[native code]` |
| 0.3% | 17.1ms | 0.0% | 0us | `createHash` | `node:crypto:201` |
| 0.3% | 17.0ms | 0.0% | 0us | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1576` |
| 0.3% | 16.5ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7632` |
| 0.3% | 15.2ms | 0.1% | 9.1ms | `statSync` | `[native code]` |
| 0.2% | 13.0ms | 0.0% | 0us | `openBufferedWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1758` |
| 0.2% | 13.0ms | 0.0% | 0us | `openFirstOpenSidecarWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6540` |
| 0.2% | 11.3ms | 0.0% | 0us | `#prepareResidentTextStoreTransition` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6931` |
| 0.2% | 11.3ms | 0.0% | 0us | `#newResidentTextStoreCandidate` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6853` |
| 0.2% | 11.2ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1502` |
| 0.2% | 11.2ms | 0.2% | 11.2ms | `digest` | `[native code]` |
| 0.2% | 11.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:8` |
| 0.2% | 10.8ms | 0.0% | 0us | `#scanBoundedTranscriptForFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7751` |
| 0.2% | 10.6ms | 0.2% | 10.6ms | `subarray` | `[native code]` |
| 0.2% | 10.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:22` |
| 0.2% | 10.4ms | 0.1% | 4.8ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7770` |
| 0.2% | 10.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7814` |
| 0.2% | 10.0ms | 0.0% | 0us | `internal:validators` | `internal:validators:2` |
| 0.2% | 10.0ms | 0.0% | 0us | `node:fs/promises` | `node:fs/promises:2` |
| 0.2% | 10.0ms | 0.0% | 0us | `node:events` | `node:events:9` |
| 0.2% | 9.9ms | 0.0% | 0us | `decodeBoundedJsonLine` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1361` |
| 0.2% | 9.9ms | 0.0% | 0us | `openVerifiedResidentCacheInstanceDir` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:621` |
| 0.2% | 9.9ms | 0.0% | 0us | `FileSessionStorageWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1015` |
| 0.1% | 9.5ms | 0.0% | 2.2ms | `Hash` | `node:crypto:178` |
| 0.1% | 9.1ms | 0.0% | 0us | `statSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1611` |
| 0.1% | 9.0ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17378` |
| 0.1% | 9.0ms | 0.0% | 0us | `secureOwnerOnlyFileDescriptor` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:669` |
| 0.1% | 9.0ms | 0.1% | 9.0ms | `verifyOwnerOnlyPathSecurity` | `[native code]` |
| 0.1% | 8.8ms | 0.0% | 0us | `ret` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:517` |
| 0.1% | 8.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:16` |
| 0.1% | 8.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js:15` |
| 0.1% | 8.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7808` |
| 0.1% | 8.6ms | 0.0% | 1.8ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7798` |
| 0.1% | 8.6ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7614` |
| 0.1% | 8.5ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8107` |
| 0.1% | 8.4ms | 0.0% | 0us | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1488` |
| 0.1% | 8.1ms | 0.0% | 0us | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1568` |
| 0.1% | 8.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7816` |
| 0.1% | 7.8ms | 0.0% | 0us | `getSessionMemoryStats` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:14186` |
| 0.1% | 7.4ms | 0.0% | 0us | `ZodString` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.1% | 7.3ms | 0.1% | 7.3ms | `Hash` | `[native code]` |
| 0.1% | 7.2ms | 0.0% | 0us | `#withSessionPersistenceFenceSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10013` |
| 0.1% | 7.2ms | 0.0% | 0us | `createSessionCommitMarkerCheckedSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:775` |
| 0.1% | 7.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10411` |
| 0.1% | 7.1ms | 0.0% | 0us | `residentCacheProcessStartTimeMs` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:207` |
| 0.1% | 7.1ms | 0.1% | 7.1ms | `spawnSync` | `[native code]` |
| 0.1% | 7.1ms | 0.0% | 0us | `writeResidentCacheOwnerToken` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:314` |
| 0.1% | 7.1ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:339` |
| 0.1% | 6.8ms | 0.0% | 0us | `secureOwnerOnlyFileDescriptor` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:662` |
| 0.1% | 6.8ms | 0.1% | 6.8ms | `applyOwnerOnlyPathSecurity` | `[native code]` |
| 0.1% | 6.7ms | 0.0% | 1.9ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:331` |
| 0.1% | 6.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:28` |
| 0.1% | 6.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:8` |
| 0.1% | 6.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7817` |
| 0.1% | 6.3ms | 0.0% | 1.6ms | `writeFirstOpenSidecarBytes` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6550` |
| 0.1% | 6.3ms | 0.1% | 6.3ms | `RegExp` | `[native code]` |
| 0.1% | 6.3ms | 0.0% | 0us | `getRegex` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:13` |
| 0.1% | 6.2ms | 0.0% | 0us | `ZodObject` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.1% | 5.9ms | 0.1% | 5.9ms | `register` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/postmortem.ts` |
| 0.1% | 5.9ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:1050` |
| 0.1% | 5.9ms | 0.0% | 0us | `createFileCommitMarkerCheckedSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:833` |
| 0.1% | 5.8ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.runtime.js:12` |
| 0.1% | 5.5ms | 0.0% | 0us | `assign` | `[native code]` |
| 0.1% | 5.5ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.1% | 5.5ms | 0.0% | 0us | `node:assert/strict` | `node:assert/strict:3` |
| 0.1% | 5.4ms | 0.1% | 5.4ms | `Hash` | `node:crypto:179` |
| 0.1% | 5.4ms | 0.0% | 0us | `_string` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:7` |
| 0.1% | 5.4ms | 0.0% | 0us | `async #initSessionFile` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8305` |
| 0.1% | 5.3ms | 0.1% | 5.3ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:341` |
| 0.1% | 5.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:18` |
| 0.1% | 5.2ms | 0.1% | 5.2ms | `driveAsyncFunction` | `[native code]` |
| 0.1% | 5.1ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` |
| 0.1% | 5.1ms | 0.1% | 5.1ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:322` |
| 0.1% | 5.1ms | 0.0% | 0us | `#prepareResidentTextStoreTransition` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6932` |
| 0.1% | 5.0ms | 0.1% | 5.0ms | `alloc` | `[native code]` |
| 0.1% | 5.0ms | 0.0% | 0us | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1565` |
| 0.1% | 5.0ms | 0.1% | 5.0ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7819` |
| 0.1% | 4.9ms | 0.0% | 0us | `setupHelper` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:1032` |
| 0.1% | 4.9ms | 0.0% | 0us | `compile` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:115` |
| 0.1% | 4.9ms | 0.0% | 0us | `compileInput` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:510` |
| 0.1% | 4.9ms | 0.0% | 0us | `invokeKnownHelper` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:691` |
| 0.1% | 4.9ms | 0.1% | 4.9ms | `aliasable` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:1015` |
| 0.1% | 4.9ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:770` |
| 0.0% | 4.7ms | 0.0% | 0us | `bound clone` | `[native code]` |
| 0.0% | 4.7ms | 0.0% | 0us | `clone` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:262` |
| 0.0% | 4.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:9` |
| 0.0% | 4.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/NonRecordingSpan.js:8` |
| 0.0% | 4.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/context-utils.js:9` |
| 0.0% | 4.6ms | 0.0% | 0us | `inspectTranscriptHeaderBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3618` |
| 0.0% | 4.6ms | 0.0% | 0us | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17357` |
| 0.0% | 4.6ms | 0.0% | 4.6ms | `get buffer` | `[native code]` |
| 0.0% | 4.5ms | 0.0% | 0us | `readResidentCacheOwnerSnapshot` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:284` |
| 0.0% | 4.5ms | 0.0% | 0us | `openVerifiedResidentCacheDirectory` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:178` |
| 0.0% | 4.5ms | 0.0% | 0us | `async sweepResidentCacheRoot` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:564` |
| 0.0% | 4.5ms | 0.0% | 1.5ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7792` |
| 0.0% | 4.4ms | 0.0% | 0us | `node:util` | `node:util:2` |
| 0.0% | 4.3ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:879` |
| 0.0% | 4.3ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:13` |
| 0.0% | 4.2ms | 0.0% | 4.2ms | `hasStrictSessionSchema` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3401` |
| 0.0% | 4.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7797` |
| 0.0% | 4.2ms | 0.0% | 4.2ms | `bigint` | `[native code]` |
| 0.0% | 4.2ms | 0.0% | 0us | `async measurePhase` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:582` |
| 0.0% | 4.2ms | 0.0% | 0us | `async measurePhase` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:579` |
| 0.0% | 3.9ms | 0.0% | 0us | `externalizeResidentValueSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4749` |
| 0.0% | 3.8ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 0.0% | 3.8ms | 0.0% | 1.8ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:14` |
| 0.0% | 3.8ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 0.0% | 3.8ms | 0.0% | 0us | `internal:util/colors` | `internal:util/colors:24` |
| 0.0% | 3.8ms | 0.0% | 0us | `internal:assert/assertion_error` | `internal:assert/assertion_error:2` |
| 0.0% | 3.8ms | 0.0% | 0us | `refresh` | `internal:util/colors:18` |
| 0.0% | 3.8ms | 0.0% | 3.8ms | `WriteStream` | `internal:fs/streams` |
| 0.0% | 3.8ms | 0.0% | 0us | `get` | `node:assert:70` |
| 0.0% | 3.7ms | 0.0% | 0us | `bound min` | `[native code]` |
| 0.0% | 3.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:6` |
| 0.0% | 3.7ms | 0.0% | 0us | `internal:stream` | `internal:stream:2` |
| 0.0% | 3.7ms | 0.0% | 0us | `internal:streams/operators` | `internal:streams/operators:2` |
| 0.0% | 3.7ms | 0.0% | 0us | `node:stream` | `node:stream:2` |
| 0.0% | 3.7ms | 0.0% | 0us | `internal:streams/compose` | `internal:streams/compose:2` |
| 0.0% | 3.7ms | 0.0% | 0us | `internal:fs/streams` | `internal:fs/streams:2` |
| 0.0% | 3.7ms | 0.0% | 0us | `get ReadStream` | `node:fs:578` |
| 0.0% | 3.6ms | 0.0% | 3.6ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js` |
| 0.0% | 3.6ms | 0.0% | 0us | `preprocess` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1390` |
| 0.0% | 3.6ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/utils/discovery/antigravity.ts:63` |
| 0.0% | 3.6ms | 0.0% | 0us | `ZodPreprocess` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.0% | 3.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1223` |
| 0.0% | 3.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1261` |
| 0.0% | 3.6ms | 0.0% | 3.6ms | `async #initSessionFile` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 3.6ms | 0.0% | 3.6ms | `init` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:9` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `defineLazy` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:62` |
| 0.0% | 3.5ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:812` |
| 0.0% | 3.5ms | 0.0% | 0us | `union` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:818` |
| 0.0% | 3.5ms | 0.0% | 0us | `ZodUnion` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.0% | 3.4ms | 0.0% | 0us | `object` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:791` |
| 0.0% | 3.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:737` |
| 0.0% | 3.4ms | 0.0% | 3.4ms | `padStart` | `[native code]` |
| 0.0% | 3.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:14` |
| 0.0% | 3.3ms | 0.0% | 0us | `ZodNull` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.0% | 3.3ms | 0.0% | 3.3ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js` |
| 0.0% | 3.3ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/openai-responses-server-schema.ts:244` |
| 0.0% | 3.3ms | 0.0% | 0us | `_null` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:438` |
| 0.0% | 3.2ms | 0.0% | 0us | `ret` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:191` |
| 0.0% | 3.1ms | 0.0% | 1.5ms | `fsyncSync` | `[native code]` |
| 0.0% | 3.1ms | 0.0% | 0us | `bound check` | `[native code]` |
| 0.0% | 3.1ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:885` |
| 0.0% | 3.1ms | 0.0% | 0us | `#resolveEntry` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12564` |
| 0.0% | 3.1ms | 0.0% | 0us | `readRangeSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1560` |
| 0.0% | 3.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:887` |
| 0.0% | 3.1ms | 0.0% | 0us | `getEntry` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16040` |
| 0.0% | 3.0ms | 0.0% | 0us | `FileSessionStorageWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1013` |
| 0.0% | 3.0ms | 0.0% | 1.5ms | `readdirSync` | `[native code]` |
| 0.0% | 2.9ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/chalk/source/vendor/supports-color/index.js:186` |
| 0.0% | 2.9ms | 0.0% | 2.9ms | `createSupportsColor` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/chalk/source/vendor/supports-color/index.js` |
| 0.0% | 2.8ms | 0.0% | 0us | `internal:streams/readable` | `internal:streams/readable:2` |
| 0.0% | 2.8ms | 0.0% | 0us | `bound strict` | `[native code]` |
| 0.0% | 2.8ms | 0.0% | 0us | `writeBytesSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1098` |
| 0.0% | 2.8ms | 0.0% | 0us | `#asBuffer` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1054` |
| 0.0% | 2.8ms | 0.0% | 0us | `#appendBytes` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1083` |
| 0.0% | 2.7ms | 0.0% | 0us | `writeResidentCacheOwnerToken` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:326` |
| 0.0% | 2.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:738` |
| 0.0% | 2.6ms | 0.0% | 2.6ms | `recordFirstOpenPhase` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6494` |
| 0.0% | 2.6ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8278` |
| 0.0% | 2.6ms | 0.0% | 2.6ms | `bind` | `[native code]` |
| 0.0% | 2.6ms | 0.0% | 0us | `internal:util/inspect` | `internal:util/inspect:9` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `#scanBoundedTranscriptForFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 2.4ms | 0.0% | 0us | `recordFirstOpenGcRequest` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6511` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `memoryUsage` | `[native code]` |
| 0.0% | 2.4ms | 0.0% | 0us | `residentProcessBytes` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6485` |
| 0.0% | 2.3ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/codex-tools.ts:8` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `Map` | `[native code]` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `compile` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js` |
| 0.0% | 2.2ms | 0.0% | 0us | `compileInput` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:509` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/model-thinking.ts:861` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `ret` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js` |
| 0.0% | 2.2ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8135` |
| 0.0% | 2.1ms | 0.0% | 0us | `loadNative` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:536` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `maybeExtractEmbeddedAddons` | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `Buffer` | `[native code]` |
| 0.0% | 2.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/lib/source-map-generator.js:10` |
| 0.0% | 2.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/baggage/utils.js:9` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `Hash` | `node:crypto:177` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `update` | `node:crypto` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:258` |
| 0.0% | 2.1ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:45` |
| 0.0% | 2.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:59` |
| 0.0% | 2.1ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/propagation-api.js:10` |
| 0.0% | 2.0ms | 0.0% | 0us | `async resolveBlobRefsInEntries` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4137` |
| 0.0% | 2.0ms | 0.0% | 0us | `async resolveBlobRefsInEntries` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4127` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `async runWithConcurrency` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4124` |
| 0.0% | 2.0ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7631` |
| 0.0% | 2.0ms | 0.0% | 0us | `async runWithConcurrency` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4114` |
| 0.0% | 2.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/base.js:15` |
| 0.0% | 2.0ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/helpers.js:22` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7791` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 2.0ms | 0.0% | 0us | `internal:streams/lazy_transform` | `internal:streams/lazy_transform:27` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `makeSetter` | `internal:streams/lazy_transform` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `updateBoundedTranscriptHash` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1394` |
| 0.0% | 1.9ms | 0.0% | 0us | `putResidentCacheBlobSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:817` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `isTrustedResidentCacheBlobDescriptor` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts` |
| 0.0% | 1.9ms | 0.0% | 0us | `externalizeResidentValueSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4718` |
| 0.0% | 1.9ms | 0.0% | 0us | `isTrustedResidentCacheBlobFile` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:707` |
| 0.0% | 1.9ms | 0.0% | 0us | `#preparedResidentTransitionFromSource` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6890` |
| 0.0% | 1.9ms | 0.0% | 0us | `putSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:1133` |
| 0.0% | 1.9ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:1662` |
| 0.0% | 1.9ms | 0.0% | 0us | `_enum` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1007` |
| 0.0% | 1.9ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:966` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `escapeRegex` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js` |
| 0.0% | 1.9ms | 0.0% | 0us | `ZodEnum` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.0% | 1.9ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/usage.ts:77` |
| 0.0% | 1.9ms | 0.0% | 0us | `_installLazyMethods` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:22` |
| 0.0% | 1.9ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:21` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `get` | `[native code]` |
| 0.0% | 1.9ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:209` |
| 0.0% | 1.9ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:259` |
| 0.0% | 1.9ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:7` |
| 0.0% | 1.9ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/decorators.js:9` |
| 0.0% | 1.9ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/base.js:17` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `writeBytesSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1096` |
| 0.0% | 1.8ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/base.js:11` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/exception.js:60` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `async #tryInitSessionFileFromSidecar` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.8ms | 0.0% | 0us | `async #tryInitSessionFileFromSidecar` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7323` |
| 0.0% | 1.8ms | 0.0% | 0us | `async #initSessionFile` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8313` |
| 0.0% | 1.8ms | 0.0% | 0us | `at` | `[native code]` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `typedArrayViewLength` | `[native code]` |
| 0.0% | 1.8ms | 0.0% | 0us | `decodeBoundedJsonLine` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1360` |
| 0.0% | 1.8ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/peek-file.ts:19` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/peek-file.ts` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `writeTerminalBreadcrumb` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.8ms | 0.0% | 0us | `async #initSessionFile` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8323` |
| 0.0% | 1.8ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/gjc-runtime/state-schema.ts:34` |
| 0.0% | 1.8ms | 0.0% | 0us | `ZodNumber` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.0% | 1.8ms | 0.0% | 0us | `_number` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:307` |
| 0.0% | 1.8ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:507` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `has` | `[native code]` |
| 0.0% | 1.8ms | 0.0% | 0us | `add` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:1785` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `#buildIndexForEntries` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.8ms | 0.0% | 0us | `#preparedResidentTransitionFromSource` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6902` |
| 0.0% | 1.8ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/usage.ts:80` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `init` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:24` |
| 0.0% | 1.8ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/whitespace-control.js:8` |
| 0.0% | 1.8ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:18` |
| 0.0% | 1.8ms | 0.0% | 0us | `_minLength` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:595` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `$ZodCheckMinLength` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:42` |
| 0.0% | 1.8ms | 0.0% | 0us | `min` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:223` |
| 0.0% | 1.8ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/utils/discovery/openai-compatible.ts:38` |
| 0.0% | 1.8ms | 0.0% | 0us | `#buildBoundedFirstOpenSidecars` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8017` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8024` |
| 0.0% | 1.8ms | 0.0% | 0us | `#findColdEntryIndex` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12301` |
| 0.0% | 1.8ms | 0.0% | 0us | `#coldIndexDigestValid` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12247` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `hasOwnProperty` | `[native code]` |
| 0.0% | 1.8ms | 0.0% | 0us | `extend` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/utils.js:31` |
| 0.0% | 1.8ms | 0.0% | 0us | `create` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.runtime.js:43` |
| 0.0% | 1.8ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.runtime.js:57` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `readDiff` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/internal/encode-shared.js:16` |
| 0.0% | 1.8ms | 0.0% | 0us | `parseEncodeTrie` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/internal/encode-shared.js:41` |
| 0.0% | 1.8ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/generated/encode-html.js:10` |
| 0.0% | 1.8ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:894` |
| 0.0% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:1021` |
| 0.0% | 1.7ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/anthropic-messages-server-schema.ts:29` |
| 0.0% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:1022` |
| 0.0% | 1.7ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/openai-chat-server-schema.ts:109` |
| 0.0% | 1.7ms | 0.0% | 0us | `LRUCache` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/lru-cache/dist/esm/node/index.js:316` |
| 0.0% | 1.7ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/tui/src/components/markdown.ts:49` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `mkdtemp` | `[native code]` |
| 0.0% | 1.7ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:794` |
| 0.0% | 1.7ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:803` |
| 0.0% | 1.7ms | 0.0% | 0us | `async mkdtemp` | `node:fs/promises:148` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` |
| 0.0% | 1.7ms | 0.0% | 0us | `get` | `node:assert:575` |
| 0.0% | 1.7ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/anthropic-messages-server-schema.ts:149` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7757` |
| 0.0% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:11` |
| 0.0% | 1.6ms | 0.0% | 1.6ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/glob.ts:2` |
| 0.0% | 1.6ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/anthropic-messages-server-schema.ts:41` |
| 0.0% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:868` |
| 0.0% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:801` |
| 0.0% | 1.6ms | 0.0% | 1.6ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:10` |
| 0.0% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:15` |
| 0.0% | 1.6ms | 0.0% | 1.6ms | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.0% | 1.6ms | 0.0% | 1.6ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js` |
| 0.0% | 1.6ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:883` |
| 0.0% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/lib/source-map-generator.js:8` |
| 0.0% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:58` |
| 0.0% | 1.6ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:768` |
| 0.0% | 1.6ms | 0.0% | 0us | `addHelpers` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:366` |
| 0.0% | 1.6ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:85` |
| 0.0% | 1.6ms | 0.0% | 1.6ms | `forEach` | `[native code]` |
| 0.0% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:218` |
| 0.0% | 1.6ms | 0.0% | 1.6ms | `get` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:64` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `consume` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1486` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1550` |
| 0.0% | 1.5ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/usage.ts:108` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:279` |
| 0.0% | 1.5ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:772` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `template` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:65` |
| 0.0% | 1.5ms | 0.0% | 0us | `#scanBoundedTranscriptForFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7929` |
| 0.0% | 1.5ms | 0.0% | 0us | `fsyncFirstOpenSidecarWriter` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6563` |
| 0.0% | 1.5ms | 0.0% | 0us | `fsyncSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1130` |
| 0.0% | 1.5ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/tui/src/utils.ts:173` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `Segmenter` | `[native code]` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@anthropic-ai/sdk/lib/stainless-helper-header.mjs:8` |
| 0.0% | 1.5ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:217` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/agent-loop.ts:902` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `get` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:36` |
| 0.0% | 1.5ms | 0.0% | 0us | `removeResidentCacheTreeNoFollow` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:381` |
| 0.0% | 1.5ms | 0.0% | 0us | `async close` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:14010` |
| 0.0% | 1.5ms | 0.0% | 0us | `dispose` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:1234` |
| 0.0% | 1.5ms | 0.0% | 0us | `#disposeResidentTextStore` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7046` |
| 0.0% | 1.5ms | 0.0% | 0us | `disposeVerifiedResidentCacheInstanceDir` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:422` |
| 0.0% | 1.5ms | 0.0% | 0us | `#releaseResidentTextStore` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7137` |
| 0.0% | 1.4ms | 0.0% | 0us | `jsonLikeValueExceedsCacheLimit` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4920` |
| 0.0% | 1.4ms | 0.0% | 0us | `visit` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4901` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `isView` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 0us | `#getSessionContextForRead` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16336` |
| 0.0% | 1.4ms | 0.0% | 0us | `buildSessionContext` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16283` |
| 0.0% | 1.4ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:908` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:31` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/NoopTracerProvider.js:6` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/ProxyTracerProvider.js:9` |
| 0.0% | 1.4ms | 0.0% | 0us | `internal:streams/destroy` | `internal:streams/destroy:2` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `Symbol` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 0us | `internal:shared` | `internal:shared:117` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:373` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:8` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:41` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/internal/tracestate-impl.js:8` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/internal/utils.js:8` |
| 0.0% | 1.4ms | 0.0% | 0us | `openVerifiedResidentCacheInstanceDir` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:614` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `assertResidentCacheDirectoryPathMatchesDescriptor` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `internal:streams/destroy` | `internal:streams/destroy:16` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/baggage/utils.js:8` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/api/diag.js:6` |
| 0.0% | 1.3ms | 0.0% | 0us | `async sweepResidentCacheRoot` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:554` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `opendirSync` | `node:fs` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `#publishCommitMarkerFromCurrentTranscriptSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.3ms | 0.0% | 0us | `async #tryBoundedFirstOpen` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7645` |
| 0.0% | 1.3ms | 0.0% | 0us | `#managedDescriptorSnapshotOrNull` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:13461` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.runtime.js:31` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `renameNoReplacePath` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 0us | `createFileCommitMarkerCheckedSync` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:845` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.0% | 1.3ms | 0.0% | 0us | `filter` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 0us | `aggregateStats` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:449` |
| 0.0% | 1.3ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:1037` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `hasStrictSessionSchema` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3416` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `#preparedResidentTransitionFromSource` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.3ms | 0.0% | 0us | `#findColdEntryIndex` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12316` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/partial-json/dist/index.js` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/partial-json/dist/index.js:20` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/partial-json/dist/index.js:14` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:734` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/provider-models/openai-compat.ts` |
| 0.0% | 1.2ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/provider-models/openai-compat.ts:2238` |
| 0.0% | 1.2ms | 0.0% | 0us | `createOpenCodeApiResolution` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/provider-models/openai-compat.ts:2184` |
| 0.0% | 1.2ms | 0.0% | 0us | `strict` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:757` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:14` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:624` |
| 0.0% | 1.2ms | 0.0% | 0us | `ZodNever` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:676` |
| 0.0% | 1.2ms | 0.0% | 0us | `_never` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:457` |
| 0.0% | 1.2ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:141` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `add` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:1787` |
| 0.0% | 1.1ms | 0.0% | 0us | `(module)` | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:25` |
| 0.0% | 1.1ms | 0.0% | 0us | `bound refine` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:92` |
| 0.0% | 1.1ms | 0.0% | 0us | `scanTranscriptLinesBounded` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1552` |
| 0.0% | 1.1ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:911` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `async #retryPreparedNewSessionCleanups` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:9056` |
| 0.0% | 1.1ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:912` |
| 0.0% | 1.1ms | 0.0% | 0us | `async close` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:13995` |
| 0.0% | 1.1ms | 0.0% | 0us | `async (anonymous)` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:911` |
| 0.0% | 1.1ms | 0.0% | 0us | `async close` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:13991` |
| 0.0% | 1.1ms | 0.0% | 0us | `async #retryPreparedNewSessionCleanups` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:9054` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `async open` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.0% | 1.0ms | 0.0% | 0us | `async runWorker` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:835` |
| 0.0% | 1.0ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:299` |
| 0.0% | 1.0ms | 0.0% | 0us | `async generateTranscript` | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:290` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `writer` | `[native code]` |

## Function Details

### `update`
`[native code]` | Self: 32.9% (1.58s) | Total: 32.9% (1.58s) | Samples: 801

**Called by:**
- `computeLineDigest` (394)
- `updateBoundedTranscriptHash` (389)
- `#buildBoundedFirstOpenSidecars` (18)

### `write`
`[native code]` | Self: 11.6% (561.3ms) | Total: 11.6% (561.3ms) | Samples: 292

**Called by:**
- `async (anonymous)` (290)
- `(anonymous)` (2)

### `byteLength`
`[native code]` | Self: 6.4% (308.8ms) | Total: 6.4% (308.8ms) | Samples: 161

**Called by:**
- `async generateTranscript` (101)
- `async (anonymous)` (57)
- `(anonymous)` (3)

### `stringify`
`[native code]` | Self: 6.0% (292.5ms) | Total: 6.0% (292.5ms) | Samples: 146

**Called by:**
- `serialize` (142)
- `(anonymous)` (4)

### `anonymous`
`[native code]` | Self: 5.8% (279.3ms) | Total: 11.8% (569.6ms) | Samples: 27

**Called by:**
- `require` (96)
- `node:crypto` (5)
- `internal:streams/transform` (4)
- `internal:streams/lazy_transform` (4)
- `internal:streams/duplex` (3)
- `node:util` (2)
- `node:fs/promises` (2)
- `internal:validators` (2)
- `node:assert/strict` (2)
- `internal:streams/readable` (2)
- `node:events` (2)
- `loadAssertionError` (1)
- `internal:streams/destroy` (1)
- `node:stream` (1)
- `get ReadStream` (1)
- `internal:assert/assertion_error` (1)
- `internal:stream` (1)
- `internal:streams/compose` (1)
- `internal:fs/streams` (1)
- `get` (1)
- `internal:streams/operators` (1)

**Calls:**
- `(anonymous)` (15)
- `(anonymous)` (6)
- `(anonymous)` (6)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `internal:streams/lazy_transform` (4)
- `internal:streams/transform` (4)
- `(anonymous)` (3)
- `internal:streams/duplex` (3)
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `internal:validators` (2)
- `(anonymous)` (2)
- `internal:streams/readable` (2)
- `node:events` (2)
- `node:assert` (2)
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
- `internal:assert/assertion_error` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `node:stream` (1)
- `(anonymous)` (1)
- `internal:stream` (1)
- `internal:streams/compose` (1)
- `(anonymous)` (1)
- `internal:streams/destroy` (1)
- `internal:streams/lazy_transform` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:util/inspect` (1)
- `internal:util/colors` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:streams/operators` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:shared` (1)
- `internal:streams/destroy` (1)
- `(anonymous)` (1)
- `internal:fs/streams` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `readSync`
`[native code]` | Self: 5.4% (264.1ms) | Total: 5.4% (264.1ms) | Samples: 135

**Called by:**
- `scanTranscriptLinesBounded` (132)
- `readRangeSync` (3)

### `gc`
`[native code]` | Self: 5.3% (259.0ms) | Total: 5.3% (259.0ms) | Samples: 148

**Called by:**
- `memorySample` (59)
- `async settledMemorySample` (47)
- `recordFirstOpenGcRequest` (42)

### `(anonymous)`
`[native code]` | Self: 4.0% (195.0ms) | Total: 93.6% (4.50s) | Samples: 10

**Called by:**
- `processTicksAndRejections` (2030)
- `require` (26)
- `(anonymous)` (26)
- `bound require` (21)
- `decodeBoundedJsonLine` (3)
- `stream` (1)
- `refresh` (1)
- `#asBuffer` (1)

**Calls:**
- `async #initSessionFile` (1263)
- `async generateTranscript` (350)
- `async generateTranscript` (138)
- `async generateTranscript` (101)
- `async settledMemorySample` (47)
- `memorySample` (44)
- `async runWorker` (31)
- `(anonymous)` (26)
- `(module)` (22)
- `dlopen` (21)
- `async runWorker` (15)
- `async #tryBoundedFirstOpen` (11)
- `async generateTranscript` (3)
- `async generateTranscript` (3)
- `async runWorker` (2)
- `async generateTranscript` (2)
- `async generateTranscript` (2)
- `async runWorker` (2)
- `async sweepResidentCacheRoot` (2)
- `async runWorker` (1)
- `async runWorker` (1)
- `async runWorker` (1)
- `async runWorker` (1)
- `async #initSessionFile` (1)
- `async runWorker` (1)
- `async sweepResidentCacheRoot` (1)
- `async close` (1)
- `stream` (1)
- `async runWorker` (1)
- `async generateTranscript` (1)
- `async #tryBoundedFirstOpen` (1)
- `Buffer` (1)
- `(module)` (1)
- `WriteStream` (1)

### `parse`
`[native code]` | Self: 4.0% (194.9ms) | Total: 4.0% (194.9ms) | Samples: 97

**Called by:**
- `(anonymous)` (97)

### `toString`
`[native code]` | Self: 2.8% (139.1ms) | Total: 2.8% (139.1ms) | Samples: 71

**Called by:**
- `(anonymous)` (71)

### `exec`
`[native code]` | Self: 2.2% (110.2ms) | Total: 2.2% (110.2ms) | Samples: 1

**Called by:**
- `parseShellEnvFile` (1)

### `getBundledRootCertificates`
`[native code]` | Self: 2.1% (101.9ms) | Total: 2.1% (101.9ms) | Samples: 2

**Called by:**
- `cacheBundledRootCertificates` (2)

### `markedWrite`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/postmortem.ts` | Self: 1.1% (56.3ms) | Total: 1.1% (56.3ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `indexOf`
`[native code]` | Self: 0.9% (45.4ms) | Total: 0.9% (45.4ms) | Samples: 22

**Called by:**
- `consume` (22)

### `dlopen`
`[native code]` | Self: 0.8% (40.7ms) | Total: 0.8% (40.7ms) | Samples: 21

**Called by:**
- `(anonymous)` (21)

### `(anonymous)`
`node:zlib:438` | Self: 0.6% (30.3ms) | Total: 0.6% (30.3ms) | Samples: 1

**Called by:**
- `map` (1)

### `copy`
`[native code]` | Self: 0.4% (19.7ms) | Total: 0.4% (19.7ms) | Samples: 11

**Called by:**
- `consume` (7)
- `consume` (4)

### `openSync`
`[native code]` | Self: 0.2% (13.5ms) | Total: 0.5% (27.1ms) | Samples: 7

**Called by:**
- `openSync` (7)
- `readRangeSync` (2)
- `writeResidentCacheOwnerToken` (2)
- `openVerifiedResidentCacheDirectory` (2)
- `FileSessionStorageWriter` (1)

**Calls:**
- `openSync` (7)

### `digest`
`[native code]` | Self: 0.2% (11.2ms) | Total: 0.2% (11.2ms) | Samples: 5

**Called by:**
- `(anonymous)` (5)

### `subarray`
`[native code]` | Self: 0.2% (10.6ms) | Total: 0.2% (10.6ms) | Samples: 6

**Called by:**
- `(anonymous)` (4)
- `updateBoundedTranscriptHash` (1)
- `scanTranscriptLinesBounded` (1)

### `statSync`
`[native code]` | Self: 0.1% (9.1ms) | Total: 0.3% (15.2ms) | Samples: 5

**Called by:**
- `statSync` (5)
- `statSync` (3)

**Calls:**
- `statSync` (3)

### `verifyOwnerOnlyPathSecurity`
`[native code]` | Self: 0.1% (9.0ms) | Total: 0.1% (9.0ms) | Samples: 5

**Called by:**
- `secureOwnerOnlyFileDescriptor` (5)

### `Hash`
`[native code]` | Self: 0.1% (7.3ms) | Total: 0.1% (7.3ms) | Samples: 4

**Called by:**
- `Hash` (4)

### `spawnSync`
`[native code]` | Self: 0.1% (7.1ms) | Total: 0.1% (7.1ms) | Samples: 5

**Called by:**
- `residentCacheProcessStartTimeMs` (5)

### `applyOwnerOnlyPathSecurity`
`[native code]` | Self: 0.1% (6.8ms) | Total: 0.1% (6.8ms) | Samples: 4

**Called by:**
- `secureOwnerOnlyFileDescriptor` (4)

### `RegExp`
`[native code]` | Self: 0.1% (6.3ms) | Total: 0.1% (6.3ms) | Samples: 2

**Called by:**
- `getRegex` (2)

### `register`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/postmortem.ts` | Self: 0.1% (5.9ms) | Total: 0.1% (5.9ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `Hash`
`node:crypto:179` | Self: 0.1% (5.4ms) | Total: 0.1% (5.4ms) | Samples: 2

**Called by:**
- `createHash` (2)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:341` | Self: 0.1% (5.3ms) | Total: 0.1% (5.3ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `driveAsyncFunction`
`[native code]` | Self: 0.1% (5.2ms) | Total: 0.1% (5.2ms) | Samples: 2

**Called by:**
- `async write` (1)
- `async #initSessionFile` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:322` | Self: 0.1% (5.1ms) | Total: 0.1% (5.1ms) | Samples: 3

**Called by:**
- `(anonymous)` (3)

### `alloc`
`[native code]` | Self: 0.1% (5.0ms) | Total: 0.1% (5.0ms) | Samples: 3

**Called by:**
- `readRangeSync` (3)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7819` | Self: 0.1% (5.0ms) | Total: 0.1% (5.0ms) | Samples: 4

**Called by:**
- `consume` (4)

### `aliasable`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:1015` | Self: 0.1% (4.9ms) | Total: 0.1% (4.9ms) | Samples: 1

**Called by:**
- `setupHelper` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7770` | Self: 0.1% (4.8ms) | Total: 0.2% (10.4ms) | Samples: 2

**Called by:**
- `consume` (5)

**Calls:**
- `hasStrictSessionSchema` (2)
- `hasStrictSessionSchema` (1)

### `get buffer`
`[native code]` | Self: 0.0% (4.6ms) | Total: 0.0% (4.6ms) | Samples: 2

**Called by:**
- `decodeBoundedJsonLine` (2)

### `hasStrictSessionSchema`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3401` | Self: 0.0% (4.2ms) | Total: 0.0% (4.2ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `bigint`
`[native code]` | Self: 0.0% (4.2ms) | Total: 0.0% (4.2ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `WriteStream`
`internal:fs/streams` | Self: 0.0% (3.8ms) | Total: 0.0% (3.8ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js` | Self: 0.0% (3.6ms) | Total: 0.0% (3.6ms) | Samples: 1

**Called by:**
- `init` (1)

### `async #initSessionFile`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (3.6ms) | Total: 0.0% (3.6ms) | Samples: 1

**Called by:**
- `async open` (1)

### `init`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:9` | Self: 0.0% (3.6ms) | Total: 0.0% (3.6ms) | Samples: 2

**Called by:**
- `ZodString` (1)
- `(anonymous)` (1)

### `defineLazy`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:62` | Self: 0.0% (3.5ms) | Total: 0.0% (3.5ms) | Samples: 2

**Called by:**
- `(anonymous)` (1)
- `(anonymous)` (1)

### `padStart`
`[native code]` | Self: 0.0% (3.4ms) | Total: 0.0% (3.4ms) | Samples: 2

**Called by:**
- `from` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js` | Self: 0.0% (3.3ms) | Total: 0.0% (3.3ms) | Samples: 1

**Called by:**
- `init` (1)

### `createSupportsColor`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/chalk/source/vendor/supports-color/index.js` | Self: 0.0% (2.9ms) | Total: 0.0% (2.9ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:365` | Self: 0.0% (2.7ms) | Total: 13.6% (654.6ms) | Samples: 1

**Called by:**
- `(anonymous)` (350)

**Calls:**
- `async write` (349)

### `recordFirstOpenPhase`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6494` | Self: 0.0% (2.6ms) | Total: 0.0% (2.6ms) | Samples: 1

**Called by:**
- `#buildBoundedFirstOpenSidecars` (1)

### `bind`
`[native code]` | Self: 0.0% (2.6ms) | Total: 0.0% (2.6ms) | Samples: 1

**Called by:**
- `internal:util/inspect` (1)

### `#scanBoundedTranscriptForFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (2.5ms) | Total: 0.0% (2.5ms) | Samples: 1

**Called by:**
- `async #tryBoundedFirstOpen` (1)

### `memoryUsage`
`[native code]` | Self: 0.0% (2.4ms) | Total: 0.0% (2.4ms) | Samples: 1

**Called by:**
- `residentProcessBytes` (1)

### `Map`
`[native code]` | Self: 0.0% (2.3ms) | Total: 0.0% (2.3ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `compile`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js` | Self: 0.0% (2.2ms) | Total: 0.0% (2.2ms) | Samples: 1

**Called by:**
- `compileInput` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/model-thinking.ts:861` | Self: 0.0% (2.2ms) | Total: 0.0% (2.2ms) | Samples: 1

### `ret`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js` | Self: 0.0% (2.2ms) | Total: 0.0% (2.2ms) | Samples: 1

**Called by:**
- `render` (1)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1555` | Self: 0.0% (2.2ms) | Total: 5.3% (258.2ms) | Samples: 1

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (133)

**Calls:**
- `readSync` (132)

### `Hash`
`node:crypto:178` | Self: 0.0% (2.2ms) | Total: 0.1% (9.5ms) | Samples: 1

**Called by:**
- `createHash` (5)

**Calls:**
- `Hash` (4)

### `maybeExtractEmbeddedAddons`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js` | Self: 0.0% (2.1ms) | Total: 0.0% (2.1ms) | Samples: 1

**Called by:**
- `loadNative` (1)

### `Buffer`
`[native code]` | Self: 0.0% (2.1ms) | Total: 0.0% (2.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `Hash`
`node:crypto:177` | Self: 0.0% (2.1ms) | Total: 0.0% (2.1ms) | Samples: 1

**Called by:**
- `createHash` (1)

### `update`
`node:crypto` | Self: 0.0% (2.1ms) | Total: 0.0% (2.1ms) | Samples: 1

**Called by:**
- `updateBoundedTranscriptHash` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:258` | Self: 0.0% (2.1ms) | Total: 0.0% (2.1ms) | Samples: 1

**Called by:**
- `init` (1)

### `async runWithConcurrency`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4124` | Self: 0.0% (2.0ms) | Total: 0.0% (2.0ms) | Samples: 1

**Called by:**
- `async runWithConcurrency` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (2.0ms) | Total: 0.0% (2.0ms) | Samples: 1

**Called by:**
- `async #tryBoundedFirstOpen` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7791` | Self: 0.0% (2.0ms) | Total: 0.0% (2.0ms) | Samples: 1

**Called by:**
- `consume` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (2.0ms) | Total: 0.0% (2.0ms) | Samples: 1

**Called by:**
- `scanTranscriptLinesBounded` (1)

### `makeSetter`
`internal:streams/lazy_transform` | Self: 0.0% (2.0ms) | Total: 0.0% (2.0ms) | Samples: 1

**Called by:**
- `internal:streams/lazy_transform` (1)

### `updateBoundedTranscriptHash`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1394` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `isTrustedResidentCacheBlobDescriptor`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 1

**Called by:**
- `isTrustedResidentCacheBlobFile` (1)

### `escapeRegex`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 1

**Called by:**
- `map` (1)

### `get`
`[native code]` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 1

**Called by:**
- `_installLazyMethods` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:331` | Self: 0.0% (1.9ms) | Total: 0.1% (6.7ms) | Samples: 1

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `serialize` (2)

### `writeBytesSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1096` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 1

**Called by:**
- `writeFirstOpenSidecarBytes` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/exception.js:60` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 1

**Called by:**
- `anonymous` (1)

### `async #tryInitSessionFileFromSidecar`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 1

**Called by:**
- `async #tryInitSessionFileFromSidecar` (1)

### `typedArrayViewLength`
`[native code]` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 1

**Called by:**
- `at` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:14` | Self: 0.0% (1.8ms) | Total: 0.0% (3.8ms) | Samples: 1

**Calls:**
- `getRegex` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/peek-file.ts` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 1

**Called by:**
- `from` (1)

### `writeTerminalBreadcrumb`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 1

**Called by:**
- `async #initSessionFile` (1)

### `has`
`[native code]` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 1

**Called by:**
- `add` (1)

### `#buildIndexForEntries`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 1

**Called by:**
- `#preparedResidentTransitionFromSource` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7798` | Self: 0.0% (1.8ms) | Total: 0.1% (8.6ms) | Samples: 1

**Called by:**
- `consume` (5)

**Calls:**
- `stringify` (4)

### `init`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:24` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `$ZodCheckMinLength`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:42` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 1

**Called by:**
- `_minLength` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8024` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 1

**Called by:**
- `consume` (1)

### `hasOwnProperty`
`[native code]` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 1

**Called by:**
- `extend` (1)

### `readDiff`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/internal/encode-shared.js:16` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 1

**Called by:**
- `parseEncodeTrie` (1)

### `arrayFromFastWithoutMapFn`
`[native code]` | Self: 0.0% (1.7ms) | Total: 0.0% (1.7ms) | Samples: 1

**Called by:**
- `from` (1)

### `mkdtemp`
`[native code]` | Self: 0.0% (1.7ms) | Total: 0.0% (1.7ms) | Samples: 1

**Called by:**
- `async mkdtemp` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` | Self: 0.0% (1.7ms) | Total: 0.0% (1.7ms) | Samples: 1

**Called by:**
- `from` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7757` | Self: 0.0% (1.7ms) | Total: 0.0% (1.7ms) | Samples: 1

**Called by:**
- `consume` (1)

### `async write`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:303` | Self: 0.0% (1.7ms) | Total: 13.5% (651.9ms) | Samples: 1

**Called by:**
- `async generateTranscript` (349)

**Calls:**
- `async (anonymous)` (290)
- `async (anonymous)` (57)
- `driveAsyncFunction` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/glob.ts:2` | Self: 0.0% (1.6ms) | Total: 0.0% (1.6ms) | Samples: 1

### `writeFirstOpenSidecarBytes`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6550` | Self: 0.0% (1.6ms) | Total: 0.1% (6.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `writeBytesSync` (1)
- `writeBytesSync` (1)

### `updateBoundedTranscriptHash`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1390` | Self: 0.0% (1.6ms) | Total: 16.1% (777.6ms) | Samples: 1

**Called by:**
- `(anonymous)` (392)

**Calls:**
- `update` (389)
- `subarray` (1)
- `update` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:10` | Self: 0.0% (1.6ms) | Total: 0.0% (1.6ms) | Samples: 1

**Called by:**
- `init` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` | Self: 0.0% (1.6ms) | Total: 0.0% (1.6ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js` | Self: 0.0% (1.6ms) | Total: 0.0% (1.6ms) | Samples: 1

**Called by:**
- `ret` (1)

### `computeLineDigest`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:693` | Self: 0.0% (1.6ms) | Total: 16.2% (781.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (403)

**Calls:**
- `update` (394)
- `createHash` (8)

### `forEach`
`[native code]` | Self: 0.0% (1.6ms) | Total: 0.0% (1.6ms) | Samples: 1

**Called by:**
- `addHelpers` (1)

### `get`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:64` | Self: 0.0% (1.6ms) | Total: 0.0% (1.6ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1550` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1486` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `scanTranscriptLinesBounded` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:279` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `init` (1)

### `template`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:65` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `ret` (1)

### `fsyncSync`
`[native code]` | Self: 0.0% (1.5ms) | Total: 0.0% (3.1ms) | Samples: 1

**Called by:**
- `fsyncSync` (1)
- `fsyncSync` (1)

**Calls:**
- `fsyncSync` (1)

### `Segmenter`
`[native code]` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7792` | Self: 0.0% (1.5ms) | Total: 0.0% (4.5ms) | Samples: 1

**Called by:**
- `consume` (3)

**Calls:**
- `add` (1)
- `add` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@anthropic-ai/sdk/lib/stainless-helper-header.mjs:8` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/agent-loop.ts:902` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

### `get`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:36` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `readdirSync`
`[native code]` | Self: 0.0% (1.5ms) | Total: 0.0% (3.0ms) | Samples: 1

**Called by:**
- `removeResidentCacheTreeNoFollow` (1)
- `readdirSync` (1)

**Calls:**
- `readdirSync` (1)

### `isView`
`[native code]` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `visit` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/NoopTracerProvider.js:6` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `anonymous` (1)

### `Symbol`
`[native code]` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `internal:shared` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:373` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `assertResidentCacheDirectoryPathMatchesDescriptor`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `openVerifiedResidentCacheInstanceDir` (1)

### `internal:streams/destroy`
`internal:streams/destroy:16` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `anonymous` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/api/diag.js:6` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `anonymous` (1)

### `opendirSync`
`node:fs` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `async sweepResidentCacheRoot` (1)

### `#publishCommitMarkerFromCurrentTranscriptSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `async #tryBoundedFirstOpen` (1)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (1)

### `renameNoReplacePath`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `createFileCommitMarkerCheckedSync` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `filter` (1)

### `hasStrictSessionSchema`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3416` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `#preparedResidentTransitionFromSource`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `#prepareResidentTextStoreTransition` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/partial-json/dist/index.js` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/provider-models/openai-compat.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `map` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:14` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `init` (1)

### `add`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:1787` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:92` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `init` (1)

### `async #retryPreparedNewSessionCleanups`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:9056` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `async #retryPreparedNewSessionCleanups` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `async open` (1)

### `writer`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `async generateTranscript` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:11` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:58` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `get` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:13` | Self: 0.0% (0us) | Total: 0.0% (4.3ms) | Samples: 0

**Calls:**
- `getRegex` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1223` | Self: 0.0% (0us) | Total: 0.0% (3.6ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `FileSessionStorageWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1013` | Self: 0.0% (0us) | Total: 0.0% (3.0ms) | Samples: 0

**Called by:**
- `openBufferedWriter` (1)

**Calls:**
- `openSync` (1)

### `ret`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:517` | Self: 0.0% (0us) | Total: 0.1% (8.8ms) | Samples: 0

**Called by:**
- `render` (3)

**Calls:**
- `template` (1)
- `compileInput` (1)
- `compileInput` (1)

### `internal:shared`
`internal:shared:117` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `Symbol` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/chalk/source/vendor/supports-color/index.js:186` | Self: 0.0% (0us) | Total: 0.0% (2.9ms) | Samples: 0

**Calls:**
- `createSupportsColor` (1)

### `internal:fs/streams`
`internal:fs/streams:2` | Self: 0.0% (0us) | Total: 0.0% (3.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1488` | Self: 0.0% (0us) | Total: 0.1% (8.4ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (4)

**Calls:**
- `copy` (4)

### `internal:streams/transform`
`internal:streams/transform:2` | Self: 0.0% (0us) | Total: 0.7% (38.1ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `anonymous` (4)

### `at`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `decodeBoundedJsonLine` (1)

**Calls:**
- `typedArrayViewLength` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:801` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `#findColdEntryIndex`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12316` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `#resolveEntry` (1)

**Calls:**
- `readRangeSync` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7631` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `async resolveBlobRefsInEntries` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:209` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `_installLazyMethods` (1)

### `strict`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:757` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `bound strict` (1)

**Calls:**
- `_never` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:911` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `async measurePhase` (1)

### `bound refine`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `bound check` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:18` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `compile`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:485` | Self: 0.0% (0us) | Total: 0.5% (26.6ms) | Samples: 0

**Called by:**
- `render` (15)

**Calls:**
- `getHandlebars` (15)

### `writeBytesSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1098` | Self: 0.0% (0us) | Total: 0.0% (2.8ms) | Samples: 0

**Called by:**
- `writeFirstOpenSidecarBytes` (1)

**Calls:**
- `#appendBytes` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/partial-json/dist/index.js:18` | Self: 0.0% (0us) | Total: 1.8% (86.7ms) | Samples: 0

**Calls:**
- `bound require` (1)

### `ret`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:191` | Self: 0.0% (0us) | Total: 0.0% (3.2ms) | Samples: 0

**Called by:**
- `render` (2)

**Calls:**
- `(anonymous)` (1)
- `(anonymous)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7816` | Self: 0.0% (0us) | Total: 0.1% (8.0ms) | Samples: 0

**Called by:**
- `consume` (4)

**Calls:**
- `subarray` (4)

### `openVerifiedResidentCacheInstanceDir`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:614` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `#newResidentTextStoreCandidate` (1)

**Calls:**
- `assertResidentCacheDirectoryPathMatchesDescriptor` (1)

### `writeResidentCacheOwnerToken`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:314` | Self: 0.0% (0us) | Total: 0.1% (7.1ms) | Samples: 0

**Called by:**
- `openVerifiedResidentCacheInstanceDir` (5)

**Calls:**
- `residentCacheProcessStartTimeMs` (5)

### `stream`
`[native code]` | Self: 0.0% (0us) | Total: 3.6% (175.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/internal/tracestate-impl.js:8` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/generated/encode-html.js:10` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Calls:**
- `parseEncodeTrie` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7817` | Self: 0.0% (0us) | Total: 0.1% (6.3ms) | Samples: 0

**Called by:**
- `consume` (3)

**Calls:**
- `writeFirstOpenSidecarBytes` (3)

### `fsyncSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1130` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `fsyncFirstOpenSidecarWriter` (1)

**Calls:**
- `fsyncSync` (1)

### `async #tryInitSessionFileFromSidecar`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7323` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `async #initSessionFile` (1)

**Calls:**
- `async #tryInitSessionFileFromSidecar` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:770` | Self: 0.0% (0us) | Total: 0.1% (4.9ms) | Samples: 0

**Calls:**
- `render` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/partial-json/dist/index.js:14` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `createFileCommitMarkerCheckedSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:845` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `createSessionCommitMarkerCheckedSync` (1)

**Calls:**
- `renameNoReplacePath` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/context-utils.js:9` | Self: 0.0% (0us) | Total: 0.0% (4.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7762` | Self: 0.0% (0us) | Total: 7.1% (346.0ms) | Samples: 0

**Called by:**
- `consume` (174)

**Calls:**
- `parse` (97)
- `toString` (71)
- `decodeBoundedJsonLine` (5)
- `decodeBoundedJsonLine` (1)

### `node:fs/promises`
`node:fs/promises:2` | Self: 0.0% (0us) | Total: 0.2% (10.0ms) | Samples: 0

**Calls:**
- `anonymous` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7758` | Self: 0.0% (0us) | Total: 16.2% (779.6ms) | Samples: 0

**Called by:**
- `consume` (393)

**Calls:**
- `updateBoundedTranscriptHash` (392)
- `updateBoundedTranscriptHash` (1)

### `add`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts:1785` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `has` (1)

### `internal:streams/lazy_transform`
`internal:streams/lazy_transform:27` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `makeSetter` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7599` | Self: 0.0% (0us) | Total: 50.2% (2.41s) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1229)

**Calls:**
- `#scanBoundedTranscriptForFirstOpen` (1222)
- `#scanBoundedTranscriptForFirstOpen` (5)
- `#scanBoundedTranscriptForFirstOpen` (1)
- `#scanBoundedTranscriptForFirstOpen` (1)

### `internal:streams/readable`
`internal:streams/readable:2` | Self: 0.0% (0us) | Total: 0.0% (2.8ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `removeResidentCacheTreeNoFollow`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:381` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `disposeVerifiedResidentCacheInstanceDir` (1)

**Calls:**
- `readdirSync` (1)

### `decodeBoundedJsonLine`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1360` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `at` (1)

### `residentCacheProcessStartTimeMs`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:207` | Self: 0.0% (0us) | Total: 0.1% (7.1ms) | Samples: 0

**Called by:**
- `writeResidentCacheOwnerToken` (5)

**Calls:**
- `spawnSync` (5)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 83.1% (4.00s) | Samples: 0

**Calls:**
- `(anonymous)` (2030)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1552` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (1)

**Calls:**
- `subarray` (1)

### `preprocess`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1390` | Self: 0.0% (0us) | Total: 0.0% (3.6ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `ZodPreprocess` (1)

### `internal:util/inspect`
`internal:util/inspect:9` | Self: 0.0% (0us) | Total: 0.0% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bind` (1)

### `_installLazyMethods`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:22` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `get` (1)

### `#coldIndexDigestValid`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12247` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `#findColdEntryIndex` (1)

**Calls:**
- `readRangeSync` (1)

### `async settledMemorySample`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:244` | Self: 0.0% (0us) | Total: 1.6% (79.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (47)

**Calls:**
- `gc` (47)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:858` | Self: 0.0% (0us) | Total: 1.3% (64.8ms) | Samples: 0

**Called by:**
- `async openNext` (31)

**Calls:**
- `async open` (31)

### `writeResidentCacheOwnerToken`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:326` | Self: 0.0% (0us) | Total: 0.0% (2.7ms) | Samples: 0

**Called by:**
- `openVerifiedResidentCacheInstanceDir` (2)

**Calls:**
- `openSync` (2)

### `assign`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (5.5ms) | Samples: 0

**Called by:**
- `node:assert` (2)

**Calls:**
- `get` (1)
- `get` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/helpers.js:22` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `addHelpers`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:366` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `forEach` (1)

### `compileInput`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:510` | Self: 0.0% (0us) | Total: 0.1% (4.9ms) | Samples: 0

**Called by:**
- `ret` (1)

**Calls:**
- `compile` (1)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1576` | Self: 0.0% (0us) | Total: 0.3% (17.0ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (9)

**Calls:**
- `recordFirstOpenGcRequest` (8)
- `recordFirstOpenGcRequest` (1)

### `map`
`[native code]` | Self: 0.0% (0us) | Total: 0.9% (43.3ms) | Samples: 0

**Called by:**
- `async runWorker` (2)
- `#preparedResidentTransitionFromSource` (1)
- `async runWorker` (1)
- `async runWorker` (1)
- `createOpenCodeApiResolution` (1)
- `(anonymous)` (1)
- `node:zlib` (1)

**Calls:**
- `getSessionMemoryStats` (4)
- `externalizeResidentValueSync` (1)
- `escapeRegex` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `_number`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:307` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `ZodNumber` (1)

### `memorySample`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:231` | Self: 0.0% (0us) | Total: 2.0% (100.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (44)
- `async runWorker` (15)

**Calls:**
- `gc` (59)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:803` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `async runWorker` (1)

**Calls:**
- `async mkdtemp` (1)

### `#prepareResidentTextStoreTransition`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6931` | Self: 0.0% (0us) | Total: 0.2% (11.3ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (8)

**Calls:**
- `#newResidentTextStoreCandidate` (8)

### `async runWithConcurrency`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4114` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `async resolveBlobRefsInEntries` (1)

**Calls:**
- `async runWithConcurrency` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:1662` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `map` (1)

### `#prepareResidentTextStoreTransition`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6932` | Self: 0.0% (0us) | Total: 0.1% (5.1ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (3)

**Calls:**
- `#preparedResidentTransitionFromSource` (1)
- `#preparedResidentTransitionFromSource` (1)
- `#preparedResidentTransitionFromSource` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/NonRecordingSpan.js:8` | Self: 0.0% (0us) | Total: 0.0% (4.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:41` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Calls:**
- `bound require` (1)

### `createSessionCommitMarkerCheckedSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:775` | Self: 0.0% (0us) | Total: 0.1% (7.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `createFileCommitMarkerCheckedSync` (4)
- `createFileCommitMarkerCheckedSync` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7555` | Self: 0.0% (0us) | Total: 51.8% (2.49s) | Samples: 0

**Called by:**
- `async #initSessionFile` (1263)

**Calls:**
- `async #tryBoundedFirstOpen` (1229)
- `async #tryBoundedFirstOpen` (27)
- `async #tryBoundedFirstOpen` (6)
- `async #tryBoundedFirstOpen` (1)

### `render`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:493` | Self: 0.0% (0us) | Total: 0.8% (41.0ms) | Samples: 0

**Called by:**
- `(module)` (18)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `compile` (15)
- `ret` (3)
- `ret` (2)
- `ret` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/utils/discovery/antigravity.ts:63` | Self: 0.0% (0us) | Total: 0.0% (3.6ms) | Samples: 0

**Calls:**
- `preprocess` (1)

### `#preparedResidentTransitionFromSource`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6890` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `#prepareResidentTextStoreTransition` (1)

**Calls:**
- `map` (1)

### `#withSessionPersistenceFenceSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10013` | Self: 0.0% (0us) | Total: 0.1% (7.2ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (5)

**Calls:**
- `(anonymous)` (5)

### `node:assert/strict`
`node:assert/strict:3` | Self: 0.0% (0us) | Total: 0.1% (5.5ms) | Samples: 0

**Calls:**
- `anonymous` (2)

### `dispose`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:1234` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `#disposeResidentTextStore` (1)

**Calls:**
- `disposeVerifiedResidentCacheInstanceDir` (1)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.1% (5.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `assign` (2)

### `putResidentCacheBlobSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:817` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `putSync` (1)

**Calls:**
- `isTrustedResidentCacheBlobFile` (1)

### `residentProcessBytes`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6485` | Self: 0.0% (0us) | Total: 0.0% (2.4ms) | Samples: 0

**Called by:**
- `recordFirstOpenGcRequest` (1)

**Calls:**
- `memoryUsage` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/baggage/utils.js:9` | Self: 0.0% (0us) | Total: 0.0% (2.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8135` | Self: 0.0% (0us) | Total: 0.0% (2.2ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `openFirstOpenSidecarWriter` (1)

### `node:events`
`node:events:9` | Self: 0.0% (0us) | Total: 0.2% (10.0ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `init`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:22` | Self: 0.0% (0us) | Total: 1.0% (52.5ms) | Samples: 0

**Called by:**
- `ZodObject` (4)
- `ZodString` (3)
- `ZodUnion` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `ZodNever` (1)
- `(anonymous)` (1)
- `ZodEnum` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `ZodNumber` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `ZodNull` (1)
- `ZodPreprocess` (1)
- `(anonymous)` (1)

**Calls:**
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
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:22` | Self: 0.0% (0us) | Total: 0.2% (10.4ms) | Samples: 0

**Called by:**
- `anonymous` (6)

**Calls:**
- `bound require` (6)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/internal/utils.js:8` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `disposeVerifiedResidentCacheInstanceDir`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:422` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `dispose` (1)

**Calls:**
- `removeResidentCacheTreeNoFollow` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts:2` | Self: 0.0% (0us) | Total: 0.1% (5.1ms) | Samples: 0

**Calls:**
- `from` (3)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/peek-file.ts:19` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Calls:**
- `from` (1)

### `#scanBoundedTranscriptForFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7929` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `fsyncFirstOpenSidecarWriter` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/base.js:15` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8107` | Self: 0.0% (0us) | Total: 0.1% (8.5ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (5)

**Calls:**
- `readRangeSync` (3)
- `readRangeSync` (2)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8017` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `scanTranscriptLinesBounded` (1)

### `parseEncodeTrie`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/internal/encode-shared.js:41` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `readDiff` (1)

### `putSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:1133` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `externalizeResidentValueSync` (1)

**Calls:**
- `putResidentCacheBlobSync` (1)

### `internal:streams/destroy`
`internal:streams/destroy:2` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/env.ts:42` | Self: 0.0% (0us) | Total: 2.2% (110.2ms) | Samples: 0

**Calls:**
- `parseShellEnvFile` (1)

### `ZodNever`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `_never` (1)

**Calls:**
- `init` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:1352` | Self: 0.0% (0us) | Total: 1.2% (59.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `async runWorker` (1)
- `async runWorker` (1)
- `markedWrite` (1)

### `parseShellEnvFile`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/env-file.ts:56` | Self: 0.0% (0us) | Total: 2.2% (110.2ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `exec` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:8` | Self: 0.0% (0us) | Total: 0.2% (11.0ms) | Samples: 0

**Called by:**
- `anonymous` (6)

**Calls:**
- `bound require` (6)

### `ZodNumber`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `_number` (1)

**Calls:**
- `init` (1)

### `#resolveEntry`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12564` | Self: 0.0% (0us) | Total: 0.0% (3.1ms) | Samples: 0

**Called by:**
- `getEntry` (2)

**Calls:**
- `#findColdEntryIndex` (1)
- `#findColdEntryIndex` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:21` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Calls:**
- `bound min` (1)

### `ZodObject`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.1% (6.2ms) | Samples: 0

**Called by:**
- `object` (2)
- `clone` (2)

**Calls:**
- `init` (4)

### `getRegex`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js:13` | Self: 0.0% (0us) | Total: 0.1% (6.3ms) | Samples: 0

**Called by:**
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `RegExp` (2)

### `async resolveBlobRefsInEntries`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4127` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `async resolveBlobRefsInEntries` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/codex-tools.ts:8` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Calls:**
- `Map` (1)

### `async close`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:14010` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `#releaseResidentTextStore` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/lib/source-map-generator.js:8` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17378` | Self: 0.0% (0us) | Total: 0.1% (9.0ms) | Samples: 0

**Called by:**
- `async open` (3)

**Calls:**
- `async #initSessionFile` (2)
- `async #initSessionFile` (1)

### `aggregateStats`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:449` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `async runWorker` (1)

**Calls:**
- `filter` (1)

### `openVerifiedResidentCacheDirectory`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:178` | Self: 0.0% (0us) | Total: 0.0% (4.5ms) | Samples: 0

**Called by:**
- `readResidentCacheOwnerSnapshot` (2)

**Calls:**
- `openSync` (2)

### `secureOwnerOnlyFileDescriptor`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:662` | Self: 0.0% (0us) | Total: 0.1% (6.8ms) | Samples: 0

**Called by:**
- `createFileCommitMarkerCheckedSync` (3)
- `FileSessionStorageWriter` (1)

**Calls:**
- `applyOwnerOnlyPathSecurity` (4)

### `async resolveBlobRefsInEntries`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4137` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `async resolveBlobRefsInEntries` (1)

**Calls:**
- `async runWithConcurrency` (1)

### `secureOwnerOnlyFileDescriptor`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:669` | Self: 0.0% (0us) | Total: 0.1% (9.0ms) | Samples: 0

**Called by:**
- `FileSessionStorageWriter` (4)
- `createFileCommitMarkerCheckedSync` (1)

**Calls:**
- `verifyOwnerOnlyPathSecurity` (5)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17338` | Self: 0.0% (0us) | Total: 1.3% (64.8ms) | Samples: 0

**Called by:**
- `async (anonymous)` (31)

**Calls:**
- `async open` (26)
- `async open` (3)
- `async open` (1)
- `async open` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7797` | Self: 0.0% (0us) | Total: 0.0% (4.2ms) | Samples: 0

**Called by:**
- `consume` (2)

**Calls:**
- `bigint` (2)

### `async close`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:13995` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async close` (1)

**Calls:**
- `async #retryPreparedNewSessionCleanups` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7614` | Self: 0.0% (0us) | Total: 0.1% (8.6ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (6)

**Calls:**
- `#withSessionPersistenceFenceSync` (5)
- `#publishCommitMarkerFromCurrentTranscriptSync` (1)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 0.0% (3.8ms) | Samples: 0

**Called by:**
- `get` (1)

**Calls:**
- `anonymous` (1)

### `setupHelper`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:1032` | Self: 0.0% (0us) | Total: 0.1% (4.9ms) | Samples: 0

**Called by:**
- `invokeKnownHelper` (1)

**Calls:**
- `aliasable` (1)

### `decodeBoundedJsonLine`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1361` | Self: 0.0% (0us) | Total: 0.2% (9.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `(anonymous)` (3)
- `get buffer` (2)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 0.0% (3.8ms) | Samples: 0

**Called by:**
- `assign` (1)

**Calls:**
- `loadAssertionError` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.runtime.js:57` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `create` (1)

### `#appendBytes`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1083` | Self: 0.0% (0us) | Total: 0.0% (2.8ms) | Samples: 0

**Called by:**
- `writeBytesSync` (1)

**Calls:**
- `#asBuffer` (1)

### `async sweepResidentCacheRoot`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:564` | Self: 0.0% (0us) | Total: 0.0% (4.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `readResidentCacheOwnerSnapshot` (2)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17357` | Self: 0.0% (0us) | Total: 0.0% (4.6ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `inspectTranscriptHeaderBounded` (1)

### `#scanBoundedTranscriptForFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7751` | Self: 0.0% (0us) | Total: 0.2% (10.8ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (5)

**Calls:**
- `openFirstOpenSidecarWriter` (5)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:10411` | Self: 0.0% (0us) | Total: 0.1% (7.2ms) | Samples: 0

**Called by:**
- `#withSessionPersistenceFenceSync` (5)

**Calls:**
- `createSessionCommitMarkerCheckedSync` (5)

### `_minLength`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:595` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `min` (1)

**Calls:**
- `$ZodCheckMinLength` (1)

### `createOpenCodeApiResolution`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/provider-models/openai-compat.ts:2184` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `map` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:59` | Self: 0.0% (0us) | Total: 0.0% (2.1ms) | Samples: 0

**Calls:**
- `bound require` (1)

### `bound check`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (3.1ms) | Samples: 0

**Called by:**
- `bound min` (1)
- `bound refine` (1)

**Calls:**
- `bound clone` (2)

### `internal:assert/assertion_error`
`internal:assert/assertion_error:2` | Self: 0.0% (0us) | Total: 0.0% (3.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `FileSessionStorageWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1015` | Self: 0.0% (0us) | Total: 0.2% (9.9ms) | Samples: 0

**Called by:**
- `openBufferedWriter` (5)

**Calls:**
- `secureOwnerOnlyFileDescriptor` (4)
- `secureOwnerOnlyFileDescriptor` (1)

### `getEntry`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16040` | Self: 0.0% (0us) | Total: 0.0% (3.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `#resolveEntry` (2)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/tui/src/utils.ts:173` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Calls:**
- `Segmenter` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7889` | Self: 0.0% (0us) | Total: 1.3% (63.7ms) | Samples: 0

**Called by:**
- `consume` (34)

**Calls:**
- `recordFirstOpenGcRequest` (34)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:290` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `async runWorker` (1)

**Calls:**
- `async generateTranscript` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:772` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Calls:**
- `render` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:259` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:16` | Self: 0.0% (0us) | Total: 0.1% (8.7ms) | Samples: 0

**Called by:**
- `anonymous` (5)

**Calls:**
- `bound require` (5)

### `internal:streams/operators`
`internal:streams/operators:2` | Self: 0.0% (0us) | Total: 0.0% (3.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8278` | Self: 0.0% (0us) | Total: 0.0% (2.6ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `recordFirstOpenPhase` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/lib/index.js:8` | Self: 0.0% (0us) | Total: 0.5% (26.6ms) | Samples: 0

**Called by:**
- `anonymous` (15)

**Calls:**
- `bound require` (15)

### `async close`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:13991` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)

**Calls:**
- `async close` (1)

### `_never`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:457` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `strict` (1)

**Calls:**
- `ZodNever` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:794` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `async runWorker` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/tui/src/components/markdown.ts:49` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Calls:**
- `LRUCache` (1)

### `compileInput`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:509` | Self: 0.0% (0us) | Total: 0.0% (2.2ms) | Samples: 0

**Called by:**
- `ret` (1)

**Calls:**
- `compile` (1)

### `object`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:791` | Self: 0.0% (0us) | Total: 0.0% (3.4ms) | Samples: 0

**Called by:**
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `ZodObject` (2)

### `#buildBoundedFirstOpenSidecars`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8112` | Self: 0.0% (0us) | Total: 1.0% (49.4ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (18)

**Calls:**
- `update` (18)

### `clone`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js:262` | Self: 0.0% (0us) | Total: 0.0% (4.7ms) | Samples: 0

**Called by:**
- `bound clone` (3)

**Calls:**
- `ZodObject` (2)
- `ZodString` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:835` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `async generateTranscript` (1)

### `inspectTranscriptHeaderBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:3618` | Self: 0.0% (0us) | Total: 0.0% (4.6ms) | Samples: 0

**Called by:**
- `async open` (1)

**Calls:**
- `readRangeSync` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/usage.ts:80` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Calls:**
- `object` (1)

### `get`
`node:assert:575` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `assign` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/decorators.js:9` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/anthropic-messages-server-schema.ts:29` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Calls:**
- `union` (1)

### `async #initSessionFile`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8305` | Self: 0.0% (0us) | Total: 0.1% (5.4ms) | Samples: 0

**Called by:**
- `async open` (2)

**Calls:**
- `driveAsyncFunction` (1)
- `async #initSessionFile` (1)

### `bound require`
`[native code]` | Self: 0.0% (0us) | Total: 9.6% (463.5ms) | Samples: 0

**Called by:**
- `canonicalizeTrustedPath` (26)
- `loadFromCandidates` (21)
- `(anonymous)` (15)
- `getHandlebars` (15)
- `(anonymous)` (6)
- `(anonymous)` (6)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
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
- `require` (122)
- `(anonymous)` (21)

### `loadNative`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:544` | Self: 0.0% (0us) | Total: 0.8% (40.7ms) | Samples: 0

**Called by:**
- `(module)` (21)

**Calls:**
- `loadFromCandidates` (21)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:911` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async measurePhase` (1)

**Calls:**
- `async (anonymous)` (1)

### `async open`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:17352` | Self: 0.0% (0us) | Total: 1.0% (50.1ms) | Samples: 0

**Called by:**
- `async open` (26)

**Calls:**
- `canonicalizeTrustedPath` (26)

### `async #retryPreparedNewSessionCleanups`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:9054` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async close` (1)

**Calls:**
- `async #retryPreparedNewSessionCleanups` (1)

### `node:zlib`
`node:zlib:438` | Self: 0.0% (0us) | Total: 0.6% (30.3ms) | Samples: 0

**Calls:**
- `map` (1)

### `async #initSessionFile`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8313` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `async #initSessionFile` (1)

**Calls:**
- `async #tryInitSessionFileFromSidecar` (1)

### `from`
`[native code]` | Self: 0.0% (0us) | Total: 1.5% (73.6ms) | Samples: 0

**Called by:**
- `async runWorker` (31)
- `(module)` (3)
- `(module)` (1)
- `LRUCache` (1)

**Calls:**
- `async openNext` (31)
- `padStart` (2)
- `(anonymous)` (1)
- `arrayFromFastWithoutMapFn` (1)
- `(anonymous)` (1)

### `extend`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/utils.js:31` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `create` (1)

**Calls:**
- `hasOwnProperty` (1)

### `refresh`
`internal:util/colors:18` | Self: 0.0% (0us) | Total: 0.0% (3.8ms) | Samples: 0

**Called by:**
- `internal:util/colors` (1)

**Calls:**
- `(anonymous)` (1)

### `filter`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `aggregateStats` (1)

**Calls:**
- `(anonymous)` (1)

### `openVerifiedResidentCacheInstanceDir`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:621` | Self: 0.0% (0us) | Total: 0.2% (9.9ms) | Samples: 0

**Called by:**
- `#newResidentTextStoreCandidate` (7)

**Calls:**
- `writeResidentCacheOwnerToken` (5)
- `writeResidentCacheOwnerToken` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:734` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `(anonymous)` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:885` | Self: 0.0% (0us) | Total: 0.0% (3.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `async measurePhase` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/code-gen.js:15` | Self: 0.0% (0us) | Total: 0.1% (8.7ms) | Samples: 0

**Called by:**
- `anonymous` (5)

**Calls:**
- `bound require` (5)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1261` | Self: 0.0% (0us) | Total: 0.0% (3.6ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `internal:util/colors`
`internal:util/colors:24` | Self: 0.0% (0us) | Total: 0.0% (3.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `refresh` (1)

### `visit`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4901` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `jsonLikeValueExceedsCacheLimit` (1)

**Calls:**
- `isView` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/whitespace-control.js:8` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/utils.ts:185` | Self: 0.0% (0us) | Total: 0.6% (32.8ms) | Samples: 0

**Calls:**
- `render` (18)

### `get ReadStream`
`node:fs:578` | Self: 0.0% (0us) | Total: 0.0% (3.7ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/base.js:17` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `#asBuffer`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1054` | Self: 0.0% (0us) | Total: 0.0% (2.8ms) | Samples: 0

**Called by:**
- `#appendBytes` (1)

**Calls:**
- `(anonymous)` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/openai-responses-server-schema.ts:244` | Self: 0.0% (0us) | Total: 0.0% (3.3ms) | Samples: 0

**Calls:**
- `_null` (1)

### `#managedDescriptorSnapshotOrNull`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:13461` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1)

**Calls:**
- `statSync` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.js:18` | Self: 0.0% (0us) | Total: 0.1% (5.2ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.runtime.js:31` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `union`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:818` | Self: 0.0% (0us) | Total: 0.0% (3.5ms) | Samples: 0

**Called by:**
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `ZodUnion` (2)

### `compile`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:115` | Self: 0.0% (0us) | Total: 0.1% (4.9ms) | Samples: 0

**Called by:**
- `compileInput` (1)

**Calls:**
- `invokeKnownHelper` (1)

### `openBufferedWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1758` | Self: 0.0% (0us) | Total: 0.2% (13.0ms) | Samples: 0

**Called by:**
- `openFirstOpenSidecarWriter` (6)

**Calls:**
- `FileSessionStorageWriter` (5)
- `FileSessionStorageWriter` (1)

### `bound strict`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (2.8ms) | Samples: 0

**Called by:**
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `strict` (1)
- `bound clone` (1)

### `async #initSessionFile`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8323` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `writeTerminalBreadcrumb` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7814` | Self: 0.0% (0us) | Total: 0.2% (10.3ms) | Samples: 0

**Called by:**
- `consume` (2)

**Calls:**
- `write` (2)

### `getHandlebars`
`/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/prompt.ts:237` | Self: 0.0% (0us) | Total: 0.5% (26.6ms) | Samples: 0

**Called by:**
- `compile` (15)

**Calls:**
- `bound require` (15)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/anthropic-messages-server-schema.ts:149` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Calls:**
- `_string` (1)

### `canonicalizeTrustedPath`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/managed-session-scope.ts:406` | Self: 0.0% (0us) | Total: 1.0% (50.1ms) | Samples: 0

**Called by:**
- `async open` (26)

**Calls:**
- `bound require` (26)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:8` | Self: 0.0% (0us) | Total: 0.1% (6.4ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `statSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1611` | Self: 0.0% (0us) | Total: 0.1% (9.1ms) | Samples: 0

**Called by:**
- `getSessionMemoryStats` (4)
- `#managedDescriptorSnapshotOrNull` (1)

**Calls:**
- `statSync` (5)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:339` | Self: 0.0% (0us) | Total: 0.1% (7.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `serialize` (2)

### `jsonLikeValueExceedsCacheLimit`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4920` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `#getSessionContextForRead` (1)

**Calls:**
- `visit` (1)

### `ZodUnion`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.0% (3.5ms) | Samples: 0

**Called by:**
- `union` (2)

**Calls:**
- `init` (2)

### `recordFirstOpenGcRequest`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6511` | Self: 0.0% (0us) | Total: 0.0% (2.4ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (1)

**Calls:**
- `residentProcessBytes` (1)

### `loadFromCandidates`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:215` | Self: 0.0% (0us) | Total: 0.8% (40.7ms) | Samples: 0

**Called by:**
- `loadNative` (21)

**Calls:**
- `bound require` (21)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:8` | Self: 0.0% (0us) | Total: 2.2% (108.0ms) | Samples: 0

**Calls:**
- `bound require` (3)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:141` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Calls:**
- `bound strict` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:869` | Self: 0.0% (0us) | Total: 1.3% (64.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (31)

**Calls:**
- `from` (31)

### `#releaseResidentTextStore`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7137` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `async close` (1)

**Calls:**
- `#disposeResidentTextStore` (1)

### `scanTranscriptLinesBounded`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1559` | Self: 0.0% (0us) | Total: 44.1% (2.12s) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (1077)
- `#buildBoundedFirstOpenSidecars` (1)

**Calls:**
- `consume` (1043)
- `consume` (22)
- `consume` (7)
- `consume` (4)
- `consume` (1)
- `consume` (1)

### `internal:validators`
`internal:validators:2` | Self: 0.0% (0us) | Total: 0.2% (10.0ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7632` | Self: 0.0% (0us) | Total: 0.3% (16.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (11)

**Calls:**
- `#prepareResidentTextStoreTransition` (8)
- `#prepareResidentTextStoreTransition` (3)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:966` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `#newResidentTextStoreCandidate`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6853` | Self: 0.0% (0us) | Total: 0.2% (11.3ms) | Samples: 0

**Called by:**
- `#prepareResidentTextStoreTransition` (8)

**Calls:**
- `openVerifiedResidentCacheInstanceDir` (7)
- `openVerifiedResidentCacheInstanceDir` (1)

### `async #initSessionFile`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:8318` | Self: 0.0% (0us) | Total: 51.8% (2.49s) | Samples: 0

**Called by:**
- `(anonymous)` (1263)

**Calls:**
- `async #tryBoundedFirstOpen` (1263)

### `ZodEnum`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `_enum` (1)

**Calls:**
- `init` (1)

### `recordFirstOpenGcRequest`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6518` | Self: 0.0% (0us) | Total: 1.6% (78.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (34)
- `scanTranscriptLinesBounded` (8)

**Calls:**
- `gc` (42)

### `loadNative`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js:536` | Self: 0.0% (0us) | Total: 0.0% (2.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `maybeExtractEmbeddedAddons` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:624` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:1037` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `aggregateStats` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1502` | Self: 0.0% (0us) | Total: 0.2% (11.2ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (7)

**Calls:**
- `copy` (7)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:9` | Self: 0.0% (0us) | Total: 0.0% (4.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `readResidentCacheOwnerSnapshot`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:284` | Self: 0.0% (0us) | Total: 0.0% (4.5ms) | Samples: 0

**Called by:**
- `async sweepResidentCacheRoot` (2)

**Calls:**
- `openVerifiedResidentCacheDirectory` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:738` | Self: 0.0% (0us) | Total: 0.0% (2.7ms) | Samples: 0

**Called by:**
- `init` (2)

**Calls:**
- `init` (2)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1478` | Self: 0.0% (0us) | Total: 0.9% (45.4ms) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (22)

**Calls:**
- `indexOf` (22)

### `createHash`
`node:crypto:201` | Self: 0.0% (0us) | Total: 0.3% (17.1ms) | Samples: 0

**Called by:**
- `computeLineDigest` (8)

**Calls:**
- `Hash` (5)
- `Hash` (2)
- `Hash` (1)

### `LRUCache`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/lru-cache/dist/esm/node/index.js:316` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `from` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:45` | Self: 0.0% (0us) | Total: 0.0% (2.1ms) | Samples: 0

**Calls:**
- `_string` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/partial-json/dist/index.js:20` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Calls:**
- `(anonymous)` (1)

### `createFileCommitMarkerCheckedSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:833` | Self: 0.0% (0us) | Total: 0.1% (5.9ms) | Samples: 0

**Called by:**
- `createSessionCommitMarkerCheckedSync` (4)

**Calls:**
- `secureOwnerOnlyFileDescriptor` (3)
- `secureOwnerOnlyFileDescriptor` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/gjc-runtime/state-schema.ts:34` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Calls:**
- `_number` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/propagation-api.js:10` | Self: 0.0% (0us) | Total: 0.0% (2.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async measurePhase`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:579` | Self: 0.0% (0us) | Total: 0.0% (4.2ms) | Samples: 0

**Called by:**
- `async runWorker` (2)
- `async runWorker` (1)

**Calls:**
- `async measurePhase` (3)

### `ZodPreprocess`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.0% (3.6ms) | Samples: 0

**Called by:**
- `preprocess` (1)

**Calls:**
- `init` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7607` | Self: 0.0% (0us) | Total: 1.3% (66.7ms) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (27)

**Calls:**
- `#buildBoundedFirstOpenSidecars` (18)
- `#buildBoundedFirstOpenSidecars` (5)
- `#buildBoundedFirstOpenSidecars` (1)
- `#buildBoundedFirstOpenSidecars` (1)
- `#buildBoundedFirstOpenSidecars` (1)
- `#buildBoundedFirstOpenSidecars` (1)

### `externalizeResidentValueSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4749` | Self: 0.0% (0us) | Total: 0.0% (3.9ms) | Samples: 0

**Called by:**
- `externalizeResidentValueSync` (1)
- `map` (1)

**Calls:**
- `externalizeResidentValueSync` (1)
- `externalizeResidentValueSync` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/lib/source-map-generator.js:10` | Self: 0.0% (0us) | Total: 0.0% (2.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/baggage/utils.js:8` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `readRangeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1568` | Self: 0.0% (0us) | Total: 0.1% (8.1ms) | Samples: 0

**Called by:**
- `#buildBoundedFirstOpenSidecars` (2)
- `inspectTranscriptHeaderBounded` (1)

**Calls:**
- `readSync` (3)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:1021` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `defineLazy` (1)

### `#disposeResidentTextStore`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7046` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `#releaseResidentTextStore` (1)

**Calls:**
- `dispose` (1)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 0.0% (3.8ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:299` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `async generateTranscript` (1)

**Calls:**
- `writer` (1)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:306` | Self: 0.0% (0us) | Total: 11.4% (550.9ms) | Samples: 0

**Called by:**
- `async write` (290)

**Calls:**
- `write` (290)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:348` | Self: 0.0% (0us) | Total: 4.2% (202.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (101)

**Calls:**
- `byteLength` (101)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:808` | Self: 0.0% (0us) | Total: 0.6% (30.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (15)

**Calls:**
- `memorySample` (15)

### `node:stream`
`node:stream:2` | Self: 0.0% (0us) | Total: 0.0% (3.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `cacheBundledRootCertificates`
`node:tls:569` | Self: 0.0% (0us) | Total: 2.1% (101.9ms) | Samples: 0

**Calls:**
- `getBundledRootCertificates` (2)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/anthropic-messages-server-schema.ts:41` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Calls:**
- `object` (1)

### `internal:stream`
`internal:stream:2` | Self: 0.0% (0us) | Total: 0.0% (3.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:7` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.runtime.js:12` | Self: 0.0% (0us) | Total: 0.1% (5.8ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `internal:streams/compose`
`internal:streams/compose:2` | Self: 0.0% (0us) | Total: 0.0% (3.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:31` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Calls:**
- `bound require` (1)

### `async sweepResidentCacheRoot`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:554` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `opendirSync` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:6` | Self: 0.0% (0us) | Total: 0.0% (3.7ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:15` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Calls:**
- `bound require` (1)

### `readRangeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1565` | Self: 0.0% (0us) | Total: 0.1% (5.0ms) | Samples: 0

**Called by:**
- `#buildBoundedFirstOpenSidecars` (3)

**Calls:**
- `alloc` (3)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/usage.ts:77` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Calls:**
- `_enum` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:908` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `buildSessionContext` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:812` | Self: 0.0% (0us) | Total: 0.0% (3.5ms) | Samples: 0

**Called by:**
- `init` (2)

**Calls:**
- `init` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:868` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7795` | Self: 0.0% (0us) | Total: 16.4% (792.6ms) | Samples: 0

**Called by:**
- `consume` (408)

**Calls:**
- `computeLineDigest` (403)
- `digest` (5)

### `invokeKnownHelper`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js:691` | Self: 0.0% (0us) | Total: 0.1% (4.9ms) | Samples: 0

**Called by:**
- `compile` (1)

**Calls:**
- `setupHelper` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/usage.ts:108` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Calls:**
- `_string` (1)

### `serialize`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:301` | Self: 0.0% (0us) | Total: 5.9% (285.7ms) | Samples: 0

**Called by:**
- `async generateTranscript` (138)
- `async generateTranscript` (2)
- `async generateTranscript` (2)

**Calls:**
- `stringify` (142)

### `_enum`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:1007` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `ZodEnum` (1)

### `require`
`[native code]` | Self: 0.0% (0us) | Total: 8.7% (422.8ms) | Samples: 0

**Called by:**
- `bound require` (122)

**Calls:**
- `anonymous` (96)
- `(anonymous)` (26)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:25` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Calls:**
- `bound refine` (1)

### `openFirstOpenSidecarWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6540` | Self: 0.0% (0us) | Total: 0.2% (13.0ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (5)
- `#buildBoundedFirstOpenSidecars` (1)

**Calls:**
- `openBufferedWriter` (6)

### `node:util`
`node:util:2` | Self: 0.0% (0us) | Total: 0.0% (4.4ms) | Samples: 0

**Calls:**
- `anonymous` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/base.js:11` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `consume`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:1492` | Self: 0.0% (0us) | Total: 42.7% (2.05s) | Samples: 0

**Called by:**
- `scanTranscriptLinesBounded` (1043)

**Calls:**
- `(anonymous)` (408)
- `(anonymous)` (393)
- `(anonymous)` (174)
- `(anonymous)` (34)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:883` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `map` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7808` | Self: 0.0% (0us) | Total: 0.1% (8.6ms) | Samples: 0

**Called by:**
- `consume` (3)

**Calls:**
- `byteLength` (3)

### `_null`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:438` | Self: 0.0% (0us) | Total: 0.0% (3.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `ZodNull` (1)

### `async openNext`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:852` | Self: 0.0% (0us) | Total: 1.3% (64.8ms) | Samples: 0

**Called by:**
- `from` (31)

**Calls:**
- `async (anonymous)` (31)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:912` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)

**Calls:**
- `async close` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:85` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Calls:**
- `bound strict` (1)

### `async generateTranscript`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:323` | Self: 0.0% (0us) | Total: 5.6% (273.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (138)

**Calls:**
- `serialize` (138)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/source-map/source-map.js:8` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:894` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `map` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/auth-broker/wire-schemas.ts:217` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Calls:**
- `get` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/ProxyTracerProvider.js:9` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `_string`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/api.js:7` | Self: 0.0% (0us) | Total: 0.1% (5.4ms) | Samples: 0

**Called by:**
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `ZodString` (3)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js:1022` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `defineLazy` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/index.js:16` | Self: 0.0% (0us) | Total: 0.8% (42.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (22)

**Calls:**
- `loadNative` (21)
- `loadNative` (1)

### `#findColdEntryIndex`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:12301` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `#resolveEntry` (1)

**Calls:**
- `#coldIndexDigestValid` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/provider-models/openai-compat.ts:2238` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Calls:**
- `createOpenCodeApiResolution` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/index.js:28` | Self: 0.0% (0us) | Total: 0.1% (6.4ms) | Samples: 0

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:507` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js:218` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `ret` (1)

**Calls:**
- `addHelpers` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:1050` | Self: 0.0% (0us) | Total: 0.1% (5.9ms) | Samples: 0

**Calls:**
- `register` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:887` | Self: 0.0% (0us) | Total: 0.0% (3.1ms) | Samples: 0

**Called by:**
- `async measurePhase` (2)

**Calls:**
- `getEntry` (2)

### `create`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars.runtime.js:43` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `extend` (1)

### `async measurePhase`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:582` | Self: 0.0% (0us) | Total: 0.0% (4.2ms) | Samples: 0

**Called by:**
- `async measurePhase` (3)

**Calls:**
- `(anonymous)` (2)
- `async (anonymous)` (1)

### `async runWorker`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:879` | Self: 0.0% (0us) | Total: 0.0% (4.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `map` (2)

### `bound clone`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (4.7ms) | Samples: 0

**Called by:**
- `bound check` (2)
- `bound strict` (1)

**Calls:**
- `clone` (3)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/utils/discovery/openai-compatible.ts:38` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Calls:**
- `bound min` (1)

### `#getSessionContextForRead`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16336` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `buildSessionContext` (1)

**Calls:**
- `jsonLikeValueExceedsCacheLimit` (1)

### `node:crypto`
`node:crypto:2` | Self: 0.0% (0us) | Total: 0.8% (40.1ms) | Samples: 0

**Calls:**
- `anonymous` (5)

### `readRangeSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts:1560` | Self: 0.0% (0us) | Total: 0.0% (3.1ms) | Samples: 0

**Called by:**
- `#findColdEntryIndex` (1)
- `#coldIndexDigestValid` (1)

**Calls:**
- `openSync` (2)

### `#preparedResidentTransitionFromSource`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6902` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `#prepareResidentTextStoreTransition` (1)

**Calls:**
- `#buildIndexForEntries` (1)

### `fsyncFirstOpenSidecarWriter`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:6563` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `#scanBoundedTranscriptForFirstOpen` (1)

**Calls:**
- `fsyncSync` (1)

### `async mkdtemp`
`node:fs/promises:148` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `async runWorker` (1)

**Calls:**
- `mkdtemp` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:737` | Self: 0.0% (0us) | Total: 0.0% (3.4ms) | Samples: 0

**Called by:**
- `init` (2)

**Calls:**
- `init` (1)
- `init` (1)

### `min`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:223` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `bound min` (1)

**Calls:**
- `_minLength` (1)

### `bound min`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (3.7ms) | Samples: 0

**Called by:**
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `min` (1)
- `bound check` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/compaction/compaction.ts:768` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Calls:**
- `render` (1)

### `async #tryBoundedFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7645` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `#managedDescriptorSnapshotOrNull` (1)

### `isTrustedResidentCacheBlobFile`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts:707` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `putResidentCacheBlobSync` (1)

**Calls:**
- `isTrustedResidentCacheBlobDescriptor` (1)

### `#scanBoundedTranscriptForFirstOpen`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:7752` | Self: 0.0% (0us) | Total: 49.9% (2.40s) | Samples: 0

**Called by:**
- `async #tryBoundedFirstOpen` (1222)

**Calls:**
- `scanTranscriptLinesBounded` (1077)
- `scanTranscriptLinesBounded` (133)
- `scanTranscriptLinesBounded` (9)
- `scanTranscriptLinesBounded` (1)
- `scanTranscriptLinesBounded` (1)
- `scanTranscriptLinesBounded` (1)

### `externalizeResidentValueSync`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:4718` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `externalizeResidentValueSync` (1)

**Calls:**
- `putSync` (1)

### `async (anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts:305` | Self: 0.0% (0us) | Total: 2.0% (97.5ms) | Samples: 0

**Called by:**
- `async write` (57)

**Calls:**
- `byteLength` (57)

### `buildSessionContext`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:16283` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `async runWorker` (1)

**Calls:**
- `#getSessionContextForRead` (1)

### `(module)`
`/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/providers/openai-chat-server-schema.ts:109` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Calls:**
- `union` (1)

### `getSessionMemoryStats`
`/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts:14186` | Self: 0.0% (0us) | Total: 0.1% (7.8ms) | Samples: 0

**Called by:**
- `map` (4)

**Calls:**
- `statSync` (4)

### `ZodString`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.1% (7.4ms) | Samples: 0

**Called by:**
- `_string` (3)
- `clone` (1)

**Calls:**
- `init` (3)
- `init` (1)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:14` | Self: 0.0% (0us) | Total: 0.0% (3.3ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `ZodNull`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js:41` | Self: 0.0% (0us) | Total: 0.0% (3.3ms) | Samples: 0

**Called by:**
- `_null` (1)

**Calls:**
- `init` (1)

### `internal:streams/lazy_transform`
`internal:streams/lazy_transform:2` | Self: 0.0% (0us) | Total: 0.7% (38.1ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `anonymous` (4)

### `(anonymous)`
`/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js:676` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 94.2% | 4.53s | `[native code]` |
| 1.2% | 62.2ms | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/postmortem.ts` |
| 1.2% | 61.9ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-manager.ts` |
| 0.6% | 30.3ms | `node:zlib` |
| 0.4% | 21.2ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/bench/session-scenario-matrix.ts` |
| 0.2% | 11.9ms | `node:crypto` |
| 0.2% | 9.7ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/classic/schemas.js` |
| 0.1% | 7.2ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/core.js` |
| 0.1% | 7.1ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/util.js` |
| 0.1% | 6.5ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/zod/v4/core/schemas.js` |
| 0.1% | 4.9ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/javascript-compiler.js` |
| 0.0% | 4.5ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js` |
| 0.0% | 3.8ms | `internal:fs/streams` |
| 0.0% | 3.4ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/blob-store.ts` |
| 0.0% | 3.2ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/runtime.js` |
| 0.0% | 2.9ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/chalk/source/vendor/supports-color/index.js` |
| 0.0% | 2.7ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/internal/session-memory-sidecar.ts` |
| 0.0% | 2.2ms | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/model-thinking.ts` |
| 0.0% | 2.1ms | `/Users/bellman/Documents/Workspace/gajae-code/packages/natives/native/loader-state.js` |
| 0.0% | 2.0ms | `internal:streams/lazy_transform` |
| 0.0% | 1.9ms | `/Users/bellman/Documents/Workspace/gajae-code.gajae-code-worktrees/research-stress-test-ed9b2716/packages/coding-agent/src/session/session-storage.ts` |
| 0.0% | 1.8ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/exception.js` |
| 0.0% | 1.8ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/marked/lib/marked.esm.js` |
| 0.0% | 1.8ms | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/peek-file.ts` |
| 0.0% | 1.8ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/entities/dist/esm/internal/encode-shared.js` |
| 0.0% | 1.7ms | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/snowflake.ts` |
| 0.0% | 1.6ms | `/Users/bellman/Documents/Workspace/gajae-code/packages/utils/src/glob.ts` |
| 0.0% | 1.5ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@anthropic-ai/sdk/lib/stainless-helper-header.mjs` |
| 0.0% | 1.5ms | `/Users/bellman/Documents/Workspace/gajae-code/packages/agent/src/agent-loop.ts` |
| 0.0% | 1.4ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/trace/NoopTracerProvider.js` |
| 0.0% | 1.4ms | `internal:streams/destroy` |
| 0.0% | 1.4ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/@opentelemetry/api/build/src/api/diag.js` |
| 0.0% | 1.3ms | `node:fs` |
| 0.0% | 1.2ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/partial-json/dist/index.js` |
| 0.0% | 1.2ms | `/Users/bellman/Documents/Workspace/gajae-code/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js` |
| 0.0% | 1.2ms | `/Users/bellman/Documents/Workspace/gajae-code/packages/ai/src/provider-models/openai-compat.ts` |
