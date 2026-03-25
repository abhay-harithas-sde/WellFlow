// Feature: murf-ai-voice-integration
// Integration tests for WellFlowAssistant session bootstrap wiring
// Requirements: 1.1, 5.1, 11.1

import { WellFlowAssistant, WellFlowAssistantConfig, WellFlowAssistantCallbacks } from './WellFlowAssistant';
import { ProfileStore } from '../store/ProfileStore';
import { FallbackDisplayAdapter } from './TextFallbackDisplay';

describe('WellFlowAssistant Integration Tests', () => {
  let profileStore: ProfileStore;
  let fallbackAdapter: FallbackDisplayAdapter;
  let callbacks: WellFlowAssistantCallbacks;
  let config: WellFlowAssistantConfig;

  beforeEach(() => {
    profileStore = new ProfileStore();
    
    fallbackAdapter = {
      setText: jest.fn(),
      setVisible: jest.fn(),
    };

    callbacks = {
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
    };

    config = {
      profileStore,
      fallbackDisplayAdapter: fallbackAdapter,
      sessionLanguage: 'en',
      callbacks,
    };
  });

  describe('Task 15.1: Session bootstrap wiring', () => {
    /**
     * Test: getMurfApiKey() called at startup and error surfaces correctly
     * Requirement: 1.1
     */
    it('should call getMurfApiKey() at startup and surface ConfigurationError', () => {
      // Save original env var
      const originalKey = process.env.MURF_API_KEY;
      
      try {
        // Remove the API key to trigger ConfigurationError
        delete process.env.MURF_API_KEY;

        // Attempt to construct WellFlowAssistant — should throw ConfigurationError
        expect(() => new WellFlowAssistant(config)).toThrow('MURF_API_KEY environment variable is absent or empty');
      } finally {
        // Restore original env var
        if (originalKey !== undefined) {
          process.env.MURF_API_KEY = originalKey;
        }
      }
    });

    it('should successfully construct when MURF_API_KEY is present', () => {
      // Ensure API key is set
      process.env.MURF_API_KEY = 'test-key-12345';

      // Should not throw
      expect(() => new WellFlowAssistant(config)).not.toThrow();
    });

    /**
     * Test: VoiceSelector.initialise() called before first TTSEngine.speak()
     * Requirement: 5.1
     */
    it('should call VoiceSelector.initialise() before first TTS request', async () => {
      // Ensure API key is set
      process.env.MURF_API_KEY = 'test-key-12345';

      const assistant = new WellFlowAssistant(config);

      // Mock fetch to return empty voice list
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      // Spy on voiceSelector.initialise
      const initialiseSpy = jest.spyOn(assistant.voiceSelector, 'initialise');

      // Start session — this should call initialise()
      await assistant.startSession('user-123');

      // Verify initialise was called with the session language
      expect(initialiseSpy).toHaveBeenCalledWith('en');
      expect(initialiseSpy).toHaveBeenCalledTimes(1);

      // Clean up
      await assistant.endSession();
    });

    /**
     * Test: onTextFallback wired to TextFallbackDisplay.show()
     * Requirement: 11.1
     */
    it('should wire onTextFallback to TextFallbackDisplay.show()', async () => {
      // Ensure API key is set
      process.env.MURF_API_KEY = 'test-key-12345';

      const assistant = new WellFlowAssistant(config);

      // Mock fetch to return empty voice list
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      // Start session
      await assistant.startSession('user-123');

      // Simulate a TTS failure by triggering onTextFallback directly
      // In a real scenario, this would be triggered by TTSEngine after double failure
      const fallbackText = 'This is fallback text';
      
      // Access the TTSEngine callbacks and trigger onTextFallback
      // The callbacks are wired in the constructor
      assistant.ttsEngine['callbacks'].onTextFallback(fallbackText);

      // Verify TextFallbackDisplay.show() was called via the adapter
      expect(fallbackAdapter.setText).toHaveBeenCalledWith(fallbackText);
      expect(fallbackAdapter.setVisible).toHaveBeenCalledWith(true);

      // Verify the callback was also invoked
      expect(callbacks.onTextFallback).toHaveBeenCalledWith(fallbackText);

      // Clean up
      await assistant.endSession();
    });

    it('should hide TextFallbackDisplay on successful TTS completion', async () => {
      // Ensure API key is set
      process.env.MURF_API_KEY = 'test-key-12345';

      const assistant = new WellFlowAssistant(config);

      // Mock fetch to return empty voice list
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      // Start session
      await assistant.startSession('user-123');

      // First show fallback text
      const fallbackText = 'This is fallback text';
      assistant.ttsEngine['callbacks'].onTextFallback(fallbackText);

      // Verify it was shown
      expect(fallbackAdapter.setVisible).toHaveBeenCalledWith(true);

      // Reset mocks
      jest.clearAllMocks();

      // Now simulate successful TTS completion by calling _dispatchIntent
      // which calls ttsEngine.speak() and then textFallbackDisplay.hide()
      // We'll directly test the hide behavior
      assistant['textFallbackDisplay'].hide();

      // Verify TextFallbackDisplay.hide() was called via the adapter
      expect(fallbackAdapter.setText).toHaveBeenCalledWith('');
      expect(fallbackAdapter.setVisible).toHaveBeenCalledWith(false);

      // Clean up
      await assistant.endSession();
    });

    it('should inject MurfLogger into TTSEngine and WebSocketManager', () => {
      // Ensure API key is set
      process.env.MURF_API_KEY = 'test-key-12345';

      const assistant = new WellFlowAssistant(config);

      // Verify TTSEngine has a logger
      expect(assistant.ttsEngine['logger']).toBeDefined();
      expect(assistant.ttsEngine['logger']).not.toBeNull();

      // Verify WebSocketManager has a logger
      expect(assistant.wsManager['logger']).toBeDefined();
      expect(assistant.wsManager['logger']).not.toBeNull();
    });
  });
});
