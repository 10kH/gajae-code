### Fixed

- Headless session resume refreshes the saved model's provider catalog before restoration, so slash-namespaced catalog IDs remain resumable without an explicit `--model` override (#7099).
