### Fixed

- Planning-phase bash now refuses sed `w` destinations with spaces, awk quoted redirections, `ln`, and interpreter writes including attached `-e` payloads and Python dynamic-evaluation/import forms. Read-only planning commands, including GNU awk `-W lint`, stay allowed.
