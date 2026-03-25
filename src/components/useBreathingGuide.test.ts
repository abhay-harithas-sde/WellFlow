// Feature: website-completion-murf-wellflow
// Unit tests for useBreathingGuide hook (Requirements 15.1, 15.2, 15.3)

import { BreathingGuide, BreathingPhase, BreathingTechnique } from './BreathingGuide';

// Test the BreathingGuide class directly (the hook wraps it)
// since hooks require a React environment

describe('useBreathingGuide — BreathingGuide integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls onPhaseTransition with the first phase immediately on start', () => {
    const onPhaseTransition = jest.fn();
    const onComplete = jest.fn();
    const onStopped = jest.fn();

    const guide = new BreathingGuide({ onPhaseTransition, onComplete, onStopped });
    const [technique] = guide.listTechniques(); // BOX
    guide.startExercise(technique, 'test-session');

    expect(onPhaseTransition).toHaveBeenCalledTimes(1);
    expect(onPhaseTransition).toHaveBeenCalledWith('test-session', technique.phases[0]);
  });

  it('transitions through all phases in order', () => {
    const phases: BreathingPhase[] = [];
    const guide = new BreathingGuide({
      onPhaseTransition: (_id, phase) => phases.push(phase),
      onComplete: jest.fn(),
      onStopped: jest.fn(),
    });

    const [technique] = guide.listTechniques(); // BOX: 4 phases
    guide.startExercise(technique, 'test-session');

    // Advance through all phases of the first cycle
    for (const phase of technique.phases) {
      jest.advanceTimersByTime(phase.durationMs);
    }

    // First cycle: 4 phases emitted (first one synchronously, rest after timers)
    expect(phases.length).toBeGreaterThanOrEqual(technique.phases.length);
    expect(phases[0].label).toBe('inhale');
    expect(phases[1].label).toBe('hold');
    expect(phases[2].label).toBe('exhale');
    expect(phases[3].label).toBe('hold');
  });

  it('stopExercise halts the session and calls onStopped', () => {
    const onStopped = jest.fn();
    const onPhaseTransition = jest.fn();
    const guide = new BreathingGuide({
      onPhaseTransition,
      onComplete: jest.fn(),
      onStopped,
    });

    const [technique] = guide.listTechniques();
    guide.startExercise(technique, 'test-session');
    guide.stopExercise('test-session');

    expect(onStopped).toHaveBeenCalledWith('test-session');

    // No further transitions after stop
    const callCount = onPhaseTransition.mock.calls.length;
    jest.advanceTimersByTime(10000);
    expect(onPhaseTransition.mock.calls.length).toBe(callCount);
  });

  it('supports BOX, 4-7-8, and DIAPHRAGMATIC techniques', () => {
    const guide = new BreathingGuide({
      onPhaseTransition: jest.fn(),
      onComplete: jest.fn(),
      onStopped: jest.fn(),
    });

    const techniques = guide.listTechniques();
    const ids = techniques.map((t) => t.id);
    expect(ids).toContain('BOX');
    expect(ids).toContain('4-7-8');
    expect(ids).toContain('DIAPHRAGMATIC');
  });

  it('starting a new session stops the previous one', () => {
    const onStopped = jest.fn();
    const guide = new BreathingGuide({
      onPhaseTransition: jest.fn(),
      onComplete: jest.fn(),
      onStopped,
    });

    const [technique] = guide.listTechniques();
    guide.startExercise(technique, 'session-1');
    guide.startExercise(technique, 'session-1'); // restart same session

    expect(onStopped).toHaveBeenCalledWith('session-1');
  });

  it('calls onComplete after all cycles finish', () => {
    const onComplete = jest.fn();
    const guide = new BreathingGuide({
      onPhaseTransition: jest.fn(),
      onComplete,
      onStopped: jest.fn(),
    });

    const [technique] = guide.listTechniques(); // BOX: 4 phases × 4 cycles
    guide.startExercise(technique, 'test-session');

    // Total duration: 4 phases × 4000ms × 4 cycles = 64000ms
    jest.advanceTimersByTime(64000);

    expect(onComplete).toHaveBeenCalledWith('test-session');
  });
});
