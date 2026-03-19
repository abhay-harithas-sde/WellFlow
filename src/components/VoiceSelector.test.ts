// Feature: wellflow-voice-wellness-assistant
// Tests for VoiceSelector — Requirements 12.1–12.11

import { VoiceSelector, VoiceSelectorCallbacks } from './VoiceSelector';
import { ProfileStore } from '../store/ProfileStore';
import { WebSocketManager } from './WebSocketManager';
import { RateLimiterInterface } from './RateLimiter';
import { ActivityType, MurfVoice } from '../types';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SAMPLE_VOICES: MurfVoice[] = [
  { voiceId: 'v1', name: 'Alice', accent: 'american', gender: 'female', style: 'calm' },
  { voiceId: 'v2', name: 'Bob', accent: 'british', gender: 'male', style: 'energetic' },
  { voiceId: 'v3', name: 'Clara', accent: 'american', gender: 'female', style: 'energetic' },
  { voiceId: 'v4', name: 'David', accent: 'australian', gender: 'male', style: 'calm' },
  { voiceId: 'v5', name: 'Eve', accent: 'british', gender: 'neutral', style: 'calm' },
];

function makeStore(): ProfileStore { return new ProfileStore(); }

function makeMockWs(): jest.Mocked<Pick<WebSocketManager, 'isConnected' | 'connect' | 'send'>> {
  return {
    isConnected: jest.fn().mockReturnValue(true),
    connect: jest.fn().mockResolvedValue(undefined),
    send: jest.fn(),
  };
}

function makeMockRl(): jest.Mocked<RateLimiterInterface> {
  return {
    acquire: jest.fn().mockResolvedValue(undefined),
    release: jest.fn(),
    activeCount: 0,
    requestsThisMinute: 0,
  };
}

function makeCallbacks(): { callbacks: VoiceSelectorCallbacks; errors: Array<{ voiceId: string; message: string }> } {
  const errors: Array<{ voiceId: string; message: string }> = [];
  const callbacks: VoiceSelectorCallbacks = {
    onPreviewError: (voiceId, message) => errors.push({ voiceId, message }),
  };
  return { callbacks, errors };
}

function makeSelector(voices = SAMPLE_VOICES): {
  selector: VoiceSelector;
  store: ProfileStore;
  ws: ReturnType<typeof makeMockWs>;
  rl: ReturnType<typeof makeMockRl>;
  errors: Array<{ voiceId: string; message: string }>;
} {
  const store = makeStore();
  const ws = makeMockWs();
  const rl = makeMockRl();
  const { callbacks, errors } = makeCallbacks();
  const selector = new VoiceSelector(store, ws as unknown as WebSocketManager, rl, callbacks, voices);
  return { selector, store, ws, rl, errors };
}

// ---------------------------------------------------------------------------
// Property 29: Voice filter correctness (Task 18.2)
// Feature: wellflow-voice-wellness-assistant, Property 29: Voice filter correctness
// Validates: Requirements 12.2
// ---------------------------------------------------------------------------

