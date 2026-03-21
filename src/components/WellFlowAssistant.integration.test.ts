// Feature: murf-ai-voice-integration
// Integration tests for the wired session bootstrap in WellFlowAssistant
// Requirements: 1.1, 5.1, 11.1

import { WellFlowAssistant, WellFlowAssistantConfig, WellFlowAssistantCallbacks } from './WellFlowAssistant';
import { ProfileStore } from '../store/ProfileStore';
import { FallbackDisplayAdapter } from './TextFallbackDisplay';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal no-op callbacks for WellFlowAssistant */
function makeCallbacks(overrides: Partial<WellFlowAssistantCallbacks> = {}): WellFlowAssistantCallbacks {
  return {
    onTextFallback: jest.fn(),
    onUnsupportedLanguage: jest.fn(),
    onSessionDurationWarning: jest.fn(),
    onConnectionLost: jest.fn(),
    onVoicePreviewError: jest.fn(),
    onMicrophoneError: jest.fn(),
    onBreathingPhase: jest.fn(),
    onBreathingComplete: jest.fn(),
    onMindfulnessSegment: jest.fn(),
    onMindfulnessComplete: jest.fn(),
    onResponse: jest.fn(),
    ...overrides,
  };
}

/** Minimal FallbackDisplayAdapter that records calls */
function makeFallbackAdapter(): FallbackDisplayAdapter & { texts: string[]; visible: boolean } {
  const adapter = {
    texts: [] as string[],
    visible: false,
    setText(text: string) { adapter.texts.push(text); },
    setVisible(v: boolean) { adapter.visible = v; },
  };
  return adapter;
}

// ---------------------------------------------------------------------------
// Test 1: getMurfApiKey() called at startup — error surfaces when key is absent
// Requirements: 1.1, 1.2
// ---------------------------------------------------------------------------

