### Fixed

- Forward MCP tool-result images and embedded image resources to image-capable models on providers that support tool-result images, using bounded built-in image resizing and source-dimension limits while preserving untrusted text markers and text-only error results. Attached images carry an explicit untrusted-content notice.
- Honor cancellation during MCP image processing and use the detected image MIME type for mislabeled images.
