### Fixed

- The committed `native/index.d.ts` matches its generator output again, so building the workspace (`bun run build:native`, `sh scripts/install.sh --dev`) no longer leaves a tracked generated file dirty on a clean checkout.
