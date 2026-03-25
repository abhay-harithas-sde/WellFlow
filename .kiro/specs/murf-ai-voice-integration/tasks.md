# Implementation Plan: Murf AI Voice Integration

## Overview

Wire the existing scaffolded voice components (`TTSEngine`, `WebSocketManager`, `VoiceSelector`,
`RateLimiter`) to the live Murf AI API. Covers secure credential management, Next.js API proxy
routes, real-time TTS streaming, voice catalogue, multilingual support, text fallback UI, rate
limiting, and error observability.

## Tasks

- [ ] 1. Environment and configuration setup
  - Create `.env.example` at the project root with `MURF_API_KEY=` (no real value)
  - Create `lib/murf-config.ts` that reads `process.env.MURF_API_KEY`, throws a
    `ConfigurationError` if absent or empty, and exports the validated key
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 1.1 Write unit tests for `murf-config.ts`
    - Test `ConfigurationError` thrown when env var is absent
    - Test `ConfigurationError` thrown when env var is empty string
    - Test validated key returned when env var is present
    - _Requirements: 1.1, 1.2_


- [ ] 2. Implement Next.js API proxy routes
  - Create `app/api/murf/voices/route.ts`: validate same-origin `Origin` header (return 403 on
    mismatch), call `getMurfApiKey()` from `lib/murf-config.ts`, forward `GET` to
    `https://api.murf.ai/v1/speech/voices` with `Authorization: Bearer <key>`, return JSON
  - Create `app/api/murf/tts/route.ts`: validate same-origin `Origin` header (return 403 on
    mismatch), call `getMurfApiKey()`, upgrade to WebSocket and proxy to
    `wss://api.murf.ai/tts/stream` with `Authorization: Bearer <key>`, stream audio chunks
    back without buffering
  - _Requirements: 2.1, 2.2, 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 2.1 Write unit tests for `/api/murf/voices` route
    - Test 403 returned for cross-origin `Origin` header
    - Test 403 returned when `Origin` header is absent
    - Test auth header injected on upstream request
    - _Requirements: 12.3, 12.4_

  - [ ]* 2.2 Write unit tests for `/api/murf/tts` route
    - Test 403 returned for cross-origin `Origin` header
    - Test auth header injected on WebSocket upgrade
    - _Requirements: 12.3, 12.4_

  - [ ]* 2.3 Write property test for same-origin gate (Property 13)
    - **Property 13: Same-origin check gates all proxy forwarding**
    - **Validates: Requirements 12.3, 12.4**


- [ ] 3. Update `RateLimiter` to meet Murf AI concurrency requirements
  - Change `MAX_CONCURRENT` from `2` to `3` in `src/components/RateLimiter.ts`
  - Add `timeoutMs` parameter to `acquire(timeoutMs?: number): Promise<void>` — reject with a
    timeout error after the specified duration (default 10 000 ms per Req 10.4)
  - Update `RateLimiterInterface` in the same file to reflect the new signature
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 3.1 Write unit tests for updated `RateLimiter`
    - Test `activeCount` never exceeds 3 with concurrent acquires
    - Test slot released immediately on `release()` unblocks next waiter
    - Test `acquire()` rejects after 10-second timeout
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 3.2 Write property test for rate limiter concurrency (Property 12)
    - **Property 12: Rate limiter never exceeds maximum concurrency**
    - **Validates: Requirements 10.1, 10.2**


