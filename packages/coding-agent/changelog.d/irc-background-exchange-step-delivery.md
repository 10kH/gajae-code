### Fixed

- Deliver a background IRC exchange to a busy session at the live run's next tool boundary instead of at the end of the turn, and keep the incoming question and the reply already sent on the model's behalf in one steering cohort (`Agent.steerCohort`) so a later model step cannot see the question without its reply. A goal-mode turn keeps the session streaming from its first prompt to its last message, so a subagent's message could sit outside the model's history for many minutes while the transcript already showed it.
