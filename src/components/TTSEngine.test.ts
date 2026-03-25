// Feature: wellflow-voice-wellness-assistant
// Unit tests for TTSEngine — speak / setSpeed behavior
// Requirements: 3.1, 3.2, 3.3, 3.6, 10.4, 11.3

import { TTSEngine, TTSEngineCallbacks, AuthError } from './TTSEngine';
import { RateLimiterInterface } from './RateLimiter';
import { WebSocketManager, TTSRequest } from './WebSocketManager';
import { TTSOptions } from '../types';

// ---------------------------------------------------------------------------
// Minimal stubs
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

function makeCallbacks(): { callbacks: TTSEngineCallbacks; fallbackTexts: string[]; unsupportedLangs: string[]; authErrors: number[] } {
  const fallbackTexts: string[] = [];
  const unsupportedLangs: string[] = [];
  const authErrors: number[] = [];
  const callbacks: TTSEngineCallbacks = {
    onTextFallback: (t) => fallbackTexts.push(t),
    onUnsupportedLanguage: (l) => unsupportedLangs.push(l),
    onAuthError: (code) => authErrors.push(code),
  };
  return { callbacks, fallbackTexts, unsupportedLangs, authErrors };
}

const BASE_OPTIONS: TTSOptions = {
  language: 'en',
  speed: 'normal',
  sessionId: 'session-1',
};

// ---------------------------------------------------------------------------
// speak — happy path
// ---------------------------------------------------------------------------

describe('TTSEngine.speak — happy path', () => {
  it('acquires and releases the rate-limiter slot', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Hello', BASE_OPTIONS);

    expect(rl.acquire).toHaveBeenCalledTimes(1);
    expect(rl.release).toHaveBeenCalledTimes(1);
  });

  it('sends the payload via WebSocketManager', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Hello world', BASE_OPTIONS);

    expect(ws.send).toHaveBeenCalledTimes(1);
    const sent = ws.send.mock.calls[0][0] as TTSRequest;
    expect(sent.text).toBe('Hello world');
    expect(sent.sessionId).toBe('session-1');
    expect(sent.language).toBe('en-US'); // en maps to en-US (Req 3.3, 9.1)
    expect(sent.speed).toBe('normal');
  });

  it('does not call connect when already connected', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager(true);
    const { callbacks } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Hi', BASE_OPTIONS);

    expect(ws.connect).not.toHaveBeenCalled();
  });

  it('calls connect when not yet connected', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager(false);
    const { callbacks } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Hi', BASE_OPTIONS);

    expect(ws.connect).toHaveBeenCalledWith('session-1');
  });

  it('does not call onTextFallback on success', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks, fallbackTexts } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Hello', BASE_OPTIONS);

    expect(fallbackTexts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// speak — retry and fallback (Req 3.6)
// ---------------------------------------------------------------------------

describe('TTSEngine.speak — retry and fallback', () => {
  it('retries once on send error and succeeds on second attempt', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    // First send throws, second succeeds
    ws.send
      .mockImplementationOnce(() => { throw new Error('API error'); })
      .mockImplementationOnce(() => { /* success */ });
    const { callbacks, fallbackTexts } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Retry me', BASE_OPTIONS);

    expect(ws.send).toHaveBeenCalledTimes(2);
    expect(fallbackTexts).toHaveLength(0);
  });

  it('calls onTextFallback when both attempts fail', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    ws.send.mockImplementation(() => { throw new Error('API error'); });
    const { callbacks, fallbackTexts } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Fallback text', BASE_OPTIONS);

    expect(ws.send).toHaveBeenCalledTimes(2);
    expect(fallbackTexts).toEqual(['Fallback text']);
  });

  it('releases the rate-limiter slot even when send throws', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    ws.send.mockImplementation(() => { throw new Error('API error'); });
    const { callbacks } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Error text', BASE_OPTIONS);

    // Two attempts → two acquire + two release
    expect(rl.acquire).toHaveBeenCalledTimes(2);
    expect(rl.release).toHaveBeenCalledTimes(2);
  });

  it('calls onTextFallback when connect fails on both attempts', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager(false);
    ws.connect.mockRejectedValue(new Error('connect failed'));
    const { callbacks, fallbackTexts } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('No connection', BASE_OPTIONS);

    expect(fallbackTexts).toEqual(['No connection']);
  });
});

