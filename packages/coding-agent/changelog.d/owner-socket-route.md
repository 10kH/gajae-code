### Fixed

- Harness owner routing dials only the private session socket, so a workspace lease file cannot send verbs to a different unix path. A live owner records that socket outside the workspace, so a later command still reaches it when the socket directory or temp directory differs.
