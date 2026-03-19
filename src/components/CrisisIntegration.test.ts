// Feature: wellflow-voice-wellness-assistant
// Tests for Crisis_Detector wired into Conversation_Engine — Requirements 19.1–19.8

import { ConversationEngine } from './ConversationEngine';
import { CrisisDetector } from './CrisisDetector';
import { ProfileStore } from '../store/ProfileStore';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Property 58: Crisis session interruption (Task 42.2)
// Feature: wellflow-voice-wellness-assistant, Property 58: Crisis session interruption
// Validates: Requirements 19.1, 19.2
// ---------------------------------------------------------------------------

describe('ConversationEngine + CrisisDetector — Property 58: Crisis session interruption', () => {
  const CRISIS_PHRASES = [
    "I want to die",
    "I can't go on",
    "I want to hurt myself",
    "emergency",
    "end my life",
  ];

  it('crisis phrase triggers CRISIS_SUPPORT intent and empathetic response with resources', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...CRISIS_PHRASES),
        async (phrase) => {
          const store = new ProfileStore();
          const detector = new CrisisDetector(store);
          const engine = new ConversationEngine(detector);

          const response = await engine.processInput(phrase, 'session-1');

          expect(response.intent.type).toBe('CRISIS_SUPPORT');
          expect(response.responseText).toContain('988');
          expect(response.responseText).toContain('911');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 60: Crisis exchange excluded from session history (Task 42.3)
// Feature: wellflow-voice-wellness-assistant, Property 60: Crisis exchange excluded from session history
// Validates: Requirements 19.6
// ---------------------------------------------------------------------------

describe('ConversationEngine + CrisisDetector — Property 60: Crisis exchange excluded from session history', () => {
  it('crisis exchange is NOT added to the session exchanges array', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("I want to die", "emergency", "I can't go on"),
        async (crisisPhrase) => {
          const store = new ProfileStore();
          const detector = new CrisisDetector(store);
          const engine = new ConversationEngine(detector);

          const sessionId = 'session-crisis';
          const contextBefore = engine.getContext(sessionId);
          const exchangesBefore = contextBefore.exchanges.length;

          await engine.processInput(crisisPhrase, sessionId);

          const contextAfter = engine.getContext(sessionId);
          // Crisis exchange must NOT be added to session history (Req 19.6)
          expect(contextAfter.exchanges.length).toBe(exchangesBefore);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('crisis event is logged after crisis response', async () => {
    const store = new ProfileStore();
    const detector = new CrisisDetector(store);
    const engine = new ConversationEngine(detector);

    await engine.processInput("I want to die", 'session-1');

    expect(detector.getCrisisEvents()).toHaveLength(1);
    expect(detector.getCrisisEvents()[0].signalType).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('ConversationEngine + CrisisDetector — unit tests', () => {
  it('non-crisis input still routes to normal intent classification', async () => {
    const store = new ProfileStore();
    const detector = new CrisisDetector(store);
    const engine = new ConversationEngine(detector);

    const response = await engine.processInput('I want to do breathing exercises', 'session-1');
    expect(response.intent.type).toBe('BREATHING_EXERCISE');
  });

  it('works without CrisisDetector (backward compatible)', async () => {
    const engine = new ConversationEngine();
    const response = await engine.processInput('I want to breathe', 'session-1');
    expect(response.intent.type).toBe('BREATHING_EXERCISE');
  });
});
