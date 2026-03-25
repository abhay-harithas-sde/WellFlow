# Requirements Document

## Introduction

WellFlow is a voice-powered wellness assistant built with Next.js and TypeScript. The application
already contains scaffolded voice components (TTSEngine, WebSocketManager, VoiceSelector,
VoiceInputHandler, ConversationEngine) that reference Murf AI endpoints but are not yet connected
to a live Murf AI account. This feature wires the application to the real Murf AI API using the
provided API key, covering: secure credential management, real-time TTS streaming via WebSocket,
voice catalogue browsing and assignment, multilingual synthesis (English and Spanish), accessibility
fallbacks, and rate-limit compliance.

## Glossary

- **Murf_API**: The Murf AI REST and WebSocket API used for text-to-speech synthesis and voice catalogue retrieval.
- **TTS_Engine**: The existing `TTSEngine` component responsible for submitting text to Murf_API and streaming audio.
- **WebSocket_Manager**: The existing `WebSocketManager` component that maintains the persistent WebSocket connection to `wss://api.murf.ai/tts/stream`.
- **Voice_Selector**: The existing `VoiceSelector` component that browses, filters, previews, and assigns Murf AI voices.
- **Voice_Profile**: A per-user data structure mapping wellness activity types to specific Murf AI voice IDs, plus a fallback voice ID.
- **API_Key**: The Murf AI secret key (`ap2_e105703a-c718-433b-a17f-d31f5f6587ed`) used to authenticate all requests to Murf_API.
- **Rate_Limiter**: The existing `RateLimiter` component that enforces Murf AI's concurrent-request limits.
- **Activity_Type**: One of `BREATHING_EXERCISE`, `MINDFULNESS_SESSION`, `STRESS_RELIEF`, or `ROUTINE_REMINDER` — the wellness activity categories that can each have a dedicated voice.
- **Locale**: The active i18n locale of the application, either `en` (English) or `es` (Spanish).
- **Text_Fallback**: On-screen display of the TTS response text when audio synthesis is unavailable.
- **Voice_Preview**: A short audio sample played to the user so they can audition a Murf AI voice before assigning it.
- **Inactivity_Timeout**: Automatic closure of a WebSocket connection after 3 minutes without a TTS request.
- **Crisis_Detector**: The existing component that intercepts crisis signals before normal intent routing.

---

## Requirements

### Requirement 1: Secure API Key Configuration

**User Story:** As a developer, I want the Murf AI API key stored securely in environment variables, so that the secret is never exposed in source code or client-side bundles.

#### Acceptance Criteria

1. THE System SHALL read the Murf AI API key exclusively from the `MURF_API_KEY` environment variable at server startup.
2. IF the `MURF_API_KEY` environment variable is absent or empty at startup, THEN THE System SHALL throw a configuration error and refuse to start.
3. THE System SHALL never include the API key in any client-side JavaScript bundle, HTML response, or log output.
4. WHERE a `.env.local` file is used for local development, THE System SHALL document the required variable name in a `.env.example` file without including the actual key value.

---

### Requirement 2: Murf API Authentication

**User Story:** As the application, I want every request to Murf AI to carry the API key, so that all TTS and catalogue calls are authenticated.

#### Acceptance Criteria

1. WHEN TTS_Engine submits a TTS request, THE System SHALL include the API key as an `Authorization: Bearer <key>` header on every HTTP and WebSocket handshake request to Murf_API.
2. WHEN Voice_Selector calls the Murf AI voice catalogue endpoint, THE System SHALL include the API key as an `Authorization: Bearer <key>` header.
3. IF Murf_API returns an HTTP 401 or 403 response, THEN THE System SHALL emit an `onAuthError` callback and activate Text_Fallback for the affected request.
4. THE System SHALL never retry a request that failed with HTTP 401 or 403, as retrying with the same key will not succeed.

---

### Requirement 3: Real-Time TTS Streaming

**User Story:** As a user, I want wellness guidance delivered as natural-sounding speech in real time, so that I can follow along without reading a screen.

#### Acceptance Criteria

