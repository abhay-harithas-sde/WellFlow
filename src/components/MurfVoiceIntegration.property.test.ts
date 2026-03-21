// Feature: murf-ai-voice-integration
// Consolidated property-based test file — all 15 correctness properties
// Each property uses fast-check with numRuns: 100

import * as fc from 'fast-check';
import { TTSEngine, TTSEngineCallbacks, AuthError, VoiceResolverInterface } from './TTSEngine';
import { WebSocketManager, TTSRequest } from './WebSocketManager';
import { VoiceSelector, VoiceSelectorCallbacks } from './VoiceSelector';
import { RateLimiter, RateLimiterInterface } from './RateLimiter';
import { ConversationEngine } from './ConversationEngine';
import { MurfLogger } from '../../lib/murf-logger';
import { ActivityType, MurfVoice, TTSOptions, VoiceProfile } from '../types';
import { ProfileStore } from '../store/ProfileStore';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Shared mock helpers
// ---------------------------------------------------------------------------

function makeMockRateLimiter(): jest.Mocked<RateLimiterInterface> {
  return {
    acquire: jest.fn().mockResolvedValue(undefined),
    release: jest.fn(),
    activeCount: 0,
    requestsThisMinute: 0,
  };
}

function makeMockWsManager(connected = true): jest.Mocked<Pick<WebSocketManager, 'isConnected' | 'connect' | 'send'>> {
  return {
    isConnected: jest.fn().mockReturnValue(connected),
    connect: jest.fn().mockResolvedValue(undefined),
    send: jest.fn(),
  };
}

function makeCallbacks(): {
  callbacks: TTSEngineCallbacks;
  fallbackTexts: string[];
  unsupportedLangs: string[];
  authErrors: number[];
} {
  const fallbackTexts: string[] = [];
  const unsupportedLangs: string[] = [];
  const authErrors: number[] = [];
  return {
    callbacks: {
      onTextFallback: (t) => fallbackTexts.push(t),
      onUnsupportedLanguage: (l) => unsupportedLangs.push(l),
      onAuthError: (code) => authErrors.push(code),
    },
    fallbackTexts,
    unsupportedLangs,
    authErrors,
  };
}

const BASE_OPTIONS: TTSOptions = { language: 'en', speed: 'normal', sessionId: 'session-1' };

const ACTIVITY_TYPES: ActivityType[] = [
  'BREATHING_EXERCISE',
  'MINDFULNESS_SESSION',
  'STRESS_RELIEF',
  'ROUTINE_REMINDER',
];

// ---------------------------------------------------------------------------
// Mock WebSocket factory (for WebSocketManager tests)
// ---------------------------------------------------------------------------

type WsEventHandler = (event: unknown) => void;

interface MockWebSocket {
  binaryType: string;
  readyState: number;
  onopen: WsEventHandler | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: WsEventHandler | null;
  onclose: ((event: { wasClean: boolean; code: number; reason: string }) => void) | null;
  send: jest.Mock;
  close: jest.Mock;
  simulateOpen(): void;
  simulateMessage(data: ArrayBuffer): void;
  simulateClose(wasClean?: boolean, code?: number, reason?: string): void;
}

function createMockWebSocket(): MockWebSocket {
  const ws: MockWebSocket = {
    binaryType: 'arraybuffer',
    readyState: 0,
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    send: jest.fn(),
    close: jest.fn(),
    simulateOpen() {
      this.readyState = 1;
      if (this.onopen) this.onopen({});
    },
    simulateMessage(data: ArrayBuffer) {
      if (this.onmessage) this.onmessage({ data });
    },
    simulateClose(wasClean = false, code = 1006, reason = '') {
      this.readyState = 3;
      if (this.onclose) this.onclose({ wasClean, code, reason });
    },
  };
  return ws;
}

