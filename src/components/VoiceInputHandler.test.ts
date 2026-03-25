// Feature: wellflow-voice-wellness-assistant
// Tests for VoiceInputHandler — Requirements 1.1–1.5

import { VoiceInputHandler, VoiceInputHandlerCallbacks, SpeechRecognitionFactory } from './VoiceInputHandler';
import { MicrophoneError } from '../types';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function makeCallbacks(): { callbacks: VoiceInputHandlerCallbacks; starts: number[]; transcripts: string[]; errors: MicrophoneError[] } {
  const starts: number[] = [];
  const transcripts: string[] = [];
  const errors: MicrophoneError[] = [];
  const callbacks: VoiceInputHandlerCallbacks = {
    onSpeechStart: () => starts.push(Date.now()),
    onSpeechEnd: (t) => transcripts.push(t),
    onError: (e) => errors.push(e),
  };
  return { callbacks, starts, transcripts, errors };
}

function makeFactory(rec: MockRecognition): SpeechRecognitionFactory {
  return () => rec as unknown as ReturnType<SpeechRecognitionFactory>;
}

// ---------------------------------------------------------------------------
// Basic behavior
// ---------------------------------------------------------------------------

describe('VoiceInputHandler — basic behavior', () => {
  it('calls onSpeechStart when recognition starts', async () => {
    const rec = makeMockRecognition();
    const { callbacks, starts } = makeCallbacks();
    const handler = new VoiceInputHandler(callbacks, makeFactory(rec));

    const startPromise = handler.start();
    rec.onstart?.();
    await startPromise;

    expect(starts).toHaveLength(1);
  });

  it('calls onSpeechEnd with final transcript', async () => {
    const rec = makeMockRecognition();
    const { callbacks, transcripts } = makeCallbacks();
    const handler = new VoiceInputHandler(callbacks, makeFactory(rec));

    await handler.start();
    rec.onstart?.();

    rec.onresult?.({
      results: {
        length: 1,
        0: { isFinal: true, 0: { transcript: 'hello world' } },
      },
    });

    expect(transcripts).toEqual(['hello world']);
  });

  it('does not call onSpeechEnd for non-final results', async () => {
    const rec = makeMockRecognition();
    const { callbacks, transcripts } = makeCallbacks();
    const handler = new VoiceInputHandler(callbacks, makeFactory(rec));

    await handler.start();
    rec.onstart?.();

    rec.onresult?.({
      results: {
        length: 1,
        0: { isFinal: false, 0: { transcript: 'partial' } },
      },
    });

    expect(transcripts).toHaveLength(0);
  });

  it('stop() calls recognition.stop()', async () => {
    const rec = makeMockRecognition();
    const { callbacks } = makeCallbacks();
    const handler = new VoiceInputHandler(callbacks, makeFactory(rec));

    await handler.start();
    rec.onstart?.();
    handler.stop();

    expect(rec.stop).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Error flows (Task 11.4) — Requirements 1.4
// ---------------------------------------------------------------------------

describe('VoiceInputHandler — microphone error flows', () => {
  it('maps not-allowed to PERMISSION_DENIED and enables text fallback', async () => {
    const rec = makeMockRecognition();
    const { callbacks, errors } = makeCallbacks();
    const handler = new VoiceInputHandler(callbacks, makeFactory(rec));

    await handler.start();
    rec.onerror?.({ error: 'not-allowed' });

    expect(errors).toEqual(['PERMISSION_DENIED']);
    expect(handler.textFallbackMode).toBe(true);
  });

  it('maps audio-capture to DEVICE_UNAVAILABLE', async () => {
    const rec = makeMockRecognition();
    const { callbacks, errors } = makeCallbacks();
    const handler = new VoiceInputHandler(callbacks, makeFactory(rec));

    await handler.start();
    rec.onerror?.({ error: 'audio-capture' });

    expect(errors).toEqual(['DEVICE_UNAVAILABLE']);
  });

  it('maps unknown error to CAPTURE_FAILED', async () => {
    const rec = makeMockRecognition();
    const { callbacks, errors } = makeCallbacks();
    const handler = new VoiceInputHandler(callbacks, makeFactory(rec));

    await handler.start();
    rec.onerror?.({ error: 'network' });

    expect(errors).toEqual(['CAPTURE_FAILED']);
  });

  it('enables text fallback mode on any error', async () => {
    const rec = makeMockRecognition();
    const { callbacks } = makeCallbacks();
    const handler = new VoiceInputHandler(callbacks, makeFactory(rec));

    await handler.start();
    rec.onerror?.({ error: 'not-allowed' });

    expect(handler.textFallbackMode).toBe(true);
  });

  it('submitTextInput forwards text when in fallback mode', async () => {
    const rec = makeMockRecognition();
    const { callbacks, transcripts } = makeCallbacks();
    const handler = new VoiceInputHandler(callbacks, makeFactory(rec));

    await handler.start();
    rec.onerror?.({ error: 'not-allowed' });

    handler.submitTextInput('typed input');
    expect(transcripts).toEqual(['typed input']);
  });

  it('submitTextInput does nothing when not in fallback mode', async () => {
    const rec = makeMockRecognition();
    const { callbacks, transcripts } = makeCallbacks();
    const handler = new VoiceInputHandler(callbacks, makeFactory(rec));

    handler.submitTextInput('ignored');
    expect(transcripts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Property 1: Voice capture latency — speech start (Task 11.2)
// Feature: wellflow-voice-wellness-assistant, Property 1: Voice capture latency — speech start
// Validates: Requirements 1.2
// ---------------------------------------------------------------------------

describe('VoiceInputHandler — Property 1: Voice capture latency — speech start', () => {
  it('onSpeechStart is called within 200ms of recognition.start()', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const rec = makeMockRecognition();
          let startCalledAt: number | undefined;
          const callbacks: VoiceInputHandlerCallbacks = {
            onSpeechStart: () => { startCalledAt = performance.now(); },
            onSpeechEnd: () => {},
            onError: () => {},
          };
          const handler = new VoiceInputHandler(callbacks, makeFactory(rec));

          const t0 = performance.now();
          await handler.start();
          rec.onstart?.();

          expect(startCalledAt).toBeDefined();
          expect(startCalledAt! - t0).toBeLessThanOrEqual(200);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Voice capture latency — speech end forwarding (Task 11.3)
// Feature: wellflow-voice-wellness-assistant, Property 2: Voice capture latency — speech end forwarding
// Validates: Requirements 1.3
// ---------------------------------------------------------------------------

describe('VoiceInputHandler — Property 2: Voice capture latency — speech end forwarding', () => {
  it('onSpeechEnd is called within 500ms of final result arriving', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (transcript) => {
          const rec = makeMockRecognition();
          let endCalledAt: number | undefined;
          const callbacks: VoiceInputHandlerCallbacks = {
            onSpeechStart: () => {},
            onSpeechEnd: () => { endCalledAt = performance.now(); },
            onError: () => {},
          };
          const handler = new VoiceInputHandler(callbacks, makeFactory(rec));

          await handler.start();
          rec.onstart?.();

          const t0 = performance.now();
          rec.onresult?.({
            results: {
              length: 1,
              0: { isFinal: true, 0: { transcript } },
            },
          });

          expect(endCalledAt).toBeDefined();
          expect(endCalledAt! - t0).toBeLessThanOrEqual(500);
        },
      ),
      { numRuns: 100 },
    );
  });
});
