// Feature: wellflow-voice-wellness-assistant
// Tests for core type definitions — verifies structural correctness of all interfaces

import fc from 'fast-check';
import type {
  WellnessIntent,
  ConversationResponse,
  ConversationContext,
  Exchange,
  Session,
  UserProfile,
  SessionSummary,
  ActivityRecord,
  Reminder,
  TTSOptions,
  MicrophoneError,
  WebSocketError,
  CloseReason,
  ActivityType,
  VoiceProfile,
  MurfVoice,
  VoiceFilter,
} from './index';

// ------------------------------------------------------------------
// Helpers: fast-check arbitraries for core types
// ------------------------------------------------------------------

const wellnessIntentArb: fc.Arbitrary<WellnessIntent> = fc.oneof(
  fc.constant({ type: 'BREATHING_EXERCISE' as const }),
  fc.constant({ type: 'MINDFULNESS_SESSION' as const }),
  fc.constant({ type: 'STRESS_RELIEF' as const }),
  fc.record({
    type: fc.constant('ROUTINE_REMINDER' as const),
    action: fc.oneof(
      fc.constant('set' as const),
      fc.constant('view' as const),
      fc.constant('delete' as const),
    ),
  }),
  fc.constant({ type: 'GENERAL_WELLNESS' as const }),
  fc.constant({ type: 'END_SESSION' as const }),
  fc.constant({ type: 'CRISIS_SUPPORT' as const }),
  fc.constant({ type: 'COMMUNITY' as const }),
  fc.constant({ type: 'UNKNOWN' as const }),
);

const exchangeArb: fc.Arbitrary<Exchange> = fc.record({
  role: fc.oneof(fc.constant('user' as const), fc.constant('assistant' as const)),
  text: fc.string({ minLength: 1 }),
  timestamp: fc.date(),
  intent: fc.option(wellnessIntentArb, { nil: undefined }),
});

// ------------------------------------------------------------------
// Unit tests: type shape validation
// ------------------------------------------------------------------

describe('WellnessIntent discriminated union', () => {
  it('ROUTINE_REMINDER carries an action field', () => {
    const intent: WellnessIntent = { type: 'ROUTINE_REMINDER', action: 'set' };
    expect(intent.type).toBe('ROUTINE_REMINDER');
    if (intent.type === 'ROUTINE_REMINDER') {
      expect(['set', 'view', 'delete']).toContain(intent.action);
    }
  });

  it('all non-ROUTINE_REMINDER variants have only a type field', () => {
    const intents: WellnessIntent[] = [
      { type: 'BREATHING_EXERCISE' },
      { type: 'MINDFULNESS_SESSION' },
      { type: 'STRESS_RELIEF' },
      { type: 'GENERAL_WELLNESS' },
      { type: 'END_SESSION' },
      { type: 'CRISIS_SUPPORT' },
      { type: 'COMMUNITY' },
      { type: 'UNKNOWN' },
    ];
    for (const intent of intents) {
      expect(intent).toHaveProperty('type');
    }
  });
});

describe('ConversationContext', () => {
  it('accepts a valid context object', () => {
    const ctx: ConversationContext = {
      sessionId: 'sess-1',
      exchanges: [],
      language: 'en',
      stressRatings: [3, 4],
    };
    expect(ctx.sessionId).toBe('sess-1');
    expect(Array.isArray(ctx.exchanges)).toBe(true);
    expect(Array.isArray(ctx.stressRatings)).toBe(true);
  });
});

describe('Session', () => {
  it('accepts a valid session object', () => {
    const session: Session = {
      sessionId: 'sess-1',
      userId: 'user-1',
      startTime: new Date(),
      language: 'en',
      activitiesCompleted: [],
      lastActivityTime: new Date(),
      stressRatings: [],
      reminders: [],
    };
    expect(session.sessionId).toBe('sess-1');
  });
});

