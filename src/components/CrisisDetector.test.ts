// Feature: wellflow-voice-wellness-assistant
// Tests for CrisisDetector — Requirements 19.1–19.8

import { CrisisDetector } from './CrisisDetector';
import { ProfileStore } from '../store/ProfileStore';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Property 57: Crisis signal detection completeness (Task 41.2)
// Feature: wellflow-voice-wellness-assistant, Property 57: Crisis signal detection completeness
// Validates: Requirements 19.1
// ---------------------------------------------------------------------------

describe('CrisisDetector — Property 57: Crisis signal detection completeness', () => {
  const CRISIS_PHRASES = [
    "I want to die",
    "I can't go on",
    "I want to hurt myself",
    "end my life",
    "kill myself",
    "emergency",
    "hurt myself",
    "crisis",
  ];

  it('detects a crisis signal for known crisis phrases', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CRISIS_PHRASES),
        (phrase) => {
          const store = new ProfileStore();
          const detector = new CrisisDetector(store);
          const result = detector.analyze(phrase, 'session-1');
          expect(result).not.toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns null for non-crisis phrases', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'I want to do breathing exercises',
          'help me relax',
          'I feel stressed',
          'good morning',
          'start a mindfulness session',
        ),
        (phrase) => {
          const store = new ProfileStore();
          const detector = new CrisisDetector(store);
          const result = detector.analyze(phrase, 'session-1');
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 59: Crisis event log excludes conversation content (Task 41.3)
// Feature: wellflow-voice-wellness-assistant, Property 59: Crisis event log excludes conversation content
// Validates: Requirements 19.5
// ---------------------------------------------------------------------------

describe('CrisisDetector — Property 59: Crisis event log excludes conversation content', () => {
  it('logged CrisisEvent contains userId, timestamp, signalType but no conversation content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.constantFrom('SELF_HARM' as const, 'SUICIDAL_IDEATION' as const, 'EMERGENCY' as const, 'GENERAL_CRISIS' as const),
        async (userId, signalType) => {
          const store = new ProfileStore();
          const detector = new CrisisDetector(store);

          await detector.logCrisisEvent(userId, signalType);

          const events = detector.getCrisisEvents();
          const event = events[events.length - 1];

          expect(event.userId).toBe(userId);
          expect(event.signalType).toBe(signalType);
          expect(event.timestamp).toBeInstanceOf(Date);
          expect(event.eventId).toBeTruthy();

          // Verify no conversation content fields exist
          const keys = Object.keys(event);
          expect(keys).not.toContain('transcript');
          expect(keys).not.toContain('conversationContent');
          expect(keys).not.toContain('text');
          expect(keys).not.toContain('message');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 61: Crisis detection in text-fallback mode (Task 41.4)
// Feature: wellflow-voice-wellness-assistant, Property 61: Crisis detection in text-fallback mode
// Validates: Requirements 19.7
// ---------------------------------------------------------------------------

describe('CrisisDetector — Property 61: Crisis detection in text-fallback mode', () => {
  it('analyze detects crisis signals from typed text input (same as voice)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom("I want to die", "I can't go on", "emergency", "hurt myself"),
        (typedText) => {
          const store = new ProfileStore();
          const detector = new CrisisDetector(store);
          // Text-fallback mode: same analyze() method handles typed text
          const result = detector.analyze(typedText, 'session-1');
          expect(result).not.toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('CrisisDetector — unit tests', () => {
  it('getEmergencyResources includes 988 Lifeline and 911', () => {
    const store = new ProfileStore();
    const detector = new CrisisDetector(store);
    const resources = detector.getEmergencyResources();

    const phoneNumbers = resources.map((r) => r.phoneNumber);
    expect(phoneNumbers).toContain('988');
    expect(phoneNumbers).toContain('911');
  });

  it('getEmergencyResources returns at least 2 resources', () => {
    const store = new ProfileStore();
    const detector = new CrisisDetector(store);
    expect(detector.getEmergencyResources().length).toBeGreaterThanOrEqual(2);
  });

  it('logCrisisEvent stores the event', async () => {
    const store = new ProfileStore();
    const detector = new CrisisDetector(store);
    await detector.logCrisisEvent('user-1', 'EMERGENCY');
    expect(detector.getCrisisEvents()).toHaveLength(1);
  });

  it('case-insensitive detection', () => {
    const store = new ProfileStore();
    const detector = new CrisisDetector(store);
    expect(detector.analyze('I WANT TO DIE', 'sid')).not.toBeNull();
    expect(detector.analyze('EMERGENCY', 'sid')).not.toBeNull();
  });
});