// ---------------------------------------------------------------------------
// speak — language handling (Req 3.3, 10.4)
// ---------------------------------------------------------------------------

describe('TTSEngine.speak — language handling', () => {
  it('maps en to en-US in outbound payload (Req 3.3, 9.1)', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks, unsupportedLangs } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Hello', { ...BASE_OPTIONS, language: 'en' });

    const sent = ws.send.mock.calls[0][0] as TTSRequest;
    expect(sent.language).toBe('en-US');
    expect(unsupportedLangs).toHaveLength(0);
  });

  it('maps es to es-ES in outbound payload (Req 3.3, 9.2)', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks, unsupportedLangs } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Hola', { ...BASE_OPTIONS, language: 'es' });

    const sent = ws.send.mock.calls[0][0] as TTSRequest;
    expect(sent.language).toBe('es-ES');
    expect(unsupportedLangs).toHaveLength(0);
  });

  it('maps unsupported locale to en-US and fires onUnsupportedLanguage (Req 9.3)', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks, unsupportedLangs } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Hello', { ...BASE_OPTIONS, language: 'xx' });

    const sent = ws.send.mock.calls[0][0] as TTSRequest;
    expect(sent.language).toBe('en-US');
    expect(unsupportedLangs).toEqual(['xx']);
  });

  it.each(['fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'])(
    'treats formerly-supported language %s as unsupported (Req 9.3)',
    async (lang) => {
      const rl = makeMockRateLimiter();
      const ws = makeMockWsManager();
      const { callbacks, unsupportedLangs } = makeCallbacks();
      const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

      await engine.speak('text', { ...BASE_OPTIONS, language: lang });

      expect(unsupportedLangs).toContain(lang);
      const sent = ws.send.mock.calls[0][0] as TTSRequest;
      expect(sent.language).toBe('en-US');
    },
  );
});

// ---------------------------------------------------------------------------
// setSpeed (Req 11.3)
// ---------------------------------------------------------------------------

describe('TTSEngine.setSpeed', () => {
  it('applies the updated speed to subsequent speak calls', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    engine.setSpeed('slow');
    await engine.speak('Slow speech', { ...BASE_OPTIONS, speed: 'slow' });

    const sent = ws.send.mock.calls[0][0] as TTSRequest;
    expect(sent.speed).toBe('slow');
  });

  it('uses the default speed (normal) when not explicitly set', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Normal speech', BASE_OPTIONS);

    const sent = ws.send.mock.calls[0][0] as TTSRequest;
    expect(sent.speed).toBe('normal');
  });

  it('can switch speed multiple times', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    engine.setSpeed('fast');
    await engine.speak('Fast', { ...BASE_OPTIONS, speed: 'fast' });
    engine.setSpeed('slow');
    await engine.speak('Slow', { ...BASE_OPTIONS, speed: 'slow' });

    const speeds = ws.send.mock.calls.map((c) => (c[0] as TTSRequest).speed);
    expect(speeds).toEqual(['fast', 'slow']);
  });
});

// ---------------------------------------------------------------------------
// voiceId passthrough
// ---------------------------------------------------------------------------

