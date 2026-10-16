### Fixed

- Planning-phase Bash now refuses sed `w` destinations with spaces, awk quoted redirections and opaque program files, `ln`, and interpreter writes including attached `-e` payloads and dynamic Python/Node evaluation. Compile-only Python and read-only planning commands, including GNU awk `-W lint`, stay allowed.
