// Tests for ConversationEngine (Requirements 2.1–2.5, 10.1, 10.3)

import { ConversationEngine } from './ConversationEngine';
import { WellnessIntent } from '../types';

describe('ConversationEngine', () => {
  let engine: ConversationEngine;

  beforeEach(() => {
    engine = new ConversationEngine();
  });

  // ----------------------------------------------------------------
  // Intent classification
  // ----------------------------------------------------------------

  describe('processInput — intent classification', () => {
    const cases: Array<[string, WellnessIntent]> = [
      ['I want to do some breathing', { type: 'BREATHING_EXERCISE' }],
      ['Can we do a breathing exercise?', { type: 'BREATHING_EXERCISE' }],
      ['Let me try breath work', { type: 'BREATHING_EXERCISE' }],
      ['Start a mindfulness session', { type: 'MINDFULNESS_SESSION' }],
      ['I want to meditate', { type: 'MINDFULNESS_SESSION' }],
      ['Guide me through meditation', { type: 'MINDFULNESS_SESSION' }],
      ['I feel stressed', { type: 'STRESS_RELIEF' }],
      ['I am anxious today', { type: 'STRESS_RELIEF' }],
      ['Help me relax', { type: 'STRESS_RELIEF' }],
      ['I have anxiety', { type: 'STRESS_RELIEF' }],
      ['Set a reminder for me', { type: 'ROUTINE_REMINDER', action: 'set' }],
      ['Schedule a reminder', { type: 'ROUTINE_REMINDER', action: 'set' }],
      ['Remind me to exercise', { type: 'ROUTINE_REMINDER', action: 'set' }],
      ['List reminders', { type: 'ROUTINE_REMINDER', action: 'view' }],
      ['Show reminders', { type: 'ROUTINE_REMINDER', action: 'view' }],
      ['Delete reminder', { type: 'ROUTINE_REMINDER', action: 'delete' }],
      ['Remove reminder', { type: 'ROUTINE_REMINDER', action: 'delete' }],
      ['End the session', { type: 'END_SESSION' }],
      ['Stop', { type: 'END_SESSION' }],
      ['Goodbye', { type: 'END_SESSION' }],
      ['Bye', { type: 'END_SESSION' }],
      ['This is a crisis', { type: 'CRISIS_SUPPORT' }],
      ['Help me please', { type: 'CRISIS_SUPPORT' }],
      ['Emergency!', { type: 'CRISIS_SUPPORT' }],
      ['Join a community group', { type: 'COMMUNITY' }],
      ['Show me the challenge', { type: 'COMMUNITY' }],
      ['What group can I join?', { type: 'COMMUNITY' }],
    ];

    test.each(cases)('"%s" → %j', async (input, expectedIntent) => {
      const response = await engine.processInput(input, 'session-1');
      expect(response.intent).toEqual(expectedIntent);
    });

    it('returns UNKNOWN for unrecognized input', async () => {
      const response = await engine.processInput('What is the weather?', 'session-1');
      expect(response.intent).toEqual({ type: 'UNKNOWN' });
    });

    it('UNKNOWN response lists all available wellness options', async () => {
      const response = await engine.processInput('blah blah blah', 'session-1');
      expect(response.intent.type).toBe('UNKNOWN');
      // Must include a clarifying prompt with available options
      const text = response.responseText.toLowerCase();
      expect(text).toMatch(/breath/);
      expect(text).toMatch(/mindful/);
      expect(text).toMatch(/stress/);
      expect(text).toMatch(/remind/);
    });
  });

  // ----------------------------------------------------------------
  // Response structure
  // ----------------------------------------------------------------

  describe('processInput — response structure', () => {
    it('returns a ConversationResponse with intent, responseText, and language', async () => {
      const response = await engine.processInput('I want to breathe', 'session-1');
      expect(response).toHaveProperty('intent');
      expect(response).toHaveProperty('responseText');
      expect(response).toHaveProperty('language');
      expect(typeof response.responseText).toBe('string');
      expect(response.responseText.length).toBeGreaterThan(0);
    });

    it('language defaults to "en"', async () => {
      const response = await engine.processInput('hello', 'session-1');
      expect(response.language).toBe('en');
    });

    it('reflects the session language after setLanguage', async () => {
      engine.setLanguage('session-lang', 'fr');
      const response = await engine.processInput('bonjour', 'session-lang');
      expect(response.language).toBe('fr');
    });
  });

  // ----------------------------------------------------------------
  // Rolling context window
  // ----------------------------------------------------------------

  describe('rolling context window', () => {
    it('adds exchanges to the context after processInput', async () => {
      await engine.processInput('I want to breathe', 'session-ctx');
      const ctx = engine.getContext('session-ctx');
      // Each processInput adds 2 exchanges (user + assistant)
      expect(ctx.exchanges.length).toBe(2);
    });

    it('maintains up to 10 exchanges (rolling window)', async () => {
      const sessionId = 'session-rolling';
      // 5 calls × 2 exchanges = 10 exchanges (at the limit)
      for (let i = 0; i < 5; i++) {
        await engine.processInput('I want to breathe', sessionId);
      }
      expect(engine.getContext(sessionId).exchanges.length).toBe(10);

      // 6th call pushes it over; should still be capped at 10
      await engine.processInput('I want to breathe', sessionId);
      expect(engine.getContext(sessionId).exchanges.length).toBe(10);
    });

    it('drops oldest exchanges when window overflows', async () => {
      const sessionId = 'session-overflow';
      // Fill to exactly 10
      for (let i = 0; i < 5; i++) {
        await engine.processInput(`message ${i}`, sessionId);
      }
      const before = engine.getContext(sessionId).exchanges[0].text;

      // One more call should evict the oldest pair
      await engine.processInput('new message', sessionId);
      const after = engine.getContext(sessionId).exchanges[0].text;

      expect(after).not.toBe(before);
    });

    it('exchange roles alternate user/assistant', async () => {
      await engine.processInput('I want to breathe', 'session-roles');
      const ctx = engine.getContext('session-roles');
      expect(ctx.exchanges[0].role).toBe('user');
      expect(ctx.exchanges[1].role).toBe('assistant');
    });
  });

  // ----------------------------------------------------------------
  // getContext
  // ----------------------------------------------------------------

  describe('getContext', () => {
    it('creates a new context for an unknown sessionId', () => {
      const ctx = engine.getContext('brand-new-session');
      expect(ctx.sessionId).toBe('brand-new-session');
      expect(ctx.exchanges).toEqual([]);
      expect(ctx.language).toBe('en');
      expect(ctx.stressRatings).toEqual([]);
    });

    it('returns the same context object on repeated calls', () => {
      const ctx1 = engine.getContext('same-session');
      const ctx2 = engine.getContext('same-session');
      expect(ctx1).toBe(ctx2);
    });

    it('isolates contexts between different sessions', async () => {
      await engine.processInput('I want to breathe', 'session-A');
      const ctxA = engine.getContext('session-A');
      const ctxB = engine.getContext('session-B');
      expect(ctxA.exchanges.length).toBeGreaterThan(0);
      expect(ctxB.exchanges.length).toBe(0);
    });
  });

  // ----------------------------------------------------------------
  // setLanguage / addStressRating
  // ----------------------------------------------------------------

  describe('setLanguage', () => {
    it('updates the language in the context', () => {
      engine.setLanguage('session-lang2', 'es');
      expect(engine.getContext('session-lang2').language).toBe('es');
    });
  });

  // ----------------------------------------------------------------
  // Task 10.1: Locale switching — TTS language propagation (Req 9.4)
  // ----------------------------------------------------------------

  describe('setLanguage — locale switching for TTS (Req 9.4)', () => {
    it('after setLanguage("es"), processInput returns language "es" (maps to es-ES in TTSEngine)', async () => {
      engine.setLanguage('session-locale-es', 'es');
      const response = await engine.processInput('I want to breathe', 'session-locale-es');
      // ConversationEngine returns the raw locale; TTSEngine maps 'es' → 'es-ES'
      expect(response.language).toBe('es');
    });

    it('after setLanguage("en"), processInput returns language "en" (maps to en-US in TTSEngine)', async () => {
      engine.setLanguage('session-locale-en', 'en');
      const response = await engine.processInput('I want to breathe', 'session-locale-en');
      // ConversationEngine returns the raw locale; TTSEngine maps 'en' → 'en-US'
      expect(response.language).toBe('en');
    });

    it('all responses after setLanguage("es") carry the updated locale', async () => {
      const sessionId = 'session-locale-es-multi';
      engine.setLanguage(sessionId, 'es');
      const r1 = await engine.processInput('I want to breathe', sessionId);
      const r2 = await engine.processInput('I feel stressed', sessionId);
      const r3 = await engine.processInput('Start a mindfulness session', sessionId);
      expect(r1.language).toBe('es');
      expect(r2.language).toBe('es');
      expect(r3.language).toBe('es');
    });

    it('all responses after setLanguage("en") carry the updated locale', async () => {
      const sessionId = 'session-locale-en-multi';
      // Start with es, then switch to en
      engine.setLanguage(sessionId, 'es');
      await engine.processInput('I want to breathe', sessionId);
      engine.setLanguage(sessionId, 'en');
      const r1 = await engine.processInput('I feel stressed', sessionId);
      const r2 = await engine.processInput('Start a mindfulness session', sessionId);
      expect(r1.language).toBe('en');
      expect(r2.language).toBe('en');
    });

    it('no response after locale switch carries the old locale', async () => {
      const sessionId = 'session-locale-switch-no-old';
      engine.setLanguage(sessionId, 'en');
      await engine.processInput('hello', sessionId);
      // Switch to es
      engine.setLanguage(sessionId, 'es');
      const r1 = await engine.processInput('I want to breathe', sessionId);
      const r2 = await engine.processInput('I feel stressed', sessionId);
      // None of the post-switch responses should carry the old locale 'en'
      expect(r1.language).not.toBe('en');
      expect(r2.language).not.toBe('en');
    });
  });

  describe('addStressRating', () => {
    it('appends a stress rating to the context', () => {
      engine.addStressRating('session-stress', 3);
      engine.addStressRating('session-stress', 5);
      expect(engine.getContext('session-stress').stressRatings).toEqual([3, 5]);
    });
  });

  // ----------------------------------------------------------------
  // Latency (Requirement 2.2)
  // ----------------------------------------------------------------

  describe('response latency', () => {
    it('resolves within 1 second', async () => {
      const start = Date.now();
      await engine.processInput('I want to breathe', 'session-latency');
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000);
    });
  });
});

