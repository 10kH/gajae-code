### Fixed

- `gjc ralplan --write` scrubs credential shapes from stage artifacts and pending-approval copies before it records their digest, and refuses a disposition when distinct target ids collapse to one scrubbed id.
