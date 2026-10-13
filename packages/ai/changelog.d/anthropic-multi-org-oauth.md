### Fixed
- Anthropic OAuth keeps one stored credential per organization when a single account belongs to several organizations (for example a Team workspace and a personal Max plan). Credentials now record the organization from the token response, their identity key is scoped to it, so logging in to a second organization no longer replaces or disables the first, and usage limits are reported per organization instead of being merged across them. Rows stored before this change keep working and are deduplicated once their next refresh records the organization.

### Added
- Added the `org:<organization id or name>` credential selector, matching an OAuth credential by its organization id or display name (case-insensitive).
