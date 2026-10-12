### Fixed

- Project dotenv loading includes `.env.development` and `.env.development.local` when `NODE_ENV` is unset, matching the files already applied by the runtime.