import * as fc from 'fast-check';

// Feature: wellflow-voice-wellness-assistant, Property 3: Intent classification completeness
describe('Property 3: Intent classification completeness', () => {
  // Validates: Requirements 2.1, 2.3
  const VALID_INTENT_TYPES = new Set([
    'BREATHING_EXERCISE',
    'MINDFULNESS_SESSION',
    'STRESS_RELIEF',
    'ROUTINE_REMINDER',
    'GENERAL_WELLNESS',
    'END_SESSION',
    'CRISIS_SUPPORT',
    'COMMUNITY',
    'UNKNOWN',
  ]);

  it('always returns a valid WellnessIntent for any string input', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (input) => {
        const eng = new ConversationEngine();
        const response = await eng.processInput(input, 'prop3-session');
        expect(VALID_INTENT_TYPES.has(response.intent.type)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('UNKNOWN intent includes a clarifying prompt with available options', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (input) => {
        const eng = new ConversationEngine();
        const response = await eng.processInput(input, 'prop3-unknown-session');
        if (response.intent.type === 'UNKNOWN') {
          const text = response.responseText.toLowerCase();
          expect(text).toMatch(/breath/);
          expect(text).toMatch(/mindful/);
          expect(text).toMatch(/stress/);
          expect(text).toMatch(/remind/);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: wellflow-voice-wellness-assistant, Property 4: Response generation latency
describe('Property 4: Response generation latency', () => {
  // Validates: Requirements 2.2
  it('processInput resolves within 1000ms for any string input', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (input) => {
        const eng = new ConversationEngine();
        const start = Date.now();
        await eng.processInput(input, 'prop4-session');
        const elapsed = Date.now() - start;
        expect(elapsed).toBeLessThan(1000);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: wellflow-voice-wellness-assistant, Property 5: Conversational context window
describe('Property 5: Conversational context window', () => {
  // Validates: Requirements 2.4
  it('context window never exceeds 10 exchanges and equals min(n*2, 10) after n calls', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 20 }), async (n) => {
        const eng = new ConversationEngine();
        const sessionId = 'prop5-session';
        for (let i = 0; i < n; i++) {
          await eng.processInput(`message ${i}`, sessionId);
        }
        const ctx = eng.getContext(sessionId);
        const expected = Math.min(n * 2, 10);
        expect(ctx.exchanges.length).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });
});

// ----------------------------------------------------------------
// Task 37.3: Suggestion feedback wiring (Requirement 18.6)
// ----------------------------------------------------------------

import { PersonalizationEngine } from './PersonalizationEngine';
import { ProfileStore } from '../store/ProfileStore';
import { PendingSuggestion } from '../types';

describe('ConversationEngine — suggestion feedback (Req 18.6)', () => {
  let profileStore: ProfileStore;
  let personalizationEngine: PersonalizationEngine;
  let engineWithPE: ConversationEngine;

  beforeEach(() => {
    profileStore = new ProfileStore();
    personalizationEngine = new PersonalizationEngine(profileStore);
    engineWithPE = new ConversationEngine(undefined, personalizationEngine);
  });

  const pendingSuggestion: PendingSuggestion = {
    activityType: 'BREATHING_EXERCISE',
    triggeredBy: 'SESSION_OPEN',
    userId: 'user-1',
  };

  it('records ACCEPTED feedback when user says "yes" with a pending suggestion', async () => {
    const recordSpy = jest.spyOn(personalizationEngine, 'recordFeedback');
    engineWithPE.setPendingSuggestion('session-fb', pendingSuggestion);

    await engineWithPE.processInput('yes', 'session-fb');

    expect(recordSpy).toHaveBeenCalledTimes(1);
    const feedback = recordSpy.mock.calls[0][0];
    expect(feedback.signal).toBe('ACCEPTED');
    expect(feedback.activityType).toBe('BREATHING_EXERCISE');
    expect(feedback.userId).toBe('user-1');
  });

  it('records DISMISSED feedback when user says "no" with a pending suggestion', async () => {
    const recordSpy = jest.spyOn(personalizationEngine, 'recordFeedback');
    engineWithPE.setPendingSuggestion('session-fb2', pendingSuggestion);

    await engineWithPE.processInput('no', 'session-fb2');

    expect(recordSpy).toHaveBeenCalledTimes(1);
    const feedback = recordSpy.mock.calls[0][0];
    expect(feedback.signal).toBe('DISMISSED');
    expect(feedback.activityType).toBe('BREATHING_EXERCISE');
  });

  it('records DISMISSED feedback for "skip" keyword', async () => {
    const recordSpy = jest.spyOn(personalizationEngine, 'recordFeedback');
    engineWithPE.setPendingSuggestion('session-fb3', pendingSuggestion);

    await engineWithPE.processInput('skip', 'session-fb3');

    expect(recordSpy).toHaveBeenCalledTimes(1);
    expect(recordSpy.mock.calls[0][0].signal).toBe('DISMISSED');
  });

  it('records ACCEPTED feedback for "sure" keyword', async () => {
    const recordSpy = jest.spyOn(personalizationEngine, 'recordFeedback');
    engineWithPE.setPendingSuggestion('session-fb4', pendingSuggestion);

    await engineWithPE.processInput('sure', 'session-fb4');

    expect(recordSpy).toHaveBeenCalledTimes(1);
    expect(recordSpy.mock.calls[0][0].signal).toBe('ACCEPTED');
  });

  it('does NOT record feedback when there is no pending suggestion', async () => {
    const recordSpy = jest.spyOn(personalizationEngine, 'recordFeedback');

    await engineWithPE.processInput('yes', 'session-no-pending');

    expect(recordSpy).not.toHaveBeenCalled();
  });

  it('clears the pending suggestion after feedback is recorded', async () => {
    engineWithPE.setPendingSuggestion('session-clear', pendingSuggestion);
    await engineWithPE.processInput('yes', 'session-clear');

    const ctx = engineWithPE.getContext('session-clear');
    expect(ctx.pendingSuggestion).toBeUndefined();
  });

  it('does NOT record feedback when no PersonalizationEngine is provided', async () => {
    const engineNoPE = new ConversationEngine();
    engineNoPE.setPendingSuggestion('session-nope', pendingSuggestion);

    // Should not throw
    await expect(engineNoPE.processInput('yes', 'session-nope')).resolves.toBeDefined();
  });

  it('does not record feedback for unrecognized responses even with a pending suggestion', async () => {
    const recordSpy = jest.spyOn(personalizationEngine, 'recordFeedback');
    engineWithPE.setPendingSuggestion('session-unrecog', pendingSuggestion);

    await engineWithPE.processInput('I want to breathe', 'session-unrecog');

    expect(recordSpy).not.toHaveBeenCalled();
  });
});

// ----------------------------------------------------------------
// Task 47.1: COMMUNITY intent routing to CommunityManager
// Requirements: 20.1, 20.4, 20.5
// ----------------------------------------------------------------

import { CommunityManager } from './CommunityManager';

describe('ConversationEngine — COMMUNITY intent routing (Req 20.1, 20.4, 20.5)', () => {
  let communityManager: CommunityManager;
  let engineWithCM: ConversationEngine;

  beforeEach(() => {
    communityManager = new CommunityManager();
    engineWithCM = new ConversationEngine(undefined, undefined, communityManager);
  });

  it('routes "view feed" transcript to CommunityManager.getFeed (Req 20.4)', async () => {
    const getFeedSpy = jest.spyOn(communityManager, 'getFeed').mockResolvedValue([]);
    const response = await engineWithCM.processInput('view feed', 'session-cm-1');
    expect(response.intent).toEqual({ type: 'COMMUNITY' });
    expect(getFeedSpy).toHaveBeenCalledWith('session-cm-1', 10);
  });

  it('routes "activity feed" transcript to CommunityManager.getFeed (Req 20.4)', async () => {
    const getFeedSpy = jest.spyOn(communityManager, 'getFeed').mockResolvedValue([]);
    await engineWithCM.processInput('show me the activity feed', 'session-cm-2');
    expect(getFeedSpy).toHaveBeenCalledWith('session-cm-2', 10);
  });

  it('routes "create group" transcript to CommunityManager.createGroup (Req 20.1)', async () => {
    const createGroupSpy = jest.spyOn(communityManager, 'createGroup').mockResolvedValue({
      groupId: 'g1', groupCode: 'ABC123', name: 'Wellness Warriors', memberIds: [], createdAt: new Date(),
    });
    await engineWithCM.processInput('create group called Wellness Warriors', 'session-cm-3');
    expect(createGroupSpy).toHaveBeenCalledWith('session-cm-3', 'wellness warriors');
  });

  it('uses default group name when no name is provided in "create group" (Req 20.1)', async () => {
    const createGroupSpy = jest.spyOn(communityManager, 'createGroup').mockResolvedValue({
      groupId: 'g2', groupCode: 'DEF456', name: 'My Wellness Group', memberIds: [], createdAt: new Date(),
    });
    await engineWithCM.processInput('create group', 'session-cm-4');
    expect(createGroupSpy).toHaveBeenCalledWith('session-cm-4', 'My Wellness Group');
  });

  it('routes "join group" with a 6-char code to CommunityManager.joinGroup (Req 20.1)', async () => {
    const joinGroupSpy = jest.spyOn(communityManager, 'joinGroup').mockResolvedValue({
      groupId: 'g3', groupCode: 'XYZ789', name: 'Test Group', memberIds: [], createdAt: new Date(),
    });
    await engineWithCM.processInput('join group XYZ789', 'session-cm-5');
    expect(joinGroupSpy).toHaveBeenCalledWith('session-cm-5', 'XYZ789');
  });

  it('does not call joinGroup when no group code is present in transcript (Req 20.1)', async () => {
    const joinGroupSpy = jest.spyOn(communityManager, 'joinGroup');
    await engineWithCM.processInput('join group', 'session-cm-6');
    expect(joinGroupSpy).not.toHaveBeenCalled();
  });

  it('routes "create challenge" with groupId to CommunityManager.createChallenge (Req 20.5)', async () => {
    const createChallengeSpy = jest.spyOn(communityManager, 'createChallenge').mockResolvedValue({
      challengeId: 'ch1', groupId: 'group-abc', activityType: 'BREATHING',
      durationDays: 7, startDate: new Date(), endDate: new Date(),
      status: 'ACTIVE', optedInMemberIds: [], completionLog: {},
    });
    await engineWithCM.processInput('create challenge for group-abc 7-day', 'session-cm-7');
    expect(createChallengeSpy).toHaveBeenCalledWith(
      'session-cm-7',
      expect.stringContaining('group'),
      'STRESS_RELIEF',
      7,
    );
  });

  it('routes "opt in" with challengeId to CommunityManager.optInToChallenge (Req 20.5)', async () => {
    const optInSpy = jest.spyOn(communityManager, 'optInToChallenge').mockResolvedValue(undefined);
    await engineWithCM.processInput('opt in to challenge-abc123', 'session-cm-8');
    expect(optInSpy).toHaveBeenCalledWith('session-cm-8', expect.stringContaining('challenge'));
  });

  it('returns COMMUNITY intent for all community sub-actions', async () => {
    jest.spyOn(communityManager, 'getFeed').mockResolvedValue([]);
    const transcripts = [
      'view feed',
      'create group',
      'join group',
      'create challenge',
      'opt in',
    ];
    for (const transcript of transcripts) {
      const response = await engineWithCM.processInput(transcript, `session-cm-intent-${transcript}`);
      expect(response.intent).toEqual({ type: 'COMMUNITY' });
    }
  });

  it('does not call CommunityManager methods when no communityManager is injected', async () => {
    const engineNoCM = new ConversationEngine();
    // Should not throw
    await expect(engineNoCM.processInput('view feed', 'session-no-cm')).resolves.toBeDefined();
  });
});
