### Fixed

- The bash tool's shell processes now also drop project-provided `NODE_OPTIONS`, `PYTHONPATH`, `PERL5OPT`, `PERL5LIB`, `JAVA_TOOL_OPTIONS`, `LD_PRELOAD`, and `DYLD_INSERT_LIBRARIES` when the value comes from the project `.env`, so a repository cannot make `node`, `python3`, `perl`, `java`, or any dynamically linked command run repository code; values the launching shell exported are still honored.
