### Fixed

- Harness owner routing dials only the private session socket, and a live owner publishes that socket only after it holds the lease so a later command can reach it from another socket directory.
