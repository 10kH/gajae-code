### Fixed

- Project dotenv loading includes the development env file and its local overlay when `NODE_ENV` is unset, and the provenance snapshot uses that same file list so those values stay project-controlled. The manual fallback preserves Bun-style variable interpolation.
