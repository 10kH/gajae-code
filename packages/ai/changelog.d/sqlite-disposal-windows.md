### Fixed

- Closing AuthStorage and the model cache now deterministically finalizes their owned SQLite statements before releasing the database, allowing immediate removal of owned scratch directories on Windows.
