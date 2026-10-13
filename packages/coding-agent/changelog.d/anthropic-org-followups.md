### Fixed
- `gjc accounts logout --account org:<value>` and `gjc accounts pin <provider> org:<value>` prefer the organization whose id matches exactly over display-name matches, and refuse a display name shared by several organizations while listing the candidate row ids.
