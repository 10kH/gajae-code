### Fixed

- Kiro streams now surface explicit content-filter refusal messages with category and explanation instead of the generic "no tokens" error when a refusal is detected. Both bearer token (via `messageMetadataEvent`) and API-key (`ksk_`, via `metadataEvent`) paths are supported, with proper provider safety-stop minting. Bearer-token text streams incrementally unless a thinking block precedes it; API-key text remains quarantined until clean EOF. Tool calls are emitted only at stream end (#6150).
- Detail-free `stopReason: "CONTENT_FILTERED"` (without `stopDetails.refusal` object) is now treated as a refusal and suppresses unconfirmed content.
- API-key text remains quarantined through `COMPLETED`/`TOOL_USE` metadata and is released only at clean EOF, so a later refusal or read failure cannot leak content across HTTP chunk boundaries.
- A refusal takes precedence over ordinary errors or successful completion in the same batch or a later read. An active tool may finish its input after `TOOL_USE`, while `COMPLETED` fences tool fragments and later content.
- Error events omit duplicate partial messages so credential-shaped upstream text cannot bypass gateway redaction or leak through SSE encoders.
- Parser no longer resyncs into nested objects when an incomplete outer JSON frame is encountered. Incomplete frames are retained as remainder; EOF with incomplete frame throws an error.
- Errors before clean EOF discard quarantined text and retain only explicitly completed tool calls.