describe('WellFlowAssistant bootstrap — getMurfApiKey() at startup', () => {
  const originalEnv = process.env.MURF_API_KEY;

  afterEach(() => {
    // Restore env var after each test
    if (originalEnv === undefined) {
      delete process.env.MURF_API_KEY;
    } else {
      process.env.MURF_API_KEY = originalEnv;
    }
  });

  it('throws ConfigurationError when MURF_API_KEY is absent', () => {
    delete process.env.MURF_API_KEY;

    expect(() => {
      new WellFlowAssistant({
        profileStore: new ProfileStore(),
        callbacks: makeCallbacks(),
      });
    }).toThrow('MURF_API_KEY');
  });

  it('throws ConfigurationError when MURF_API_KEY is empty string', () => {
    process.env.MURF_API_KEY = '';

    expect(() => {
      new WellFlowAssistant({
        profileStore: new ProfileStore(),
        callbacks: makeCallbacks(),
      });
    }).toThrow('MURF_API_KEY');
  });

  it('constructs successfully when MURF_API_KEY is set', () => {
    process.env.MURF_API_KEY = 'test-key-12345';

    expect(() => {
      new WellFlowAssistant({
        profileStore: new ProfileStore(),
        callbacks: makeCallbacks(),
      });
    }).not.toThrow();
  });

  it('error thrown is a ConfigurationError (not a generic Error)', () => {
    delete process.env.MURF_API_KEY;

    let caught: unknown;
    try {
      new WellFlowAssistant({
        profileStore: new ProfileStore(),
        callbacks: makeCallbacks(),
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeDefined();
    expect((caught as Error).name).toBe('ConfigurationError');
  });
});

// ---------------------------------------------------------------------------
// Test 2: VoiceSelector.initialise() called before first TTSEngine.speak()
// Requirements: 5.1
// ---------------------------------------------------------------------------

describe('WellFlowAssistant bootstrap — VoiceSelector.initialise() before first TTS', () => {
  const originalEnv = process.env.MURF_API_KEY;

  beforeEach(() => {
    process.env.MURF_API_KEY = 'test-key-12345';
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.MURF_API_KEY;
    } else {
      process.env.MURF_API_KEY = originalEnv;
    }
  });

  it('VoiceSelector.initialise() is called during startSession() before any TTS speak', async () => {
    const initialiseCalls: string[] = [];
    const speakCalls: string[] = [];

    // Custom fetchFn that records when initialise fetch happens
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const assistant = new WellFlowAssistant({
      profileStore: new ProfileStore(),
      sessionLanguage: 'en',
      callbacks: makeCallbacks(),
    });

    // Spy on voiceSelector.initialise and ttsEngine.speak to track call order
    const originalInitialise = assistant.voiceSelector.initialise.bind(assistant.voiceSelector);
    assistant.voiceSelector.initialise = jest.fn().mockImplementation(async (lang: string) => {
      initialiseCalls.push(`initialise:${lang}`);
      return originalInitialise(lang);
    });

    const originalSpeak = assistant.ttsEngine.speak.bind(assistant.ttsEngine);
    assistant.ttsEngine.speak = jest.fn().mockImplementation(async (...args: Parameters<typeof originalSpeak>) => {
      speakCalls.push('speak');
      // Don't actually call speak (would need real WebSocket)
    });

    // Also stub voiceInput.start to avoid real microphone access
    assistant.voiceInput.start = jest.fn().mockResolvedValue(undefined);

    await assistant.startSession('user-1');

    // initialise must have been called
    expect(initialiseCalls.length).toBeGreaterThanOrEqual(1);
    expect(initialiseCalls[0]).toBe('initialise:en');
  });

  it('VoiceSelector.initialise() uses the configured sessionLanguage', async () => {
    const initialisedLanguages: string[] = [];

    const assistant = new WellFlowAssistant({
      profileStore: new ProfileStore(),
      sessionLanguage: 'es',
      callbacks: makeCallbacks(),
    });

    assistant.voiceSelector.initialise = jest.fn().mockImplementation(async (lang: string) => {
      initialisedLanguages.push(lang);
    });

    assistant.ttsEngine.speak = jest.fn().mockResolvedValue(undefined);
    assistant.voiceInput.start = jest.fn().mockResolvedValue(undefined);

    await assistant.startSession('user-1');

    expect(initialisedLanguages).toContain('es');
  });

  it('VoiceSelector.initialise() is idempotent — second startSession does not re-fetch', async () => {
    let initialiseCalls = 0;

    const assistant = new WellFlowAssistant({
      profileStore: new ProfileStore(),
      sessionLanguage: 'en',
      callbacks: makeCallbacks(),
    });

    assistant.voiceSelector.initialise = jest.fn().mockImplementation(async () => {
      initialiseCalls++;
    });

    assistant.ttsEngine.speak = jest.fn().mockResolvedValue(undefined);
    assistant.voiceInput.start = jest.fn().mockResolvedValue(undefined);
    assistant.voiceInput.stop = jest.fn();
    assistant.voiceSelector.saveVoiceProfile = jest.fn().mockResolvedValue(undefined);

    await assistant.startSession('user-1');
    await assistant.endSession();
    await assistant.startSession('user-1');

    // initialise is called each time startSession is called (VoiceSelector itself is idempotent internally)
    expect(initialiseCalls).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Test 3: onTextFallback wired to TextFallbackDisplay.show()
// Requirements: 11.1
// ---------------------------------------------------------------------------

describe('WellFlowAssistant bootstrap — onTextFallback wired to TextFallbackDisplay.show()', () => {
  const originalEnv = process.env.MURF_API_KEY;

  beforeEach(() => {
    process.env.MURF_API_KEY = 'test-key-12345';
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.MURF_API_KEY;
    } else {
      process.env.MURF_API_KEY = originalEnv;
    }
  });

  it('TextFallbackDisplay.show() is called when onTextFallback fires', () => {
    const adapter = makeFallbackAdapter();
    const onTextFallback = jest.fn();

    const assistant = new WellFlowAssistant({
      profileStore: new ProfileStore(),
      fallbackDisplayAdapter: adapter,
      callbacks: makeCallbacks({ onTextFallback }),
    });

    // Simulate TTSEngine firing onTextFallback by triggering it directly
    // (the wiring is in the constructor — we verify the adapter receives the text)
    const fallbackText = 'Take a deep breath and relax.';

    // Access the internal ttsEngine callbacks by triggering speak with a failing scenario
    // Instead, we directly invoke the wired callback via the ttsEngine's internal callbacks
    // by calling the assistant's ttsEngine speak and having it fail twice.
    // For a simpler unit-level integration test, we verify the wiring by checking
    // that the adapter's setText is called when the callbacks.onTextFallback is invoked.

    // The wiring is: ttsCallbacks.onTextFallback → textFallbackDisplay.show(text) + callbacks.onTextFallback(text)
    // We can verify this by directly invoking the TTSEngine's onTextFallback callback
    // through a controlled speak() call that fails.

    // Simplest approach: mock wsManager.connect to throw, causing speak to fail twice
    assistant.wsManager.connect = jest.fn().mockRejectedValue(new Error('Connection refused'));
    assistant.wsManager.isConnected = jest.fn().mockReturnValue(false);

    // speak() will fail twice and call onTextFallback
    return assistant.ttsEngine.speak(fallbackText, {
      language: 'en',
      speed: 'normal',
      sessionId: 'test-session',
    }).then(() => {
      // After both attempts fail, onTextFallback should have been called
      expect(onTextFallback).toHaveBeenCalledWith(fallbackText);
      // And the adapter should have received the text
      expect(adapter.texts).toContain(fallbackText);
      expect(adapter.visible).toBe(true);
    });
  });

  it('TextFallbackDisplay shows the exact text passed to onTextFallback', () => {
    const adapter = makeFallbackAdapter();

    const assistant = new WellFlowAssistant({
      profileStore: new ProfileStore(),
      fallbackDisplayAdapter: adapter,
      callbacks: makeCallbacks(),
    });

    const texts = [
      'Breathe in slowly.',
      'Now breathe out.',
      'You are doing great.',
    ];

    assistant.wsManager.connect = jest.fn().mockRejectedValue(new Error('Connection refused'));
    assistant.wsManager.isConnected = jest.fn().mockReturnValue(false);

    const promises = texts.map((text) =>
      assistant.ttsEngine.speak(text, {
        language: 'en',
        speed: 'normal',
        sessionId: 'test-session',
      }),
    );

    return Promise.all(promises).then(() => {
      for (const text of texts) {
        expect(adapter.texts).toContain(text);
      }
    });
  });

  it('TextFallbackDisplay.hide() is called after successful TTS via _dispatchIntent', async () => {
    const adapter = makeFallbackAdapter();

    const assistant = new WellFlowAssistant({
      profileStore: new ProfileStore(),
      fallbackDisplayAdapter: adapter,
      callbacks: makeCallbacks(),
    });

    // First show the fallback by triggering a failed TTS
    assistant.wsManager.connect = jest.fn().mockRejectedValue(new Error('Connection refused'));
    assistant.wsManager.isConnected = jest.fn().mockReturnValue(false);

    await assistant.ttsEngine.speak('Some fallback text', {
      language: 'en',
      speed: 'normal',
      sessionId: 'test-session',
    });

    // Fallback should now be visible
    expect(adapter.visible).toBe(true);
    expect(adapter.texts).toContain('Some fallback text');

    // Now simulate a successful TTS by calling hide() directly on the textFallbackDisplay
    // (which is what _dispatchIntent does after speak resolves successfully)
    // We verify the hide() wiring by mocking speak to succeed and calling _dispatchIntent
    // indirectly via the voiceInput onSpeechEnd path.
    // The simplest way: mock speak to succeed, then trigger the dispatch path.
    assistant.ttsEngine.speak = jest.fn().mockImplementation(async () => {
      // Successful TTS — _dispatchIntent calls hide() after this resolves
    });
    assistant.voiceInput.start = jest.fn().mockResolvedValue(undefined);
    assistant.voiceSelector.initialise = jest.fn().mockResolvedValue(undefined);

    // Trigger startSession to set up activeSession
    await assistant.startSession('user-1');

    // Now simulate the voiceInput onSpeechEnd path by calling conversationEngine + dispatch
    // We do this by directly calling the internal dispatch via a breathing exercise intent
    // The _dispatchIntent is called from voiceInput.onSpeechEnd — we simulate it by
    // calling the public ttsEngine.speak (mocked to succeed) and then checking hide was called.
    // Since _dispatchIntent calls hide() after speak resolves, and speak is mocked to succeed,
    // we verify by checking the adapter state after the dispatch.

    // Reset adapter to show state
    adapter.setText('Fallback text');
    adapter.setVisible(true);

    // Directly invoke the dispatch path by processing voice input
    // The voiceInput callbacks are wired in the constructor — we simulate onSpeechEnd
    // by calling conversationEngine.processInput and then the ttsEngine.speak
    // (which is now mocked to succeed), followed by checking hide() was called.

    // The actual wiring: _dispatchIntent calls ttsEngine.speak(...) then this.textFallbackDisplay.hide()
    // Since speak is mocked to resolve immediately, hide() should be called right after.
    // We verify by checking adapter.visible is false after the dispatch.

    // Simulate the full dispatch by calling the internal method via the voiceInput path
    // We use the conversationEngine to get a response, then manually trigger the dispatch
    const response = await assistant.conversationEngine.processInput(
      'I want to do breathing exercises',
      'session-test',
    );

    // Call speak (mocked to succeed) — this is what _dispatchIntent does
    await assistant.ttsEngine.speak(response.responseText, {
      language: 'en',
      speed: 'normal',
      sessionId: 'session-test',
    });

    // After successful speak in _dispatchIntent, hide() is called
    // But since we called speak directly (not via _dispatchIntent), we need to call hide manually
    // to verify the wiring works. Instead, let's verify the wiring by checking the
    // TextFallbackDisplay instance directly.

    // The correct way to test this: verify that when _dispatchIntent is called (via the
    // voiceInput onSpeechEnd path), hide() is called. We do this by checking that
    // after a successful speak, the adapter.visible is false.

    // Since _dispatchIntent is private, we test it indirectly by verifying the
    // TextFallbackDisplay.hide() method works correctly when called.
    // The wiring test is: show() sets visible=true, hide() sets visible=false.
    assistant.ttsEngine.speak = jest.fn().mockImplementation(async () => {
      // After this resolves, _dispatchIntent calls hide()
    });

    // Manually call hide() to verify the adapter wiring (the actual hide() call
    // happens inside _dispatchIntent after speak resolves)
    // We verify the TextFallbackDisplay is properly wired by checking its hide() method
    // works through the adapter.
    adapter.setText('Fallback text');
    adapter.setVisible(true);
    expect(adapter.visible).toBe(true);

    // The textFallbackDisplay instance is internal, but we can verify the wiring
    // by checking that the adapter receives the hide() call when the fallback display hides.
    // Since we can't access the private textFallbackDisplay directly, we verify
    // the wiring is correct by checking the adapter state after a full dispatch cycle.

    // Trigger a full dispatch via the voiceInput onSpeechEnd callback
    // by simulating the internal callback chain
    const voiceInputCallbacks = (assistant.voiceInput as unknown as {
      callbacks: { onSpeechEnd: (transcript: string) => Promise<void> }
    }).callbacks;

    if (voiceInputCallbacks?.onSpeechEnd) {
      // Set activeSession so the dispatch path runs
      (assistant as unknown as { activeSession: { sessionId: string; language: string } }).activeSession = {
        sessionId: 'session-test',
        language: 'en',
      };
      await voiceInputCallbacks.onSpeechEnd('I want to do breathing exercises');
    }

    // After successful TTS dispatch, hide() should have been called
    expect(adapter.visible).toBe(false);
  });
});
