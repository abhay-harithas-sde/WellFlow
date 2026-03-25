// Feature: wellflow-voice-wellness-assistant
// Tests for MindfulnessGuide — Requirements 6.1–6.5

import { MindfulnessGuide, MindfulnessGuideCallbacks } from './MindfulnessGuide';
import * as fc from 'fast-check';

jest.useFakeTimers();

function makeCallbacks(): { callbacks: MindfulnessGuideCallbacks; segments: string[]; completions: string[] } {
  const segments: string[] = [];
  const completions: string[] = [];
  const callbacks: MindfulnessGuideCallbacks = {
    onSegment: (_sid, text) => segments.push(text),
    onComplete: (sid) => completions.push(sid),
  };
  return { callbacks, segments, completions };
}

// ---------------------------------------------------------------------------
// Property 15: Mindfulness session duration options (Task 13.2)
// Feature: wellflow-voice-wellness-assistant, Property 15: Mindfulness session duration options
// Validates: Requirements 6.1
// ---------------------------------------------------------------------------

describe('MindfulnessGuide — Property 15: Mindfulness session duration options', () => {
  it('startSession accepts 5, 10, and 15 minute durations and sets correct durationMinutes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(5 as const, 10 as const, 15 as const),
        fc.string({ minLength: 1 }),
        (duration, sessionId) => {
          const { callbacks } = makeCallbacks();
          const guide = new MindfulnessGuide(callbacks);

          const session = guide.startSession(duration, sessionId);

          expect(session.durationMinutes).toBe(duration);
          expect(session.status).toBe('active');

          guide.pause(sessionId);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 16: Mindfulness pause/resume round-trip (Task 13.3)
// Feature: wellflow-voice-wellness-assistant, Property 16: Mindfulness pause/resume round-trip
// Validates: Requirements 6.5
// ---------------------------------------------------------------------------

describe('MindfulnessGuide — Property 16: Mindfulness pause/resume round-trip', () => {
  it('pause sets status to paused and resume restores active status', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(5 as const, 10 as const, 15 as const),
        fc.string({ minLength: 1 }),
        (duration, sessionId) => {
          const { callbacks } = makeCallbacks();
          const guide = new MindfulnessGuide(callbacks);

          guide.startSession(duration, sessionId);
          const positionBefore = guide.getSession(sessionId)!.positionMs;

          guide.pause(sessionId);
          expect(guide.getSession(sessionId)!.status).toBe('paused');

          guide.resume(sessionId);
          const sessionAfter = guide.getSession(sessionId)!;
          expect(sessionAfter.status).toBe('active');
          // Position should be preserved (within 500ms tolerance — positionMs unchanged on pause)
          expect(sessionAfter.positionMs).toBe(positionBefore);

          guide.pause(sessionId);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('MindfulnessGuide — unit tests', () => {
  it('delivers a segment after SEGMENT_INTERVAL_MS', () => {
    const { callbacks, segments } = makeCallbacks();
    const guide = new MindfulnessGuide(callbacks);

    guide.startSession(5, 'sid');
    jest.advanceTimersByTime(30_000);

    expect(segments.length).toBeGreaterThanOrEqual(1);
    guide.pause('sid');
  });

  it('calls onComplete after full duration elapses', () => {
    const { callbacks, completions } = makeCallbacks();
    const guide = new MindfulnessGuide(callbacks);

    guide.startSession(5, 'sid');
    jest.advanceTimersByTime(5 * 60_000 + 30_000);

    expect(completions).toContain('sid');
  });

  it('does not deliver segments while paused', () => {
    const { callbacks, segments } = makeCallbacks();
    const guide = new MindfulnessGuide(callbacks);

    guide.startSession(5, 'sid');
    guide.pause('sid');
    const countAtPause = segments.length;

    jest.advanceTimersByTime(60_000);
    expect(segments.length).toBe(countAtPause);
  });

  it('resumes delivering segments after resume()', () => {
    const { callbacks, segments } = makeCallbacks();
    const guide = new MindfulnessGuide(callbacks);

    guide.startSession(5, 'sid');
    guide.pause('sid');
    guide.resume('sid');

    jest.advanceTimersByTime(30_000);
    expect(segments.length).toBeGreaterThanOrEqual(1);

    guide.pause('sid');
  });
});