- [ ] 4. Update `TTSEngine` for Murf AI language mapping, auth errors, and observability
  - Narrow `SUPPORTED_LANGUAGES` to `{en, es}` only (remove fr, de, it, pt, ja, ko, zh)
  - Add language mapping: `en` → `en-US`, `es` → `es-ES`; unsupported locales map to `en-US`
    and invoke `onUnsupportedLanguage`
  - Add `onAuthError` to `TTSEngineCallbacks`; treat HTTP 401/403 from the proxy as
    non-retryable — invoke `onAuthError` then `onTextFallback`, skip retry
  - Pass `timeoutMs: 10_000` to `rateLimiter.acquire()`; catch timeout rejection and call
    `onTextFallback` with the original text
  - Add server-side logging calls (via a `logger` dependency) for: fallback events (session ID +
    reason), auth errors (status code + session ID), and rate-limit timeouts (session ID)
  - _Requirements: 2.3, 2.4, 3.3, 3.4, 3.5, 3.6, 9.1, 9.2, 9.3, 10.4, 13.1, 13.4_

  - [ ]* 4.1 Write unit tests for `TTSEngine` language mapping and auth error handling
    - Test `en` maps to `en-US` in outbound payload
    - Test `es` maps to `es-ES` in outbound payload
    - Test unsupported locale maps to `en-US` and fires `onUnsupportedLanguage`
    - Test 401 response fires `onAuthError` + `onTextFallback` with no retry
    - Test 403 response fires `onAuthError` + `onTextFallback` with no retry
    - Test rate-limit timeout fires `onTextFallback`
    - _Requirements: 2.3, 2.4, 3.3, 9.1, 9.2, 9.3, 10.4_

  - [ ]* 4.2 Write property test for language/speed mapping (Property 4)
    - **Property 4: TTSOptions language and speed are faithfully mapped**
    - **Validates: Requirements 3.3, 3.4, 9.1, 9.2**

  - [ ]* 4.3 Write property test for double failure triggering text fallback (Property 5)
    - **Property 5: Double TTS failure triggers text fallback with original text**
    - **Validates: Requirement 3.6**

  - [ ]* 4.4 Write property test for auth error suppressing retry (Property 2)
    - **Property 2: Auth errors suppress retries and activate fallback**
    - **Validates: Requirements 2.3, 2.4**


- [ ] 5. Update `WebSocketManager` for proxy URL and observability logging
  - Change default `wsUrl` constructor argument from `wss://api.murf.ai/tts/stream` to
    `/api/murf/tts` (relative URL so the browser connects to the Next.js proxy)
  - Add a `logger` dependency (injected via constructor) and log: unexpected close events
    (error code, reason, session ID), each reconnect attempt and failure, and
    `onMaxRetriesExceeded` events
  - Ensure `onAudioChunk` is called per-chunk without buffering (already implemented; verify
    no buffering is introduced)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 13.2_

  - [ ]* 5.1 Write unit tests for `WebSocketManager` reconnect and inactivity
    - Test reconnect scheduled within 2 s after unexpected close
    - Test `onMaxRetriesExceeded` fired after 3 consecutive failures
    - Test inactivity timer fires `onClose('INACTIVITY_TIMEOUT')` after 3 minutes
    - Test inactivity timer resets on each `send()` call
    - _Requirements: 4.3, 4.4, 4.5, 4.6_

  - [ ]* 5.2 Write property test for inactivity timer reset (Property 6)
    - **Property 6: Inactivity timer resets on every send**
    - **Validates: Requirement 4.4**

  - [ ]* 5.3 Write property test for audio chunks forwarded immediately (Property 3)
    - **Property 3: Audio chunks are forwarded immediately**
    - **Validates: Requirement 3.2**


- [ ] 6. Update `VoiceSelector` with `initialise()`, live catalogue fetch, and language awareness
  - Add `initialise(language: string): Promise<void>` method that fetches
    `GET /api/murf/voices`, parses the `MurfVoice[]` response, and caches it in memory;
    subsequent calls are no-ops (idempotent)
  - Store the current session language in the instance so `previewVoice()` uses it instead of
    the hardcoded `'en'`
  - On catalogue fetch failure: store empty list, invoke `onPreviewError` with a descriptive
    message
  - Update the constructor to accept an optional `fetchFn` for testability
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.3_

  - [ ]* 6.1 Write unit tests for `VoiceSelector.initialise()`
    - Test voice list populated on successful fetch
    - Test empty list stored and `onPreviewError` called on fetch failure
    - Test second call to `initialise()` does not trigger another fetch
    - Test `previewVoice()` uses the language passed to `initialise()`
    - _Requirements: 5.1, 5.3, 5.4, 6.3_

  - [ ]* 6.2 Write property test for catalogue fetched at most once (Property 8)
    - **Property 8: Voice catalogue is fetched at most once per session**
    - **Validates: Requirement 5.4**

  - [ ]* 6.3 Write property test for voice filter correctness (Property 7)
    - **Property 7: Voice filter returns only matching voices**
    - **Validates: Requirement 5.2**

  - [ ]* 6.4 Write property test for preview error no throw (Property 9)
    - **Property 9: Preview failure invokes callback without throwing**
    - **Validates: Requirement 6.2**


