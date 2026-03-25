// Feature: wellflow-voice-wellness-assistant
// Tests for BreathingGuide — Requirements 5.1–5.5

import { BreathingGuide, BreathingGuideCallbacks, BreathingTechnique, BreathingPhase } from './BreathingGuide';
import * as fc from 'fast-check';

jest.useFakeTimers();

function makeCallbacks(): { callbacks: BreathingGuideCallbacks; phases: BreathingPhase[]; completions: string[]; stops: string[] } {
  const phases: BreathingPhase[] = [];
  const completions: string[] = [];
  const stops: string[] = [];
  const callbacks: BreathingGuideCallbacks = {
    onPhaseTransition: (_sid, phase) => phases.push(phase),
    onComplete: (sid) => completions.push(sid),
    onStopped: (sid) => stops.push(sid),
  };
  return { callbacks, phases, completions, stops };
}

// ---------------------------------------------------------------------------
// Property 12: Breathing technique options (Task 12.2)
// Feature: wellflow-voice-wellness-assistant, Property 12: Breathing technique options
// Validates: Requirements 5.1
// ---------------------------------------------------------------------------

describe('BreathingGuide — Property 12: Breathing technique options', () => {
  it('listTechniques returns at least 3 techniques including BOX, 4-7-8, and DIAPHRAGMATIC', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const { callbacks } = makeCallbacks();
        const guide = new BreathingGuide(callbacks);
        const techniques = guide.listTechniques();

        expect(techniques.length).toBeGreaterThanOrEqual(3);
        const ids = techniques.map((t) => t.id);
        expect(ids).toContain('BOX');
        expect(ids).toContain('4-7-8');
        expect(ids).toContain('DIAPHRAGMATIC');
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 13: Breathing phase transition timing (Task 12.3)
// Feature: wellflow-voice-wellness-assistant, Property 13: Breathing phase transition timing
// Validates: Requirements 5.3
// ---------------------------------------------------------------------------

describe('BreathingGuide — Property 13: Breathing phase transition timing', () => {
  it('onPhaseTransition is called synchronously (within ±200ms) when a phase starts', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('BOX' as const, '4-7-8' as const, 'DIAPHRAGMATIC' as const),
        (techniqueId) => {
          const { callbacks, phases } = makeCallbacks();
          const guide = new BreathingGuide(callbacks);
          const technique = guide.listTechniques().find((t) => t.id === techniqueId)!;

          const t0 = performance.now();
          guide.startExercise(technique, 'session-1');
          const elapsed = performance.now() - t0;

          // First phase announced synchronously — well within 200ms
          expect(phases).toHaveLength(1);
          expect(elapsed).toBeLessThanOrEqual(200);

          // Cleanup
          guide.stopExercise('session-1');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14: Breathing exercise early stop (Task 12.4)
// Feature: wellflow-voice-wellness-assistant, Property 14: Breathing exercise early stop
// Validates: Requirements 5.5
// ---------------------------------------------------------------------------

describe('BreathingGuide — Property 14: Breathing exercise early stop', () => {
  it('stopExercise immediately sets status to stopped and calls onStopped', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('BOX' as const, '4-7-8' as const, 'DIAPHRAGMATIC' as const),
        fc.string({ minLength: 1 }),
        (techniqueId, sessionId) => {
          const { callbacks, stops, completions } = makeCallbacks();
          const guide = new BreathingGuide(callbacks);
          const technique = guide.listTechniques().find((t) => t.id === techniqueId)!;

          guide.startExercise(technique, sessionId);
          guide.stopExercise(sessionId);

          expect(stops).toContain(sessionId);
          expect(completions).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('BreathingGuide — unit tests', () => {
  it('announces first phase immediately on startExercise', () => {
    const { callbacks, phases } = makeCallbacks();
    const guide = new BreathingGuide(callbacks);
    const technique = guide.listTechniques()[0];

    guide.startExercise(technique, 'sid');

    expect(phases).toHaveLength(1);
    expect(phases[0].label).toBe('inhale');

    guide.stopExercise('sid');
  });

  it('advances to next phase after timer fires', () => {
    const { callbacks, phases } = makeCallbacks();
    const guide = new BreathingGuide(callbacks);
    const technique = guide.listTechniques().find((t) => t.id === 'BOX')!;

    guide.startExercise(technique, 'sid');
    expect(phases).toHaveLength(1);

    jest.advanceTimersByTime(technique.phases[0].durationMs);
    expect(phases).toHaveLength(2);

    guide.stopExercise('sid');
  });

  it('calls onComplete after all cycles finish', () => {
    const { callbacks, completions } = makeCallbacks();
    const guide = new BreathingGuide(callbacks);
    const technique = guide.listTechniques().find((t) => t.id === 'BOX')!;
    const totalMs = technique.phases.reduce((s, p) => s + p.durationMs, 0) * 4; // 4 cycles

    guide.startExercise(technique, 'sid');
    jest.advanceTimersByTime(totalMs);

    expect(completions).toContain('sid');
  });

  it('does not call onComplete after early stop', () => {
    const { callbacks, completions } = makeCallbacks();
    const guide = new BreathingGuide(callbacks);
    const technique = guide.listTechniques().find((t) => t.id === 'BOX')!;

    guide.startExercise(technique, 'sid');
    guide.stopExercise('sid');
    jest.runAllTimers();

    expect(completions).toHaveLength(0);
  });
});