1. WHEN TTS_Engine receives a text string and TTSOptions, THE TTS_Engine SHALL submit the text to Murf_API and begin streaming audio within 500ms of the call.
2. WHILE audio is streaming, THE TTS_Engine SHALL forward each received audio chunk to the audio playback layer without buffering the full response.
3. THE TTS_Engine SHALL apply the `language` field from TTSOptions to the Murf_API request, mapping `en` to `en-US` and `es` to `es-ES`.
4. THE TTS_Engine SHALL apply the `speed` field from TTSOptions (`slow`, `normal`, `fast`) to the Murf_API request.
5. IF Murf_API returns an error on the first TTS attempt, THEN THE TTS_Engine SHALL retry the request exactly once.
6. IF both TTS attempts fail, THEN THE TTS_Engine SHALL invoke the `onTextFallback` callback with the original text string so the UI can display it on screen.

---

### Requirement 4: WebSocket Connection Lifecycle

**User Story:** As the application, I want the WebSocket connection to Murf AI managed reliably, so that voice streaming is uninterrupted during a wellness session.

#### Acceptance Criteria

1. WHEN a session starts, THE WebSocket_Manager SHALL establish a WebSocket connection to `wss://api.murf.ai/tts/stream` before the first TTS request is sent.
2. WHILE a session is active, THE WebSocket_Manager SHALL monitor the connection and detect unexpected closures within 1 second.
3. IF the WebSocket connection closes unexpectedly, THEN THE WebSocket_Manager SHALL attempt to reconnect within 2 seconds.
4. WHEN a TTS request is sent, THE WebSocket_Manager SHALL reset the Inactivity_Timeout timer to 3 minutes.
5. IF no TTS request is sent for 3 consecutive minutes, THEN THE WebSocket_Manager SHALL close the connection and invoke the `onClose` callback with reason `INACTIVITY_TIMEOUT`.
6. IF reconnection fails 3 consecutive times, THEN THE WebSocket_Manager SHALL invoke the `onMaxRetriesExceeded` callback so the UI can notify the user.

---

### Requirement 5: Voice Catalogue Retrieval

**User Story:** As a user, I want to browse available Murf AI voices, so that I can choose a voice that suits my preferences.

#### Acceptance Criteria

1. WHEN Voice_Selector is initialised, THE Voice_Selector SHALL fetch the available voice list from the Murf AI voice catalogue endpoint and cache the result in memory.
2. THE Voice_Selector SHALL expose a `listVoices(filters?)` method that returns voices matching all supplied filter fields (`name`, `accent`, `gender`, `style`).
3. IF the voice catalogue fetch fails, THEN THE Voice_Selector SHALL return an empty list and invoke the `onPreviewError` callback with a descriptive message.
4. THE Voice_Selector SHALL refresh the cached voice list at most once per application session to avoid redundant API calls.

---

### Requirement 6: Voice Preview

**User Story:** As a user, I want to hear a short audio sample of a voice before assigning it, so that I can make an informed choice.

#### Acceptance Criteria

1. WHEN a user requests a preview of a voice, THE Voice_Selector SHALL submit a short sample text to TTS_Engine using the selected voice ID and begin audio playback within 2 seconds.
2. IF the preview TTS request fails, THEN THE Voice_Selector SHALL invoke the `onPreviewError` callback with the voice ID and a descriptive error message, and SHALL NOT throw an exception.
3. THE Voice_Selector SHALL use the current session language when generating a Voice_Preview.

---

### Requirement 7: Voice Assignment and Profile Persistence

**User Story:** As a user, I want to assign specific voices to each wellness activity and have my choices saved, so that every session uses my preferred voices automatically.

#### Acceptance Criteria

1. THE Voice_Selector SHALL allow a user to assign a Murf AI voice ID to each Activity_Type via the `assignVoice(activityType, voiceId)` method.
2. THE Voice_Selector SHALL allow a user to set a fallback voice ID via the `setFallbackVoice(voiceId)` method that is used when no activity-specific voice is assigned.
3. WHEN a session ends, THE Voice_Selector SHALL persist the current Voice_Profile to the ProfileStore via `saveVoiceProfile(userId)`.
4. WHEN a session starts, THE Voice_Selector SHALL load the persisted Voice_Profile from the ProfileStore via `loadVoiceProfile(userId)` before the first TTS request.
5. THE Voice_Profile SHALL be serialisable to and from JSON without data loss (round-trip property).

---

### Requirement 8: Voice Resolution Priority

**User Story:** As the application, I want a deterministic voice selection order, so that every TTS request uses the most specific voice available.

