### Features

- Add native reasoning support for Kiro models (Claude Opus/Sonnet 4.6+, GPT 5.6+) via `reasoningContentEvent` parsing and `additionalModelRequestFields` request fields
- New `buildKiroAdditionalModelRequestFields()` helper generates model-specific reasoning configuration for both API key and OAuth transports
- Stream parsers in both `kiro-api-key.ts` and `kiro-codewhisperer.ts` now handle `reasoningContentEvent` with text, signature, and redactedContent payloads
- Thinking signatures are tagged as `kiro:signature:<sig>` or `kiro:redactedContent:<blob>` for provider response tracking

### Tests

- Add test suite in `kiro-native-reasoning.test.ts` covering:
  - Request field generation for Claude Opus/Sonnet and GPT models
  - Stream parsing of reasoningContentEvent with text, signature, and redactedContent
  - Two-turn replay with thinking signature preservation and block lifecycle
