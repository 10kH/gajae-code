### Fixed

- Imported-text OSC stripping walks each character once and stops at the first terminator, so unterminated ESC prefixes stay cheap and text between terminated OSC sequences is kept.
