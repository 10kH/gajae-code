### Fixed

- A persistent Python kernel cell can no longer forge a control frame by writing a raw NDJSON line to stdout. Those bytes are cell output, and a normal runner frame still completes the cell.
