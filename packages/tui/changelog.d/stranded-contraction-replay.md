### Fixed

- Fixed the viewport going blank above the status line and input box when a tall live block (task output, streaming tool output) collapsed with `clearOnShrink` off: the TUI now replays the frame when padding to the committed frontier would leave no transcript row on screen.