#### Acceptance Criteria

1. WHEN TTS_Engine resolves a voice for a TTS request, THE TTS_Engine SHALL apply the following priority order: (1) explicit `voiceId` in TTSOptions, (2) activity-specific assignment from Voice_Profile, (3) fallback voice from Voice_Profile, (4) system default voice ID `murf-default`.
2. IF an Activity_Type is provided but has no assignment in the Voice_Profile, THEN THE TTS_Engine SHALL use the fallback voice ID from Voice_Profile.
3. IF neither an activity assignment nor a fallback voice is set, THEN THE TTS_Engine SHALL use the system default voice ID `murf-default`.

---

### Requirement 9: Multilingual TTS

**User Story:** As a Spanish-speaking user, I want wellness guidance delivered in Spanish, so that I can fully understand and benefit from the sessions.

#### Acceptance Criteria

1. WHEN the active Locale is `es`, THE TTS_Engine SHALL map the language to `es-ES` in all Murf_API requests.
2. WHEN the active Locale is `en`, THE TTS_Engine SHALL map the language to `en-US` in all Murf_API requests.
3. IF the active Locale is neither `en` nor `es`, THEN THE TTS_Engine SHALL default to `en-US` and invoke the `onUnsupportedLanguage` callback with the unsupported locale string.
4. WHEN the user switches Locale mid-session, THE ConversationEngine SHALL update the session language and all subsequent TTS requests SHALL use the new locale mapping.

---

### Requirement 10: Rate Limiting

**User Story:** As the application, I want all Murf AI requests to respect the API's concurrency limits, so that the account is not suspended and all users receive consistent service.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL enforce a maximum of 3 concurrent TTS requests to Murf_API at any time.
2. WHEN a TTS request is queued because the concurrency limit is reached, THE Rate_Limiter SHALL hold the request until a slot is available, without dropping it.
3. WHEN a TTS request completes or fails, THE Rate_Limiter SHALL release its concurrency slot immediately.
4. IF a TTS request waits more than 10 seconds for a Rate_Limiter slot, THEN THE Rate_Limiter SHALL cancel the request and invoke the `onTextFallback` callback.

---

### Requirement 11: Text Fallback Accessibility

**User Story:** As a user with audio unavailable, I want the wellness guidance text displayed on screen, so that I can still benefit from the session without audio.

#### Acceptance Criteria

1. WHEN `onTextFallback` is invoked, THE System SHALL display the full response text visibly in the UI within 200ms.
2. THE displayed fallback text SHALL meet WCAG 2.1 AA colour contrast requirements for the active theme.
3. WHEN audio becomes available again in a subsequent TTS call, THE System SHALL resume audio delivery and remove the fallback text display.

---

### Requirement 12: Next.js API Route Proxy

**User Story:** As a developer, I want all Murf AI calls routed through a Next.js API route, so that the API key is never exposed to the browser.

#### Acceptance Criteria

1. THE System SHALL implement a Next.js API route at `/api/murf/tts` that proxies TTS requests from the client to Murf_API, injecting the API key server-side.
2. THE System SHALL implement a Next.js API route at `/api/murf/voices` that proxies voice catalogue requests from the client to Murf_API, injecting the API key server-side.
3. WHEN a client request to `/api/murf/tts` or `/api/murf/voices` is received, THE System SHALL validate that the request originates from the same origin before forwarding it to Murf_API.
4. IF the same-origin check fails, THEN THE System SHALL return HTTP 403 and SHALL NOT forward the request to Murf_API.
5. THE `/api/murf/tts` route SHALL stream the Murf_API audio response back to the client without buffering the full audio in server memory.

---

### Requirement 13: Error Observability

**User Story:** As a developer, I want all Murf AI errors logged with context, so that I can diagnose integration issues in production.

#### Acceptance Criteria

1. WHEN Murf_API returns an error response, THE System SHALL log the HTTP status code, request type (TTS or catalogue), session ID, and timestamp to the server-side logger.
2. WHEN a WebSocket connection error occurs, THE WebSocket_Manager SHALL log the error code, reason, and session ID.
3. THE System SHALL never log the API key value in any log entry.
4. IF a TTS request triggers Text_Fallback, THEN THE System SHALL log the fallback event with the session ID and the reason (API error or rate-limit timeout).

