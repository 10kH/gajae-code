### Fixed

- Planning-phase bash now refuses sed `w` scripts, awk quoted redirections, `ln`, and interpreter writes such as `shutil.copy`, `os.system`, `os.symlink`, `appendFileSync`, and `perl` `open`. Read-only planning commands stay allowed.
