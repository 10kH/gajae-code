### Fixed

- Column caps in streamed tool output and file reads no longer return partial configured plain secrets across a cut, including shorter overlapping prefixes and secrets that continue across newline boundaries. Raw reads and hashline output remain unchanged.