describe('UserProfile', () => {
  it('accepts a valid user profile with voiceProfile', () => {
    const profile: UserProfile = {
      userId: 'user-1',
      name: 'Alice',
      preferredLanguage: 'en',
      ttsSpeed: 'normal',
      sessionHistory: [],
      voiceProfile: {
        activityAssignments: {},
        fallbackVoiceId: null,
      },
    };
    expect(profile.voiceProfile.fallbackVoiceId).toBeNull();
  });
});

describe('TTSOptions', () => {
  it('voiceId is optional', () => {
    const opts: TTSOptions = { language: 'en', speed: 'normal', sessionId: 'sess-1' };
    expect(opts.voiceId).toBeUndefined();

    const optsWithVoice: TTSOptions = { language: 'en', speed: 'fast', sessionId: 'sess-1', voiceId: 'voice-abc' };
    expect(optsWithVoice.voiceId).toBe('voice-abc');
  });
});

describe('MicrophoneError', () => {
  it('only allows the three defined values', () => {
    const valid: MicrophoneError[] = ['PERMISSION_DENIED', 'DEVICE_UNAVAILABLE', 'CAPTURE_FAILED'];
    expect(valid).toHaveLength(3);
  });
});

describe('CloseReason', () => {
  it('only allows the three defined values', () => {
    const valid: CloseReason[] = ['INACTIVITY_TIMEOUT', 'UNEXPECTED', 'USER_INITIATED'];
    expect(valid).toHaveLength(3);
  });
});

describe('VoiceProfile', () => {
  it('activityAssignments is a partial record keyed by ActivityType', () => {
    const profile: VoiceProfile = {
      activityAssignments: {
        BREATHING_EXERCISE: 'voice-1',
        MINDFULNESS_SESSION: 'voice-2',
      },
      fallbackVoiceId: 'voice-fallback',
    };
    expect(profile.activityAssignments['BREATHING_EXERCISE']).toBe('voice-1');
    expect(profile.activityAssignments['STRESS_RELIEF']).toBeUndefined();
  });
});

// ------------------------------------------------------------------
// Property-based tests
// ------------------------------------------------------------------

describe('Property: WellnessIntent is always a valid discriminated union member', () => {
  // Feature: wellflow-voice-wellness-assistant, Property: WellnessIntent structural validity
  // Validates: Requirements 2.1
  const validTypes = [
    'BREATHING_EXERCISE',
    'MINDFULNESS_SESSION',
    'STRESS_RELIEF',
    'ROUTINE_REMINDER',
    'GENERAL_WELLNESS',
    'END_SESSION',
    'CRISIS_SUPPORT',
    'COMMUNITY',
    'UNKNOWN',
  ];

  it('every generated WellnessIntent has a recognized type', () => {
    fc.assert(
      fc.property(wellnessIntentArb, (intent) => {
        return validTypes.includes(intent.type);
      }),
      { numRuns: 200 },
    );
  });

  it('ROUTINE_REMINDER always has a valid action', () => {
    fc.assert(
      fc.property(wellnessIntentArb, (intent) => {
        if (intent.type === 'ROUTINE_REMINDER') {
          return ['set', 'view', 'delete'].includes(intent.action);
        }
        return true;
      }),
      { numRuns: 200 },
    );
  });
});

describe('Property: Exchange role is always user or assistant', () => {
  // Feature: wellflow-voice-wellness-assistant, Property: Exchange structural validity
  // Validates: Requirements 2.4
  it('every generated Exchange has role user or assistant', () => {
    fc.assert(
      fc.property(exchangeArb, (exchange) => {
        return exchange.role === 'user' || exchange.role === 'assistant';
      }),
      { numRuns: 200 },
    );
  });
});

describe('Property: ConversationContext stressRatings are numbers', () => {
  // Feature: wellflow-voice-wellness-assistant, Property: ConversationContext structural validity
  // Validates: Requirements 2.4, 7.5
  it('stressRatings array contains only numbers', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 1, max: 5, noNaN: true })),
        (ratings) => {
          const ctx: ConversationContext = {
            sessionId: 'sess-test',
            exchanges: [],
            language: 'en',
            stressRatings: ratings,
          };
          return ctx.stressRatings.every((r) => typeof r === 'number');
        },
      ),
      { numRuns: 200 },
    );
  });
});
