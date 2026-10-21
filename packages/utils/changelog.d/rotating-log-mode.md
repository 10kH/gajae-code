### Fixed

- On POSIX, the rotating-log directory and the active log file are owner-only when they can be opened. An entry the owner cannot open is left unchanged and reported, instead of a path chmod. Retained dated logs and compressed archives keep their mode. Root aliases, including a directory whose opened inode is the filesystem root, are not chmodded. A symlinked log directory keeps its target mode, while a regular log file reached through it is still tightened. A trailing backslash stays part of a POSIX directory name.
