### Fixed

- Deliver a background IRC exchange to a busy session at the live run's next tool boundary instead of at the end of the turn. A goal-mode turn keeps the session streaming from its first prompt to its last message, so a subagent's message could sit outside the model's history for many minutes while the transcript already showed it.
