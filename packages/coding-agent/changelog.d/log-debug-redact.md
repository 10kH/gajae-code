### Fixed

- Session title debug logs and marketplace clone debug logs scrub recognizable credentials and values of any length under generic and compound sensitive labels, including `private_token` and `AWS_SECRET_ACCESS_KEY`, before they are written.
