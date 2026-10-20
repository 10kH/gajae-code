### Fixed

- On POSIX, skill and hook import publication now creates and writes destination files through no-follow directory descriptors, so replacing the destination directory with a symlink after validation cannot publish the file outside that directory. Windows retains lexical path validation. On POSIX, imports spanning more than 128 distinct destination directories fail before publication rather than risking a partial batch.