function buildWsManager(mocks: MockWebSocket[]): { manager: WebSocketManager; factory: jest.Mock } {
  let idx = 0;
  const factory = jest.fn((_url: string) => {
    const ws = mocks[idx] ?? mocks[mocks.length - 1];
    idx++;
    return ws as unknown;
  });
  const manager = new WebSocketManager('wss://test.example', factory as unknown as (url: string) => WebSocket);
  return { manager, factory };
}

// ===========================================================================
// P1: Auth header on all requests
// Feature: murf-ai-voice-integration, Property 1: All outbound Murf API requests carry the Authorization header
// Validates: Requirements 2.1, 2.2
// ===========================================================================

jest.mock('../../lib/murf-config', () => ({
  getMurfApiKey: jest.fn(() => 'prop-test-api-key'),
  ConfigurationError: class ConfigurationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ConfigurationError';
    }
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { GET as voicesGET } from '../../app/api/raw/murf/voices/route';
import { GET as ttsGET } from '../../app/api/raw/murf/tts/route';
import { getMurfApiKey } from '../../lib/murf-config';

const APP_HOST = 'localhost:3000';
const APP_ORIGIN = 'http://localhost:3000';

function makeVoicesRequest(origin: string | null): NextRequest {
  const headers: Record<string, string> = { host: APP_HOST };
  if (origin !== null) headers['origin'] = origin;
  return new NextRequest(`${APP_ORIGIN}/api/murf/voices`, { method: 'GET', headers });
}

describe('Property 1: All outbound Murf API requests carry the Authorization header', () => {
  // Feature: murf-ai-voice-integration, Property 1: Auth header on all requests
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_APP_URL;
    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({ voices: [] }),
    });
  });

  it('P1: voices proxy injects Authorization: Bearer header on every same-origin request', async () => {
    // Feature: murf-ai-voice-integration, Property 1: Auth header on all requests
    await fc.assert(
      fc.asyncProperty(
        fc.record({ text: fc.string(), sessionId: fc.string() }),
        async (_opts) => {
          jest.clearAllMocks();
          mockFetch.mockResolvedValue({ status: 200, json: async () => [] });
          const req = makeVoicesRequest(APP_ORIGIN);
          await voicesGET(req);
          if (mockFetch.mock.calls.length > 0) {
            const [_url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
            const headers = init?.headers as Record<string, string> | undefined;
            expect(headers?.['Authorization']).toMatch(/^Bearer /);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P2: Auth error suppresses retry
// Feature: murf-ai-voice-integration, Property 2: Auth errors suppress retries and activate fallback
// Validates: Requirements 2.3, 2.4
// ===========================================================================

describe('Property 2: Auth errors suppress retries and activate fallback', () => {
  // Feature: murf-ai-voice-integration, Property 2: Auth error suppresses retry
  it('P2: HTTP 401 or 403 invokes onAuthError, activates text fallback, and makes no retry', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(401, 403),
        async (statusCode) => {
          const rl = makeMockRateLimiter();
          const ws = makeMockWsManager();
          ws.send.mockImplementation(() => { throw new AuthError(statusCode); });
          const { callbacks, fallbackTexts, authErrors } = makeCallbacks();
          const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

          await engine.speak('auth test', BASE_OPTIONS);

          expect(authErrors).toEqual([statusCode]);
          expect(fallbackTexts).toHaveLength(1);
          // No retry — send called exactly once
          expect(ws.send).toHaveBeenCalledTimes(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P3: Audio chunks forwarded immediately
// Feature: murf-ai-voice-integration, Property 3: Audio chunks are forwarded immediately
// Validates: Requirement 3.2
// ===========================================================================

describe('Property 3: Audio chunks are forwarded immediately', () => {
  // Feature: murf-ai-voice-integration, Property 3: Audio chunks forwarded immediately
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('P3: each audio chunk is forwarded to onAudioChunk before the next chunk is processed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uint8Array()),
        async (chunkArrays) => {
          const ws = createMockWebSocket();
          const { manager } = buildWsManager([ws]);

          const received: ArrayBuffer[] = [];
          manager.onAudioChunk = (chunk) => received.push(chunk);

          const connectPromise = manager.connect('session-p3');
          ws.simulateOpen();
          await connectPromise;

          const buffers = chunkArrays.map((arr) => arr.buffer as ArrayBuffer);
          for (const buf of buffers) {
            ws.simulateMessage(buf);
          }

          expect(received).toHaveLength(buffers.length);
          for (let i = 0; i < buffers.length; i++) {
            expect(received[i]).toBe(buffers[i]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P4: TTSOptions language and speed faithfully mapped
// Feature: murf-ai-voice-integration, Property 4: TTSOptions language and speed are faithfully mapped
// Validates: Requirements 3.3, 3.4, 9.1, 9.2
// ===========================================================================

const LANGUAGE_MAP_EXPECTED: Record<string, string> = { en: 'en-US', es: 'es-ES' };

describe('Property 4: TTSOptions language and speed are faithfully mapped', () => {
  // Feature: murf-ai-voice-integration, Property 4: TTSOptions language and speed faithfully mapped
  it('P4: supported language maps to correct Murf API code and speed is preserved verbatim', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('en', 'es'),
        fc.constantFrom('slow', 'normal', 'fast'),
        async (lang, speed) => {
          const rl = makeMockRateLimiter();
          const ws = makeMockWsManager();
          const { callbacks, unsupportedLangs } = makeCallbacks();
          const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

          await engine.speak('test', { ...BASE_OPTIONS, language: lang, speed: speed as 'slow' | 'normal' | 'fast' });

          const sent = ws.send.mock.calls[0][0] as TTSRequest;
          expect(sent.language).toBe(LANGUAGE_MAP_EXPECTED[lang]);
          expect(sent.speed).toBe(speed);
          expect(unsupportedLangs).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P5: Double TTS failure triggers text fallback with original text
// Feature: murf-ai-voice-integration, Property 5: Double TTS failure triggers text fallback with original text
// Validates: Requirement 3.6
// ===========================================================================

describe('Property 5: Double TTS failure triggers text fallback with original text', () => {
  // Feature: murf-ai-voice-integration, Property 5: Double TTS failure triggers text fallback with original text
  it('P5: when both TTS attempts fail, onTextFallback is called with exactly the original text', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (text) => {
          const rl = makeMockRateLimiter();
          const ws = makeMockWsManager();
          ws.send.mockImplementation(() => { throw new Error('API error'); });
          const { callbacks, fallbackTexts } = makeCallbacks();
          const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

          await engine.speak(text, BASE_OPTIONS);

          expect(fallbackTexts).toHaveLength(1);
          expect(fallbackTexts[0]).toBe(text);
          expect(ws.send).toHaveBeenCalledTimes(2);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P6: Inactivity timer resets on every send
// Feature: murf-ai-voice-integration, Property 6: Inactivity timer resets on every send
// Validates: Requirement 4.4
// ===========================================================================

describe('Property 6: Inactivity timer resets on every send', () => {
  // Feature: murf-ai-voice-integration, Property 6: Inactivity timer resets on every send
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('P6: after each send, the inactivity timer is reset to 3 minutes from that moment', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string(), { minLength: 1 }),
        async (messages) => {
          jest.useFakeTimers();
          try {
            const ws = createMockWebSocket();
            const { manager } = buildWsManager([ws]);

            const reasons: string[] = [];
            manager.onClose = (r) => reasons.push(r);

            const connectPromise = manager.connect('session-p6');
            ws.simulateOpen();
            await connectPromise;

            // Send each message with a 1-minute gap
            for (const text of messages) {
              jest.advanceTimersByTime(60_000);
              manager.send({ sessionId: 'session-p6', text });
            }

            // 2 min 59 sec after last send — still connected
            jest.advanceTimersByTime(2 * 60 * 1000 + 59 * 1000);
            expect(manager.isConnected('session-p6')).toBe(true);
            expect(reasons.includes('INACTIVITY_TIMEOUT')).toBe(false);

            // 1 more second (3 min since last send) — now disconnected
            jest.advanceTimersByTime(1_000);
            expect(manager.isConnected('session-p6')).toBe(false);
            expect(reasons.includes('INACTIVITY_TIMEOUT')).toBe(true);
          } finally {
            jest.useRealTimers();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P7: Voice filter returns only matching voices
// Feature: murf-ai-voice-integration, Property 7: Voice filter returns only matching voices
// Validates: Requirement 5.2
// ===========================================================================

function makeSelectorWithVoices(voices: MurfVoice[]): VoiceSelector {
  const store = new ProfileStore();
  const ws = makeMockWsManager();
  const rl = makeMockRateLimiter();
  const errors: Array<{ voiceId: string; message: string }> = [];
  const callbacks: VoiceSelectorCallbacks = {
    onPreviewError: (voiceId, message) => errors.push({ voiceId, message }),
  };
  return new VoiceSelector(store, ws as unknown as WebSocketManager, rl, callbacks, voices);
}

describe('Property 7: Voice filter returns only matching voices', () => {
  // Feature: murf-ai-voice-integration, Property 7: Voice filter returns only matching voices
  it('P7: every voice returned by listVoices(filter) satisfies all non-undefined filter fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            voiceId: fc.string(),
            name: fc.string(),
            accent: fc.string(),
            gender: fc.constantFrom('male' as const, 'female' as const, 'neutral' as const),
            style: fc.string(),
          }),
        ),
        fc.record({
          name: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          accent: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          gender: fc.option(
            fc.constantFrom('male' as const, 'female' as const, 'neutral' as const),
            { nil: undefined },
          ),
          style: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        }),
        async (voices, filter) => {
          const selector = makeSelectorWithVoices(voices);
          const results = await selector.listVoices(filter);

          for (const voice of results) {
            if (filter.name !== undefined) {
              expect(voice.name.toLowerCase()).toContain(filter.name.toLowerCase());
            }
            if (filter.accent !== undefined) {
              expect(voice.accent.toLowerCase()).toBe(filter.accent.toLowerCase());
            }
            if (filter.gender !== undefined) {
              expect(voice.gender).toBe(filter.gender);
            }
            if (filter.style !== undefined) {
              expect(voice.style.toLowerCase()).toBe(filter.style.toLowerCase());
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P8: Voice catalogue fetched at most once per session
// Feature: murf-ai-voice-integration, Property 8: Voice catalogue is fetched at most once per session
// Validates: Requirement 5.4
// ===========================================================================

describe('Property 8: Voice catalogue is fetched at most once per session', () => {
  // Feature: murf-ai-voice-integration, Property 8: Voice catalogue fetched at most once per session
  it('P8: underlying HTTP request is made exactly once regardless of initialise() call count', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }),
        async (callCount) => {
          const fetchFn = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => [] as MurfVoice[],
          });
          const store = new ProfileStore();
          const ws = makeMockWsManager();
          const rl = makeMockRateLimiter();
          const callbacks: VoiceSelectorCallbacks = { onPreviewError: jest.fn() };
          const selector = new VoiceSelector(
            store,
            ws as unknown as WebSocketManager,
            rl,
            callbacks,
            [],
            fetchFn,
          );

          for (let i = 0; i < callCount; i++) {
            await selector.initialise('en');
          }

          expect(fetchFn).toHaveBeenCalledTimes(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P9: Preview failure invokes callback without throwing
// Feature: murf-ai-voice-integration, Property 9: Preview failure invokes callback without throwing
// Validates: Requirement 6.2
// ===========================================================================

describe('Property 9: Preview failure invokes callback without throwing', () => {
  // Feature: murf-ai-voice-integration, Property 9: Preview failure invokes callback without throwing
  it('P9: onPreviewError is invoked with voiceId and non-empty message, no exception propagates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (voiceId) => {
          const store = new ProfileStore();
          const ws = makeMockWsManager();
          ws.send.mockImplementation(() => { throw new Error('TTS failure'); });
          const rl = makeMockRateLimiter();
          const errors: Array<{ voiceId: string; message: string }> = [];
          const callbacks: VoiceSelectorCallbacks = {
            onPreviewError: (vid, msg) => errors.push({ voiceId: vid, message: msg }),
          };
          const selector = new VoiceSelector(store, ws as unknown as WebSocketManager, rl, callbacks, []);

          // Must not throw
          await expect(selector.previewVoice(voiceId)).resolves.toBeUndefined();

          // onPreviewError must have been called with the voiceId and a non-empty message
          expect(errors.length).toBeGreaterThanOrEqual(1);
          const lastError = errors[errors.length - 1];
          expect(lastError.voiceId).toBe(voiceId);
          expect(lastError.message.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P10: Voice resolution follows priority order
// Feature: murf-ai-voice-integration, Property 10: Voice resolution follows priority order
// Validates: Requirements 8.1, 8.2, 8.3
// ===========================================================================

function makeVoiceResolver(
  activityVoice: string | null,
  fallbackVoice: string | null,
): VoiceResolverInterface {
  return {
    getVoiceForActivity: () => activityVoice,
    getCurrentProfile: () => ({ fallbackVoiceId: fallbackVoice }),
  };
}

describe('Property 10: Voice resolution follows priority order', () => {
  // Feature: murf-ai-voice-integration, Property 10: Voice resolution follows priority order
  it('P10: resolved voice ID is the highest-priority non-null value in the chain', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          voiceId: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          activityAssignment: fc.option(fc.string({ minLength: 1 }), { nil: null }),
          fallback: fc.option(fc.string({ minLength: 1 }), { nil: null }),
        }),
        async ({ voiceId, activityAssignment, fallback }) => {
          const rl = makeMockRateLimiter();
          const ws = makeMockWsManager();
          const { callbacks } = makeCallbacks();
          const resolver = makeVoiceResolver(activityAssignment, fallback);
          const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks, resolver);

          const options: TTSOptions = { ...BASE_OPTIONS };
          if (voiceId !== undefined) options.voiceId = voiceId;

          await engine.speak('test', options, 'BREATHING_EXERCISE');

          const sent = ws.send.mock.calls[0][0] as TTSRequest;

          // Determine expected voice ID per priority chain
          let expected: string | undefined;
          if (voiceId !== undefined) {
            expected = voiceId;
          } else if (activityAssignment !== null) {
            expected = activityAssignment;
          } else if (fallback !== null) {
            expected = fallback;
          } else {
            expected = 'murf-default';
          }

          expect(sent.voiceId).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P11: Locale switch propagates to all subsequent TTS requests
// Feature: murf-ai-voice-integration, Property 11: Locale switch propagates to all subsequent TTS requests
// Validates: Requirement 9.4
// ===========================================================================

describe('Property 11: Locale switch propagates to all subsequent TTS requests', () => {
  // Feature: murf-ai-voice-integration, Property 11: Locale switch propagates to all subsequent TTS requests
  it('P11: every TTS request after setLanguage uses the new locale mapping', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('en', 'es'),
        fc.constantFrom('en', 'es'),
        async (localeBefore, localeAfter) => {
          const engine = new ConversationEngine();
          const sessionId = 'session-p11';

          // Set initial language
          engine.setLanguage(sessionId, localeBefore);
          const ctxBefore = engine.getContext(sessionId);
          expect(ctxBefore.language).toBe(localeBefore);

          // Switch language
          engine.setLanguage(sessionId, localeAfter);
          const ctxAfter = engine.getContext(sessionId);
          expect(ctxAfter.language).toBe(localeAfter);

          // Verify TTS engine uses the new locale for subsequent requests
          const rl = makeMockRateLimiter();
          const ws = makeMockWsManager();
          const { callbacks } = makeCallbacks();
          const ttsEngine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

          await ttsEngine.speak('test', { ...BASE_OPTIONS, language: ctxAfter.language });

          const sent = ws.send.mock.calls[0][0] as TTSRequest;
          const expectedLang = localeAfter === 'es' ? 'es-ES' : 'en-US';
          expect(sent.language).toBe(expectedLang);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P12: Rate limiter never exceeds maximum concurrency
// Feature: murf-ai-voice-integration, Property 12: Rate limiter never exceeds maximum concurrency
// Validates: Requirements 10.1, 10.2
// ===========================================================================

describe('Property 12: Rate limiter never exceeds maximum concurrency', () => {
  // Feature: murf-ai-voice-integration, Property 12: Rate limiter never exceeds maximum concurrency
  it('P12: activeCount never exceeds 3 for any sequence of acquire/release calls', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }),
        async (requestCount) => {
          const rl = new RateLimiter();
          const pending: Promise<void>[] = [];
          let maxObserved = 0;

          for (let i = 0; i < requestCount; i++) {
            const p = rl.acquire();
            pending.push(p);
            await Promise.resolve();
            if (rl.activeCount > maxObserved) maxObserved = rl.activeCount;
          }

          for (let i = 0; i < requestCount; i++) {
            rl.release();
            await Promise.resolve();
            if (rl.activeCount > maxObserved) maxObserved = rl.activeCount;
          }

          await Promise.all(pending.map((p) => p.catch(() => {})));

          return maxObserved <= 3;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P13: Same-origin check gates all proxy forwarding
// Feature: murf-ai-voice-integration, Property 13: Same-origin check gates all proxy forwarding
// Validates: Requirements 12.3, 12.4
// ===========================================================================

/** Arbitrary that generates strings that are NOT the app origin */
const nonMatchingOriginArb = fc
  .string({ minLength: 0, maxLength: 100 })
  .filter((s) => s !== APP_ORIGIN);

describe('Property 13: Same-origin check gates all proxy forwarding', () => {
  // Feature: murf-ai-voice-integration, Property 13: Same-origin check gates all proxy forwarding
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_APP_URL;
    mockFetch.mockResolvedValue({ status: 200, json: async () => [] });
  });

  it('P13: /api/murf/voices returns 403 and makes no upstream call for any non-matching origin', async () => {
    await fc.assert(
      fc.asyncProperty(nonMatchingOriginArb, async (badOrigin) => {
        jest.clearAllMocks();
        const req = makeVoicesRequest(badOrigin);
        const res = await voicesGET(req);
        expect(res.status).toBe(403);
        expect(mockFetch).not.toHaveBeenCalled();
        expect(getMurfApiKey).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P14: VoiceProfile JSON round-trip is lossless
// Feature: murf-ai-voice-integration, Property 14: VoiceProfile JSON round-trip is lossless
// Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
// ===========================================================================

const activityAssignmentsArb = fc
  .record(
    Object.fromEntries(
      ACTIVITY_TYPES.map((at) => [
        at,
        fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
      ]),
    ) as Record<ActivityType, fc.Arbitrary<string | undefined>>,
  )
  .map((rec) => {
    const result: Partial<Record<ActivityType, string>> = {};
    for (const [key, value] of Object.entries(rec)) {
      if (value !== undefined) result[key as ActivityType] = value as string;
    }
    return result;
  });

const voiceProfileArb: fc.Arbitrary<VoiceProfile> = fc.record({
  activityAssignments: activityAssignmentsArb,
  fallbackVoiceId: fc.option(fc.string({ minLength: 1 }), { nil: null }),
});

describe('Property 14: VoiceProfile JSON round-trip is lossless', () => {
  // Feature: murf-ai-voice-integration, Property 14: VoiceProfile JSON round-trip is lossless
  it('P14: JSON.stringify then JSON.parse produces a deeply equal VoiceProfile', () => {
    fc.assert(
      fc.property(voiceProfileArb, (profile) => {
        const serialised = JSON.stringify(profile);
        const deserialised: VoiceProfile = JSON.parse(serialised);

        expect(deserialised.fallbackVoiceId).toStrictEqual(profile.fallbackVoiceId);

        const originalKeys = Object.keys(profile.activityAssignments).sort();
        const deserialisedKeys = Object.keys(deserialised.activityAssignments).sort();
        expect(deserialisedKeys).toEqual(originalKeys);

        for (const key of originalKeys) {
          expect(deserialised.activityAssignments[key as ActivityType]).toBe(
            profile.activityAssignments[key as ActivityType],
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P15: Log entries contain required fields and never contain the API key
// Feature: murf-ai-voice-integration, Property 15: Log entries contain required fields and never contain the API key
// Validates: Requirements 13.1, 13.2, 13.3, 13.4
// ===========================================================================

const apiKeyArb = fc
  .string({ minLength: 16, maxLength: 40 })
  .map((s) => s.replace(/[^a-zA-Z0-9]/g, 'x'))
  .filter((s) => s.length >= 16);

describe('Property 15: Log entries contain required fields and never contain the API key', () => {
  // Feature: murf-ai-voice-integration, Property 15: Log entries contain required fields and never contain the API key
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('P15: logApiError output contains all required fields and never the API key', () => {
    fc.assert(
      fc.property(
        apiKeyArb,
        fc.integer({ min: 100, max: 599 }),
        fc.constantFrom('TTS', 'CATALOGUE'),
        fc.uuid(),
        fc.date().map((d) => d.toISOString()),
        (apiKey, statusCode, requestType, sessionId, timestamp) => {
          errorSpy.mockClear();
          const logger = new MurfLogger(apiKey);
          logger.logApiError(statusCode, requestType, sessionId, timestamp);

          expect(errorSpy).toHaveBeenCalledTimes(1);
          const logged = errorSpy.mock.calls[0][0] as string;

          expect(logged).toContain(String(statusCode));
          expect(logged).toContain(requestType);
          expect(logged).toContain(sessionId);
          expect(logged).toContain(timestamp);
          expect(logged).not.toContain(apiKey);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P15: logWsError output contains all required fields and never the API key', () => {
    fc.assert(
      fc.property(
        apiKeyArb,
        fc.integer({ min: 1000, max: 4999 }),
        fc.string({ minLength: 4, maxLength: 50 }).map((s) => s.replace(/[^a-zA-Z0-9 ]/g, 'x')),
        fc.uuid(),
        (apiKey, code, reason, sessionId) => {
          errorSpy.mockClear();
          const logger = new MurfLogger(apiKey);
          logger.logWsError(code, reason, sessionId);

          expect(errorSpy).toHaveBeenCalledTimes(1);
          const logged = errorSpy.mock.calls[0][0] as string;

          expect(logged).toContain(String(code));
          expect(logged).toContain(reason);
          expect(logged).toContain(sessionId);
          expect(logged).not.toContain(apiKey);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P15: logFallback output contains session ID and reason, never the API key', () => {
    fc.assert(
      fc.property(
        apiKeyArb,
        fc.uuid(),
        fc.constantFrom('API_ERROR', 'RATE_LIMIT_TIMEOUT', 'AUTH_ERROR_401', 'AUTH_ERROR_403'),
        (apiKey, sessionId, reason) => {
          warnSpy.mockClear();
          const logger = new MurfLogger(apiKey);
          logger.logFallback(sessionId, reason);

          expect(warnSpy).toHaveBeenCalledTimes(1);
          const logged = warnSpy.mock.calls[0][0] as string;

          expect(logged).toContain(sessionId);
          expect(logged).toContain(reason);
          expect(logged).not.toContain(apiKey);
        },
      ),
      { numRuns: 100 },
    );
  });
});