describe('VoiceSelector — Property 29: Voice filter correctness', () => {
  it('listVoices with gender filter returns only voices matching that gender', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('male' as const, 'female' as const, 'neutral' as const),
        async (gender) => {
          const { selector } = makeSelector();
          const results = await selector.listVoices({ gender });
          expect(results.every((v) => v.gender === gender)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('listVoices with accent filter returns only voices matching that accent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('american', 'british', 'australian'),
        async (accent) => {
          const { selector } = makeSelector();
          const results = await selector.listVoices({ accent });
          expect(results.every((v) => v.accent.toLowerCase() === accent)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('listVoices with multiple filters returns only voices matching ALL filters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('american', 'british'),
        fc.constantFrom('male' as const, 'female' as const),
        async (accent, gender) => {
          const { selector } = makeSelector();
          const results = await selector.listVoices({ accent, gender });
          expect(results.every((v) => v.accent.toLowerCase() === accent && v.gender === gender)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('listVoices with no filters returns all voices', async () => {
    const { selector } = makeSelector();
    const results = await selector.listVoices();
    expect(results).toHaveLength(SAMPLE_VOICES.length);
  });
});

// ---------------------------------------------------------------------------
// Property 30: Voice assignment round-trip (Task 18.3)
// Feature: wellflow-voice-wellness-assistant, Property 30: Voice assignment round-trip
// Validates: Requirements 12.5, 12.6
// ---------------------------------------------------------------------------

const ACTIVITY_TYPES: ActivityType[] = ['BREATHING_EXERCISE', 'MINDFULNESS_SESSION', 'STRESS_RELIEF', 'ROUTINE_REMINDER'];

describe('VoiceSelector — Property 30: Voice assignment round-trip', () => {
  it('assignVoice then getVoiceForActivity returns the assigned voiceId', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ACTIVITY_TYPES),
        fc.string({ minLength: 1 }),
        (activityType, voiceId) => {
          const { selector } = makeSelector();
          selector.assignVoice(activityType, voiceId);
          expect(selector.getVoiceForActivity(activityType)).toBe(voiceId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('getVoiceForActivity returns null when no assignment exists', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ACTIVITY_TYPES),
        (activityType) => {
          const { selector } = makeSelector();
          expect(selector.getVoiceForActivity(activityType)).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('setFallbackVoice stores the fallback voiceId', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (voiceId) => {
          const { selector } = makeSelector();
          selector.setFallbackVoice(voiceId);
          expect(selector.getCurrentProfile().fallbackVoiceId).toBe(voiceId);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 32: VoiceProfile persistence round-trip (Task 18.4)
// Feature: wellflow-voice-wellness-assistant, Property 32: VoiceProfile persistence round-trip
// Validates: Requirements 12.10, 12.11
// ---------------------------------------------------------------------------

describe('VoiceSelector — Property 32: VoiceProfile persistence round-trip', () => {
  it('saveVoiceProfile then loadVoiceProfile restores all assignments', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...ACTIVITY_TYPES),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        async (activityType, voiceId, fallbackId) => {
          const store = makeStore();
          const ws = makeMockWs();
          const rl = makeMockRl();
          const { callbacks } = makeCallbacks();

          const selector1 = new VoiceSelector(store, ws as unknown as WebSocketManager, rl, callbacks, SAMPLE_VOICES);
          selector1.assignVoice(activityType, voiceId);
          selector1.setFallbackVoice(fallbackId);
          await selector1.saveVoiceProfile('user-1');

          const selector2 = new VoiceSelector(store, ws as unknown as WebSocketManager, rl, callbacks, SAMPLE_VOICES);
          await selector2.loadVoiceProfile('user-1');

          expect(selector2.getVoiceForActivity(activityType)).toBe(voiceId);
          expect(selector2.getCurrentProfile().fallbackVoiceId).toBe(fallbackId);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 33: Preview triggers correct API call (Task 19.2)
// Feature: wellflow-voice-wellness-assistant, Property 33: Preview triggers correct API call
// Validates: Requirements 12.3
// ---------------------------------------------------------------------------

describe('VoiceSelector — Property 33: Preview triggers correct API call', () => {
  it('previewVoice sends a TTS request with the correct voiceId', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (voiceId) => {
          const { selector, ws } = makeSelector();
          await selector.previewVoice(voiceId);
          expect(ws.send).toHaveBeenCalled();
          const payload = ws.send.mock.calls[ws.send.mock.calls.length - 1][0];
          expect(payload.voiceId).toBe(voiceId);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit test: preview error flow (Task 19.3)
// Requirements: 12.4
// ---------------------------------------------------------------------------

describe('VoiceSelector — preview error flow', () => {
  it('emits onPreviewError and does not throw when TTS API errors during preview', async () => {
    const store = makeStore();
    const ws = makeMockWs();
    ws.send.mockImplementation(() => { throw new Error('API error'); });
    const rl = makeMockRl();
    const { callbacks, errors } = makeCallbacks();
    const selector = new VoiceSelector(store, ws as unknown as WebSocketManager, rl, callbacks, SAMPLE_VOICES);

    await expect(selector.previewVoice('voice-x')).resolves.toBeUndefined();
    expect(errors).toHaveLength(1);
    expect(errors[0].voiceId).toBe('voice-x');
  });

  it('releases rate-limiter slot even on preview error', async () => {
    const store = makeStore();
    const ws = makeMockWs();
    ws.send.mockImplementation(() => { throw new Error('fail'); });
    const rl = makeMockRl();
    const { callbacks } = makeCallbacks();
    const selector = new VoiceSelector(store, ws as unknown as WebSocketManager, rl, callbacks, SAMPLE_VOICES);

    await selector.previewVoice('v1');
    expect(rl.release).toHaveBeenCalled();
  });
});
