### Fixed

- Kiro streams now surface explicit content-filter refusal messages with category and explanation instead of the generic "no tokens" error when a refusal is detected. Both bearer token (via `messageMetadataEvent`) and API-key (`ksk_`, via `metadataEvent`) paths are supported, with proper provider safety-stop minting. Bearer-token text streams incrementally unless a thinking block precedes it; API-key text remains quarantined until successful terminal metadata or clean EOF. Tool calls are emitted only at stream end (#6150).
- Detail-free `stopReason: "CONTENT_FILTERED"` (without `stopDetails.refusal` object) is now treated as a refusal and suppresses unconfirmed content.
- API-key text is released only after `COMPLETED`/`TOOL_USE` metadata or clean EOF; usage and unknown stop reasons do not confirm it. Successful-terminal text events are emitted before later transport failures.
- A refusal takes precedence over ordinary errors in the same batch. An active tool may finish its input after `TOOL_USE`, while later content and new tool generations remain fenced.
- Error events omit duplicate partial messages so credential-shaped upstream text cannot bypass gateway redaction or leak through SSE encoders.
- Parser no longer resyncs into nested objects when an incomplete outer JSON frame is encountered. Incomplete frames are retained as remainder; EOF with incomplete frame throws an error.
- Server error events now emit `text_end` for confirmed text before throwing the error, ensuring complete text lifecycle.
