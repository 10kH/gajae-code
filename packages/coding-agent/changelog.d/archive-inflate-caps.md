### Fixed

- Opening a zip, tar, or tar.gz archive now stops during inflate when one entry, the member bytes, the entry count, or the path depth exceeds its cap, including gzip bytes opened under a .tar name.
