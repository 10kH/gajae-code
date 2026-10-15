### Fixed

- Planning and autoresearch mutation checks now cover recognized eval and python writes, including the destination of a qualified `os`/`shutil` copy or rename and `renameSync`/`copyFileSync`, even when whitespace or a line continuation precedes the attribute. Non-mutating code and the autoresearch.sh research artifact stay allowed. Alias imports and `Path.open` are not scanned.