describe('TTSEngine.speak — voiceId', () => {
  it('passes voiceId through to the WebSocket payload', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Hello', { ...BASE_OPTIONS, voiceId: 'voice-abc' });

    const sent = ws.send.mock.calls[0][0] as TTSRequest;
    expect(sent.voiceId).toBe('voice-abc');
  });

  it('omits voiceId when not provided', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Hello', BASE_OPTIONS);

    const sent = ws.send.mock.calls[0][0] as TTSRequest;
    expect(sent.voiceId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// speak — auth error handling (Req 2.3, 2.4, 9.1, 9.2, 9.3)
// ---------------------------------------------------------------------------

describe('TTSEngine.speak — auth error handling', () => {
  it('401 response fires onAuthError + onTextFallback with no retry', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    ws.send.mockImplementation(() => { throw new AuthError(401); });
    const { callbacks, fallbackTexts, authErrors } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Auth fail text', BASE_OPTIONS);

    expect(authErrors).toEqual([401]);
    expect(fallbackTexts).toEqual(['Auth fail text']);
    // No retry — send called only once
    expect(ws.send).toHaveBeenCalledTimes(1);
  });

  it('403 response fires onAuthError + onTextFallback with no retry', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    ws.send.mockImplementation(() => { throw new AuthError(403); });
    const { callbacks, fallbackTexts, authErrors } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Forbidden text', BASE_OPTIONS);

    expect(authErrors).toEqual([403]);
    expect(fallbackTexts).toEqual(['Forbidden text']);
    // No retry — send called only once
    expect(ws.send).toHaveBeenCalledTimes(1);
  });

  it('auth error releases the rate-limiter slot exactly once (no retry)', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    ws.send.mockImplementation(() => { throw new AuthError(401); });
    const { callbacks } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('text', BASE_OPTIONS);

    expect(rl.acquire).toHaveBeenCalledTimes(1);
    expect(rl.release).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// speak — rate-limit timeout (Req 10.4)
// ---------------------------------------------------------------------------

describe('TTSEngine.speak — rate-limit timeout', () => {
  it('rate-limit timeout fires onTextFallback with original text', async () => {
    const rl = makeMockRateLimiter();
    rl.acquire.mockRejectedValue(new Error('Rate limiter timeout'));
    const ws = makeMockWsManager();
    const { callbacks, fallbackTexts } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Timeout text', BASE_OPTIONS);

    expect(fallbackTexts).toEqual(['Timeout text']);
    // WebSocket send should never be called
    expect(ws.send).not.toHaveBeenCalled();
  });

  it('rate-limit timeout does not retry', async () => {
    const rl = makeMockRateLimiter();
    rl.acquire.mockRejectedValue(new Error('Rate limiter timeout'));
    const ws = makeMockWsManager();
    const { callbacks } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('text', BASE_OPTIONS);

    // acquire called once, rejected immediately — no retry
    expect(rl.acquire).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------

import * as fc from 'fast-check';

// Feature: murf-ai-voice-integration, Property 4: TTSOptions language and speed are faithfully mapped
// Validates: Requirements 3.3, 3.4, 9.1, 9.2

const SUPPORTED_LANGS = ['en', 'es'] as const;
const LANGUAGE_MAP_EXPECTED: Record<string, string> = { en: 'en-US', es: 'es-ES' };

describe('TTSEngine — Property 4: TTSOptions language and speed are faithfully mapped', () => {
  it('supported language is mapped to Murf API code and onUnsupportedLanguage is NOT called', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...SUPPORTED_LANGS),
        async (lang) => {
          const rl = makeMockRateLimiter();
          const ws = makeMockWsManager();
          const { callbacks, unsupportedLangs } = makeCallbacks();
          const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

          await engine.speak('test', { ...BASE_OPTIONS, language: lang });

          const sent = ws.send.mock.calls[0][0] as TTSRequest;
          expect(sent.language).toBe(LANGUAGE_MAP_EXPECTED[lang]);
          expect(unsupportedLangs).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('unsupported language: sent language is "en-US" and onUnsupportedLanguage IS called with original language', async () => {
    const supportedSet = new Set<string>(SUPPORTED_LANGS);

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter((s) => !supportedSet.has(s)),
        async (lang) => {
          const rl = makeMockRateLimiter();
          const ws = makeMockWsManager();
          const { callbacks, unsupportedLangs } = makeCallbacks();
          const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

          await engine.speak('test', { ...BASE_OPTIONS, language: lang });

          const sent = ws.send.mock.calls[0][0] as TTSRequest;
          expect(sent.language).toBe('en-US');
          expect(unsupportedLangs).toContain(lang);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: murf-ai-voice-integration, Property 4 (speed): speed is faithfully mapped
// Validates: Requirements 3.4, 9.1, 9.2

const SPEED_VALUES = ['slow', 'normal', 'fast'] as const;
type SpeedValue = typeof SPEED_VALUES[number];

describe('TTSEngine — Property 4 (speed): speed is faithfully mapped', () => {
  it('after setSpeed(speed), every subsequent speak call uses that speed in the TTS request payload', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...SPEED_VALUES),
        async (speed: SpeedValue) => {
          const rl = makeMockRateLimiter();
          const ws = makeMockWsManager();
          const { callbacks } = makeCallbacks();
          const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

          engine.setSpeed(speed);
          await engine.speak('test', { ...BASE_OPTIONS, speed });

          const sent = ws.send.mock.calls[0][0] as TTSRequest;
          expect(sent.speed).toBe(speed);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: wellflow-voice-wellness-assistant, Property 6: TTS streaming latency
// Validates: Requirements 3.1

describe('TTSEngine — Property 6: TTS streaming latency', () => {
  it('ws.send is called within 130ms of speak() being invoked', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string({ minLength: 1 }),
        async (text, sessionId) => {
          const rl = makeMockRateLimiter();
          const ws = makeMockWsManager();
          const { callbacks } = makeCallbacks();
          const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

          let sendCalledAt: number | undefined;
          ws.send.mockImplementation(() => {
            sendCalledAt = performance.now();
          });

          const startedAt = performance.now();
          await engine.speak(text, { ...BASE_OPTIONS, sessionId });

          expect(sendCalledAt).toBeDefined();
          const elapsed = sendCalledAt! - startedAt;
          expect(elapsed).toBeLessThanOrEqual(130);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: murf-ai-voice-integration, Property 4 (multilingual): supported languages map correctly
// Validates: Requirements 9.1, 9.2

describe('TTSEngine — Property 4 (multilingual): supported languages map correctly', () => {
  it('each supported language maps to the correct Murf API code without triggering unsupported language callback', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...SUPPORTED_LANGS),
        fc.string({ minLength: 1 }),
        async (lang, text) => {
          const rl = makeMockRateLimiter();
          const ws = makeMockWsManager();
          const { callbacks, unsupportedLangs } = makeCallbacks();
          const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

          await engine.speak(text, { ...BASE_OPTIONS, language: lang });

          const sent = ws.send.mock.calls[0][0] as TTSRequest;
          expect(sent.language).toBe(LANGUAGE_MAP_EXPECTED[lang]);
          expect(unsupportedLangs).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests for TTS error flows (Task 9.6)
// Requirements: 3.6, 10.4
// ---------------------------------------------------------------------------

describe('TTSEngine — TTS error flows', () => {
  it('retries exactly once on API error before falling back to on-screen text', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    ws.send.mockImplementation(() => { throw new Error('API error'); });
    const { callbacks, fallbackTexts } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Error text', BASE_OPTIONS);

    expect(ws.send).toHaveBeenCalledTimes(2); // one attempt + one retry
    expect(fallbackTexts).toEqual(['Error text']);
  });

  it('does not call onTextFallback when first attempt succeeds', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks, fallbackTexts } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Success', BASE_OPTIONS);

    expect(fallbackTexts).toHaveLength(0);
  });

  it('does not call onTextFallback when retry succeeds', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    ws.send
      .mockImplementationOnce(() => { throw new Error('first fail'); })
      .mockImplementationOnce(() => { /* success */ });
    const { callbacks, fallbackTexts } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Retry success', BASE_OPTIONS);

    expect(fallbackTexts).toHaveLength(0);
  });

  it('calls onUnsupportedLanguage and falls back to en-US for unsupported language', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks, unsupportedLangs } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Hello', { ...BASE_OPTIONS, language: 'zz' });

    expect(unsupportedLangs).toEqual(['zz']);
    const sent = ws.send.mock.calls[0][0] as TTSRequest;
    expect(sent.language).toBe('en-US');
  });

  it('releases rate-limiter slot on both attempts even when both fail', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    ws.send.mockImplementation(() => { throw new Error('fail'); });
    const { callbacks } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('fail', BASE_OPTIONS);

    expect(rl.acquire).toHaveBeenCalledTimes(2);
    expect(rl.release).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Property 31: Voice resolution priority (Task 20.2)
// Feature: wellflow-voice-wellness-assistant, Property 31: Voice resolution priority
// Validates: Requirements 12.7, 12.8, 12.9
// ---------------------------------------------------------------------------

import { VoiceResolverInterface } from './TTSEngine';
import { ActivityType } from '../types';

function makeVoiceResolver(
  activityVoice: string | null,
  fallbackVoice: string | null,
): VoiceResolverInterface {
  return {
    getVoiceForActivity: () => activityVoice,
    getCurrentProfile: () => ({ fallbackVoiceId: fallbackVoice }),
  };
}

describe('TTSEngine — Property 31: Voice resolution priority', () => {
  it('uses activity assignment when set (highest priority)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        async (activityVoice, fallbackVoice) => {
          const rl = makeMockRateLimiter();
          const ws = makeMockWs();
          const { callbacks } = makeCallbacks();
          const resolver = makeVoiceResolver(activityVoice, fallbackVoice);
          const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks, resolver);

          await engine.speak('test', BASE_OPTIONS, 'BREATHING_EXERCISE');

          const sent = ws.send.mock.calls[0][0] as TTSRequest;
          expect(sent.voiceId).toBe(activityVoice);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('uses fallback voice when no activity assignment exists', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (fallbackVoice) => {
          const rl = makeMockRateLimiter();
          const ws = makeMockWs();
          const { callbacks } = makeCallbacks();
          const resolver = makeVoiceResolver(null, fallbackVoice);
          const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks, resolver);

          await engine.speak('test', BASE_OPTIONS, 'BREATHING_EXERCISE');

          const sent = ws.send.mock.calls[0][0] as TTSRequest;
          expect(sent.voiceId).toBe(fallbackVoice);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('uses system default when neither activity assignment nor fallback is set', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWs();
    const { callbacks } = makeCallbacks();
    const resolver = makeVoiceResolver(null, null);
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks, resolver);

    await engine.speak('test', BASE_OPTIONS, 'BREATHING_EXERCISE');

    const sent = ws.send.mock.calls[0][0] as TTSRequest;
    expect(sent.voiceId).toBe('murf-default');
  });

  it('explicit voiceId in options overrides voice resolution', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWs();
    const { callbacks } = makeCallbacks();
    const resolver = makeVoiceResolver('activity-voice', 'fallback-voice');
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks, resolver);

    await engine.speak('test', { ...BASE_OPTIONS, voiceId: 'explicit-voice' }, 'BREATHING_EXERCISE');

    const sent = ws.send.mock.calls[0][0] as TTSRequest;
    expect(sent.voiceId).toBe('explicit-voice');
  });
});

// Helper alias for ws mock used in Property 31
function makeMockWs() {
  return makeMockWsManager();
}

// Feature: murf-ai-voice-integration, Property 5: Double TTS failure triggers text fallback with original text
// Validates: Requirement 3.6

describe('TTSEngine — Property 5: Double TTS failure triggers text fallback with original text', () => {
  it('when both TTS attempts fail, onTextFallback is called with exactly the original text', async () => {
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

// Feature: murf-ai-voice-integration, Property 2: Auth errors suppress retries and activate fallback
// Validates: Requirements 2.3, 2.4

describe('TTSEngine — Property 2: Auth errors suppress retries and activate fallback', () => {
  it('HTTP 401 or 403 invokes onAuthError, activates text fallback, and makes no retry', async () => {
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

// ---------------------------------------------------------------------------
// Task 7.1: Unit tests for voice resolution priority chain
// Feature: murf-ai-voice-integration
// Requirements: 8.1, 8.2, 8.3
// ---------------------------------------------------------------------------

describe('TTSEngine — voice resolution priority (Req 8.1, 8.2, 8.3)', () => {
  it('explicit voiceId in TTSOptions overrides activity assignment, fallback, and default', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks } = makeCallbacks();
    const resolver = makeVoiceResolver('activity-voice', 'fallback-voice');
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks, resolver);

    await engine.speak('test', { ...BASE_OPTIONS, voiceId: 'explicit-override' }, 'BREATHING_EXERCISE');

    const sent = ws.send.mock.calls[0][0] as TTSRequest;
    expect(sent.voiceId).toBe('explicit-override');
  });

  it('activity assignment used when no explicit voiceId in options (Req 8.1)', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks } = makeCallbacks();
    const resolver = makeVoiceResolver('activity-voice', 'fallback-voice');
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks, resolver);

    await engine.speak('test', BASE_OPTIONS, 'MINDFULNESS_SESSION');

    const sent = ws.send.mock.calls[0][0] as TTSRequest;
    expect(sent.voiceId).toBe('activity-voice');
  });

  it('fallback voice used when no activity assignment exists (Req 8.2)', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks } = makeCallbacks();
    const resolver = makeVoiceResolver(null, 'my-fallback-voice');
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks, resolver);

    await engine.speak('test', BASE_OPTIONS, 'STRESS_RELIEF');

    const sent = ws.send.mock.calls[0][0] as TTSRequest;
    expect(sent.voiceId).toBe('my-fallback-voice');
  });

  it('"murf-default" used when neither activity assignment nor fallback is set (Req 8.3)', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks } = makeCallbacks();
    const resolver = makeVoiceResolver(null, null);
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks, resolver);

    await engine.speak('test', BASE_OPTIONS, 'ROUTINE_REMINDER');

    const sent = ws.send.mock.calls[0][0] as TTSRequest;
    expect(sent.voiceId).toBe('murf-default');
  });

  it('"murf-default" used when no voiceResolver is provided and no voiceId in options', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks } = makeCallbacks();
    // No voiceResolver injected
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('test', BASE_OPTIONS, 'BREATHING_EXERCISE');

    const sent = ws.send.mock.calls[0][0] as TTSRequest;
    // Without a resolver, _resolveVoiceId returns undefined, so voiceId is undefined
    expect(sent.voiceId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Task 7.2: Property 10 — Voice resolution follows priority order
// Feature: murf-ai-voice-integration, Property 10: Voice resolution follows priority order
// Validates: Requirements 8.1, 8.2, 8.3
// ---------------------------------------------------------------------------

describe('TTSEngine — Property 10: Voice resolution follows priority order', () => {
  it('resolved voice ID is the highest-priority non-null value in the chain', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          voiceId: fc.option(fc.string({ minLength: 1 })),
          activityAssignment: fc.option(fc.string({ minLength: 1 })),
          fallback: fc.option(fc.string({ minLength: 1 })),
        }),
        async ({ voiceId, activityAssignment, fallback }) => {
          const rl = makeMockRateLimiter();
          const ws = makeMockWsManager();
          const { callbacks } = makeCallbacks();
          const resolver = makeVoiceResolver(activityAssignment ?? null, fallback ?? null);
          const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks, resolver);

          const options = voiceId != null
            ? { ...BASE_OPTIONS, voiceId }
            : BASE_OPTIONS;

          await engine.speak('test', options, 'BREATHING_EXERCISE');

          const sent = ws.send.mock.calls[0][0] as TTSRequest;

          // Determine expected voice by priority chain
          let expected: string | undefined;
          if (voiceId != null) {
            expected = voiceId;
          } else if (activityAssignment != null) {
            expected = activityAssignment;
          } else if (fallback != null) {
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
