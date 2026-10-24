### Fixed

- A project `.env` can no longer set `GJC_SDK_DISABLE`. That name is the operator opt-out for SDK hosting, and a repository must not be able to turn hosting off. A value exported by the launching shell is kept unless it is the same string the project declares.