- [ ] 7. Verify and test voice resolution priority chain
  - Confirm `TTSEngine._resolveVoiceId()` implements the four-level priority:
    (1) `TTSOptions.voiceId`, (2) activity assignment, (3) fallback voice, (4) `"murf-default"`
  - No code changes expected if the existing implementation is correct; add tests to lock in
    the behaviour
  - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 7.1 Write unit tests for voice resolution priority
    - Test explicit `voiceId` in options overrides all others
    - Test activity assignment used when no explicit voiceId
    - Test fallback used when no activity assignment
    - Test `"murf-default"` used when no fallback set
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 7.2 Write property test for voice resolution priority chain (Property 10)
    - **Property 10: Voice resolution follows priority order**
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [ ] 8. Checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 9. Implement `VoiceProfile` persistence and JSON round-trip
  - Verify `VoiceSelector.saveVoiceProfile()` and `loadVoiceProfile()` correctly serialise and
    deserialise `VoiceProfile` through `ProfileStore` (already implemented; add tests)
  - Confirm `activityAssignments` keys and `fallbackVoiceId` survive a `JSON.stringify` /
    `JSON.parse` round-trip without data loss
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 9.1 Write unit tests for `VoiceProfile` persistence
    - Test `saveVoiceProfile` then `loadVoiceProfile` restores all assignments
    - Test profile with no assignments round-trips correctly
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 9.2 Write property test for `VoiceProfile` JSON round-trip (Property 14)
    - **Property 14: VoiceProfile JSON round-trip is lossless**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**


- [ ] 10. Implement multilingual locale switching in `ConversationEngine`
  - Add a `setLanguage(locale: string): void` method (or update the existing one) that updates
    the session language on the `ConversationContext`
  - Ensure all subsequent `TTSEngine.speak()` calls use the updated locale from the context
  - _Requirements: 9.4_

  - [ ]* 10.1 Write unit tests for locale switching
    - Test that TTS requests after `setLanguage('es')` carry `es-ES`
    - Test that TTS requests after `setLanguage('en')` carry `en-US`
    - _Requirements: 9.4_

  - [ ]* 10.2 Write property test for locale switch propagation (Property 11)
    - **Property 11: Locale switch propagates to all subsequent TTS requests**
    - **Validates: Requirement 9.4**


- [ ] 11. Implement text fallback UI component
  - Create `src/components/TextFallbackDisplay.ts` that:
    - Exposes `show(text: string): void` — renders the text visibly within 200 ms of the call
    - Exposes `hide(): void` — removes the fallback text when audio resumes
    - Accepts a DOM element reference (or equivalent abstraction) for testability
  - Wire `TTSEngine.callbacks.onTextFallback` to call `TextFallbackDisplay.show()`
  - Wire the next successful TTS completion to call `TextFallbackDisplay.hide()`
  - _Requirements: 11.1, 11.2, 11.3_

  - [ ]* 11.1 Write unit tests for `TextFallbackDisplay`
    - Test `show()` makes text visible within 200 ms
    - Test `hide()` removes the fallback text
    - Test `show()` followed by `hide()` leaves no residual text
    - _Requirements: 11.1, 11.3_


- [ ] 12. Implement server-side logger and observability
  - Create `lib/murf-logger.ts` with a `MurfLogger` class that wraps `console.error` /
    `console.warn` and exposes typed log methods:
    - `logApiError(statusCode, requestType, sessionId, timestamp)`
    - `logWsError(code, reason, sessionId)`
    - `logFallback(sessionId, reason)`
  - Each method must assert that the log output does not contain the `MURF_API_KEY` value
  - Inject `MurfLogger` into `TTSEngine` and `WebSocketManager` constructors
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [ ]* 12.1 Write unit tests for `MurfLogger`
    - Test `logApiError` output contains status code, request type, session ID, timestamp
    - Test `logWsError` output contains error code, reason, session ID
    - Test `logFallback` output contains session ID and reason
    - Test no log method emits the API key value
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [ ]* 12.2 Write property test for log fields and no API key leakage (Property 15)
    - **Property 15: Log entries contain required fields and never contain the API key**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4**


