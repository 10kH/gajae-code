### Fixed

- Anthropic automatic prompt caching no longer adds a root cache marker when caller markers already occupy all four breakpoints, which made the request fail validation.
