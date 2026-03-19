// Feature: wellflow-voice-wellness-assistant
// Unit tests for TTSEngine — speak / setSpeed behavior
// Requirements: 3.1, 3.2, 3.3, 3.6, 10.4, 11.3

import { TTSEngine, TTSEngineCallbacks } from './TTSEngine';
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

function makeCallbacks(): { callbacks: TTSEngineCallbacks; fallbackTexts: string[]; unsupportedLangs: string[] } {
  const fallbackTexts: string[] = [];
  const unsupportedLangs: string[] = [];
  const callbacks: TTSEngineCallbacks = {
    onTextFallback: (t) => fallbackTexts.push(t),
    onUnsupportedLanguage: (l) => unsupportedLangs.push(l),
  };
  return { callbacks, fallbackTexts, unsupportedLangs };
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
    expect(sent.language).toBe('en');
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
  it('passes supported language through unchanged', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks, unsupportedLangs } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Hola', { ...BASE_OPTIONS, language: 'es' });

    const sent = ws.send.mock.calls[0][0] as TTSRequest;
    expect(sent.language).toBe('es');
    expect(unsupportedLangs).toHaveLength(0);
  });

  it('defaults to English and calls onUnsupportedLanguage for unknown language', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks, unsupportedLangs } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Hello', { ...BASE_OPTIONS, language: 'xx' });

    const sent = ws.send.mock.calls[0][0] as TTSRequest;
    expect(sent.language).toBe('en');
    expect(unsupportedLangs).toEqual(['xx']);
  });

  it.each(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'])(
    'accepts supported language %s without fallback',
    async (lang) => {
      const rl = makeMockRateLimiter();
      const ws = makeMockWsManager();
      const { callbacks, unsupportedLangs } = makeCallbacks();
      const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

      await engine.speak('text', { ...BASE_OPTIONS, language: lang });

      expect(unsupportedLangs).toHaveLength(0);
      const sent = ws.send.mock.calls[0][0] as TTSRequest;
      expect(sent.language).toBe(lang);
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
// Property-Based Tests
// ---------------------------------------------------------------------------

import * as fc from 'fast-check';

// Feature: wellflow-voice-wellness-assistant, Property 7: TTS language consistency
// Validates: Requirements 3.3, 10.1, 10.3

const SUPPORTED_LANGS = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'] as const;

describe('TTSEngine — Property 7: TTS language consistency', () => {
  it('supported language: sent language matches exactly and onUnsupportedLanguage is NOT called', async () => {
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
          expect(sent.language).toBe(lang);
          expect(unsupportedLangs).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('unsupported language: sent language is "en" and onUnsupportedLanguage IS called with original language', async () => {
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
          expect(sent.language).toBe('en');
          expect(unsupportedLangs).toContain(lang);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: wellflow-voice-wellness-assistant, Property 28: TTS speed setting propagation
// Validates: Requirements 11.3

const SPEED_VALUES = ['slow', 'normal', 'fast'] as const;
type SpeedValue = typeof SPEED_VALUES[number];

describe('TTSEngine — Property 28: TTS speed setting propagation', () => {
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

// Feature: wellflow-voice-wellness-assistant, Property 26: Multilingual TTS support
// Validates: Requirements 10.2

describe('TTSEngine — Property 26: Multilingual TTS support', () => {
  it('each supported language is sent as-is without triggering unsupported language callback', async () => {
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
          expect(sent.language).toBe(lang);
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

  it('calls onUnsupportedLanguage and falls back to English for unsupported language', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks, unsupportedLangs } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Hello', { ...BASE_OPTIONS, language: 'zz' });

    expect(unsupportedLangs).toEqual(['zz']);
    const sent = ws.send.mock.calls[0][0] as TTSRequest;
    expect(sent.language).toBe('en');
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
