### Fixed

- The native loader accepts Windows ARM64 and looks for `pi_natives.win32-arm64.node`.
- On Windows, `libunwind.dll` beside the installed addon is loaded after the `.node` file is copied into the versioned cache.
