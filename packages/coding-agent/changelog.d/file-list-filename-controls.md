### Fixed

- File lists strip terminal control sequences from entry names before coloring, so a find result cannot write OSC, CSI, or DCS to the operator terminal.
