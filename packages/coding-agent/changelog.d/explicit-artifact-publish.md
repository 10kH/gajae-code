### Fixed

- GitHub run logs and truncated read-url pages stored at an explicit artifact path are published as mode 0600 via a temporary file opened with O_NOFOLLOW, and a pre-existing mode 0644 file is replaced.
