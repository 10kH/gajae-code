### Fixed

- SDK lifecycle sessions ignore a project dotenv `GJC_SDK_TEST_IN_MEMORY_SESSION` line, so a repository `.env` cannot disable transcript persistence; an operator value the project does not declare is still honored.