- [ ] 13. Write the consolidated property-based test file
  - Create `src/components/MurfVoiceIntegration.property.test.ts`
  - Implement all 15 `fc.assert` property tests using `fast-check` with `numRuns: 100`
  - Each test must include a comment: `// Feature: murf-ai-voice-integration, Property N: <title>`
  - Properties to implement: P1 (auth header), P2 (auth error suppresses retry), P3 (chunks
    forwarded immediately), P4 (language/speed mapping), P5 (double failure → fallback),
    P6 (inactivity timer resets), P7 (filter returns matching voices), P8 (catalogue fetched
    once), P9 (preview error no throw), P10 (voice priority chain), P11 (locale switch
    propagates), P12 (rate limiter concurrency), P13 (same-origin gate), P14 (VoiceProfile
    round-trip), P15 (logs contain fields, no key)
  - _Requirements: all (property tests are cross-cutting)_

- [ ] 14. Write the consolidated unit test file
  - Create `src/components/MurfVoiceIntegration.test.ts`
  - Implement all unit test cases listed in the design's Testing Strategy section:
    - `ConfigurationError` thrown when `MURF_API_KEY` absent or empty (Req 1.2)
    - `.env.example` contains `MURF_API_KEY=` without a real value (Req 1.4)
    - Exactly one retry on first TTS failure, then fallback (Req 3.5, 3.6)
    - `WebSocketManager` reconnects after unexpected close (Req 4.3)
    - `WebSocketManager` invokes `onMaxRetriesExceeded` after 3 failures (Req 4.6)
    - `WebSocketManager` closes with `INACTIVITY_TIMEOUT` after 3 minutes (Req 4.5)
    - `VoiceSelector.initialise()` populates voice list on success, empty on failure (Req 5.1, 5.3)
    - `VoiceSelector.previewVoice()` uses current session language (Req 6.3)
    - Rate limiter cancels request after 10-second wait (Req 10.4)
    - Text fallback displayed within 200 ms of `onTextFallback` invocation (Req 11.1)
    - `/api/murf/tts` returns 403 for cross-origin requests (Req 12.4)
    - `/api/murf/voices` returns 403 for cross-origin requests (Req 12.4)
  - _Requirements: 1.2, 1.4, 3.5, 3.6, 4.3, 4.5, 4.6, 5.1, 5.3, 6.3, 10.4, 11.1, 12.4_

- [ ] 15. Wire components together and export new modules
  - Export `TextFallbackDisplay` from `src/components/index.ts`
  - Export `MurfLogger` from `lib/murf-logger.ts` (no barrel needed; direct import in consumers)
  - Update `WellFlowAssistant` (or the top-level session bootstrap) to:
    - Call `getMurfApiKey()` on startup
    - Instantiate `MurfLogger` and inject into `TTSEngine` and `WebSocketManager`
    - Call `VoiceSelector.initialise(sessionLanguage)` before the first TTS request
    - Wire `onTextFallback` to `TextFallbackDisplay.show()`
    - Wire successful TTS completion to `TextFallbackDisplay.hide()`
  - _Requirements: 1.1, 1.2, 5.1, 11.1, 11.3_

  - [ ]* 15.1 Write integration tests for the wired session bootstrap
    - Test `getMurfApiKey()` called at startup and error surfaces correctly
    - Test `VoiceSelector.initialise()` called before first `TTSEngine.speak()`
    - Test `onTextFallback` wired to `TextFallbackDisplay.show()`
    - _Requirements: 1.1, 5.1, 11.1_

- [ ] 16. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with `numRuns: 100` minimum
- Run tests with `npm run test:run` (jest --runInBand)
