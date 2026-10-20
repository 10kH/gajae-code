### Fixed

- Kitty and iTerm2 image encoders now reject a payload that is not RFC 4648 base64 before writing the terminal escape, so an early APC or OSC terminator in the image data cannot inject further control sequences.
