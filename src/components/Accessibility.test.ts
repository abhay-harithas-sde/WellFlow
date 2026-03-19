// Feature: wellflow-voice-wellness-assistant
// Tests for accessibility features — Requirements 11.1, 11.2, 11.4

import { VoiceInputHandler, VoiceInputHandlerCallbacks, SpeechRecognitionFactory } from './VoiceInputHandler';
import { TTSEngine, TTSEngineCallbacks } from './TTSEngine';
import { RateLimiterInterface } from './RateLimiter';
import { WebSocketManager, TTSRequest } from './WebSocketManager';
import { TTSOptions } from '../types';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Helpers — VoiceInputHandler
// ---------------------------------------------------------------------------

function makeVIHCallbacks(): { callbacks: VoiceInputHandlerCallbacks; transcripts: string[]; errors: string[] } {
  const transcripts: string[] = [];
  const errors: string[] = [];
  const callbacks: VoiceInputHandlerCallbacks = {
    onSpeechStart: () => {},
    onSpeechEnd: (t) => transcripts.push(t),
    onError: (e) => errors.push(e),
  };
  return { callbacks, transcripts, errors };
}

interface MockRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: { results: { length: number; [i: number]: { isFinal: boolean; [j: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: jest.Mock;
  stop: jest.Mock;
  abort: jest.Mock;
}

function makeMockRecognition(): MockRecognition {
  return {
    continuous: false,
    interimResults: false,
    lang: '',
    onstart: null,
    onresult: null,
    onend: null,
    onerror: null,
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
  };
}

function makeFactory(rec: MockRecognition): SpeechRecognitionFactory {
  return () => rec as unknown as ReturnType<SpeechRecognitionFactory>;
}

// ---------------------------------------------------------------------------
// Helpers — TTSEngine
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

function makeTTSCallbacks(): { callbacks: TTSEngineCallbacks; fallbackTexts: string[]; unsupportedLangs: string[] } {
  const fallbackTexts: string[] = [];
  const unsupportedLangs: string[] = [];
  const callbacks: TTSEngineCallbacks = {
    onTextFallback: (t) => fallbackTexts.push(t),
    onUnsupportedLanguage: (l) => unsupportedLangs.push(l),
  };
  return { callbacks, fallbackTexts, unsupportedLangs };
}

const BASE_TTS_OPTIONS: TTSOptions = {
  language: 'en',
  speed: 'normal',
  sessionId: 'session-1',
};

// ---------------------------------------------------------------------------
// Unit tests — VoiceInputHandler text fallback (Req 11.1, 11.2)
// ---------------------------------------------------------------------------

describe('VoiceInputHandler — text fallback mode', () => {
  it('textFallbackMode is false by default', () => {
    const { callbacks } = makeVIHCallbacks();
    const rec = makeMockRecognition();
    const handler = new VoiceInputHandler(callbacks, makeFactory(rec));
    expect(handler.textFallbackMode).toBe(false);
  });

  it('submitTextInput forwards text when textFallbackMode is true', async () => {
    const { callbacks, transcripts } = makeVIHCallbacks();
    const rec = makeMockRecognition();
    const handler = new VoiceInputHandler(callbacks, makeFactory(rec));

    // Trigger error to enable fallback mode
    await handler.start();
    rec.onerror?.({ error: 'not-allowed' });

    expect(handler.textFallbackMode).toBe(true);
    handler.submitTextInput('hello from keyboard');
    expect(transcripts).toContain('hello from keyboard');
  });

  it('submitTextInput does nothing when textFallbackMode is false', () => {
    const { callbacks, transcripts } = makeVIHCallbacks();
    const rec = makeMockRecognition();
    const handler = new VoiceInputHandler(callbacks, makeFactory(rec));

    handler.submitTextInput('should be ignored');
    expect(transcripts).toHaveLength(0);
  });

  it('submitTextInput ignores whitespace-only strings in fallback mode', async () => {
    const { callbacks, transcripts } = makeVIHCallbacks();
    const rec = makeMockRecognition();
    const handler = new VoiceInputHandler(callbacks, makeFactory(rec));

    await handler.start();
    rec.onerror?.({ error: 'audio-capture' });

    handler.submitTextInput('   ');
    expect(transcripts).toHaveLength(0);
  });

  it('submitTextInput trims whitespace before forwarding', async () => {
    const { callbacks, transcripts } = makeVIHCallbacks();
    const rec = makeMockRecognition();
    const handler = new VoiceInputHandler(callbacks, makeFactory(rec));

    await handler.start();
    rec.onerror?.({ error: 'not-allowed' });

    handler.submitTextInput('  trimmed text  ');
    expect(transcripts).toContain('trimmed text');
  });

  it('textFallbackMode is enabled after PERMISSION_DENIED error', async () => {
    const { callbacks } = makeVIHCallbacks();
    const rec = makeMockRecognition();
    const handler = new VoiceInputHandler(callbacks, makeFactory(rec));

    await handler.start();
    rec.onerror?.({ error: 'not-allowed' });

    expect(handler.textFallbackMode).toBe(true);
  });

  it('textFallbackMode is enabled after DEVICE_UNAVAILABLE error', async () => {
    const { callbacks } = makeVIHCallbacks();
    const rec = makeMockRecognition();
    const handler = new VoiceInputHandler(callbacks, makeFactory(rec));

    await handler.start();
    rec.onerror?.({ error: 'audio-capture' });

    expect(handler.textFallbackMode).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Unit tests — TTSEngine on-screen text fallback (Req 11.2, 3.6)
// ---------------------------------------------------------------------------

describe('TTSEngine — on-screen text fallback', () => {
  it('calls onTextFallback when both TTS attempts fail', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    ws.send.mockImplementation(() => { throw new Error('API error'); });
    const { callbacks, fallbackTexts } = makeTTSCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Wellness response text', BASE_TTS_OPTIONS);

    expect(fallbackTexts).toEqual(['Wellness response text']);
  });

  it('does not call onTextFallback when TTS succeeds', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks, fallbackTexts } = makeTTSCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Success text', BASE_TTS_OPTIONS);

    expect(fallbackTexts).toHaveLength(0);
  });

  it('preserves the exact response text in onTextFallback', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    ws.send.mockImplementation(() => { throw new Error('API error'); });
    const { callbacks, fallbackTexts } = makeTTSCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    const responseText = 'Take a deep breath and relax.';
    await engine.speak(responseText, BASE_TTS_OPTIONS);

    expect(fallbackTexts[0]).toBe(responseText);
  });
});

// ---------------------------------------------------------------------------
// Property 27: Text fallback completeness (Task 16.2)
// Feature: wellflow-voice-wellness-assistant, Property 27: Text fallback completeness
// When text fallback mode is active, typed text input must be accepted and forwarded
// as a transcript, AND TTS responses must also be delivered as on-screen text.
// Validates: Requirements 11.1, 11.2
// ---------------------------------------------------------------------------

describe('Property 27: Text fallback completeness', () => {
  // Part A: VoiceInputHandler — typed text is forwarded as transcript in fallback mode
  it('for any non-empty text input in fallback mode, the transcript is forwarded via onSpeechEnd', () => {
    // Feature: wellflow-voice-wellness-assistant, Property 27: Text fallback completeness
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0), { minLength: 1, maxLength: 20 }),
        (inputs) => {
          const { callbacks, transcripts } = makeVIHCallbacks();
          const rec = makeMockRecognition();
          const handler = new VoiceInputHandler(callbacks, makeFactory(rec));

          // Enable fallback mode by directly setting the private field (simulates mic error)
          (handler as unknown as { _textFallbackMode: boolean })._textFallbackMode = true;

          const before = transcripts.length;
          for (const input of inputs) {
            handler.submitTextInput(input);
          }

          // Every non-empty input must produce exactly one transcript entry
          expect(transcripts.length - before).toBe(inputs.length);
          // Each forwarded transcript must match the trimmed input
          for (let i = 0; i < inputs.length; i++) {
            expect(transcripts[before + i]).toBe(inputs[i].trim());
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Part B: VoiceInputHandler — text is NOT forwarded when fallback mode is inactive
  it('for any text input when fallback mode is inactive, no transcript is forwarded', () => {
    // Feature: wellflow-voice-wellness-assistant, Property 27: Text fallback completeness
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 1, maxLength: 20 }),
        (inputs) => {
          const { callbacks, transcripts } = makeVIHCallbacks();
          const rec = makeMockRecognition();
          const handler = new VoiceInputHandler(callbacks, makeFactory(rec));

          // textFallbackMode is false by default
          expect(handler.textFallbackMode).toBe(false);

          const before = transcripts.length;
          for (const input of inputs) {
            handler.submitTextInput(input);
          }

          // No transcripts should be forwarded when fallback mode is off
          expect(transcripts.length).toBe(before);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Part C: TTSEngine — responses are delivered as on-screen text when both TTS attempts fail
  it('for any response text, when both TTS attempts fail, onTextFallback delivers the exact text', async () => {
    // Feature: wellflow-voice-wellness-assistant, Property 27: Text fallback completeness
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (responseText) => {
          const rl = makeMockRateLimiter();
          const ws = makeMockWsManager();
          ws.send.mockImplementation(() => { throw new Error('API error'); });
          const { callbacks, fallbackTexts } = makeTTSCallbacks();
          const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

          await engine.speak(responseText, BASE_TTS_OPTIONS);

          // The exact response text must be delivered as on-screen text
          expect(fallbackTexts).toContain(responseText);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Part D: Combined — text input in fallback mode produces a transcript that can be
  // processed, and if TTS fails, the response is also delivered as on-screen text
  it('end-to-end: fallback input is forwarded AND TTS failure produces on-screen text', async () => {
    // Feature: wellflow-voice-wellness-assistant, Property 27: Text fallback completeness
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1 }),
        async (userInput, responseText) => {
          // Step 1: VoiceInputHandler forwards typed input as transcript
          const { callbacks: vihCallbacks, transcripts } = makeVIHCallbacks();
          const rec = makeMockRecognition();
          const handler = new VoiceInputHandler(vihCallbacks, makeFactory(rec));
          (handler as unknown as { _textFallbackMode: boolean })._textFallbackMode = true;

          handler.submitTextInput(userInput);
          expect(transcripts).toContain(userInput.trim());

          // Step 2: TTSEngine delivers response as on-screen text when API fails
          const rl = makeMockRateLimiter();
          const ws = makeMockWsManager();
          ws.send.mockImplementation(() => { throw new Error('API error'); });
          const { callbacks: ttsCallbacks, fallbackTexts } = makeTTSCallbacks();
          const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, ttsCallbacks);

          await engine.speak(responseText, BASE_TTS_OPTIONS);
          expect(fallbackTexts).toContain(responseText);
        },
      ),
      { numRuns: 100 },
    );
  });
});
