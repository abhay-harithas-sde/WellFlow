// Feature: website-completion-murf-wellflow
// Unit tests for useMindfulnessGuide hook (Requirements 15.4, 15.5)

import { MindfulnessGuide } from './MindfulnessGuide';

// Test the MindfulnessGuide class directly (the hook wraps it)
// since hooks require a React environment

describe('useMindfulnessGuide — MindfulnessGuide integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('delivers a segment after the first interval', () => {
    const onSegment = jest.fn();
    const onComplete = jest.fn();

    const guide = new MindfulnessGuide({ onSegment, onComplete });
    guide.startSession(5, 'test-session');

    jest.advanceTimersByTime(30_000);

    expect(onSegment).toHaveBeenCalledTimes(1);
    expect(typeof onSegment.mock.calls[0][1]).toBe('string');
    expect(onSegment.mock.calls[0][1].length).toBeGreaterThan(0);
  });

  it('delivers multiple segments over time', () => {
    const onSegment = jest.fn();
    const guide = new MindfulnessGuide({ onSegment, onComplete: jest.fn() });
    guide.startSession(5, 'test-session');

    // 5 minutes = 300s, segments every 30s → 10 segments
    jest.advanceTimersByTime(90_000);

    expect(onSegment).toHaveBeenCalledTimes(3);
  });

  it('calls onComplete after the full duration', () => {
    const onComplete = jest.fn();
    const guide = new MindfulnessGuide({ onSegment: jest.fn(), onComplete });
    guide.startSession(5, 'test-session');

    // 5 minutes = 300_000ms
    jest.advanceTimersByTime(300_000);

    expect(onComplete).toHaveBeenCalledWith('test-session');
  });

  it('pause stops segment delivery', () => {
    const onSegment = jest.fn();
    const guide = new MindfulnessGuide({ onSegment, onComplete: jest.fn() });
    guide.startSession(5, 'test-session');

    guide.pause('test-session');
    jest.advanceTimersByTime(90_000);

    expect(onSegment).not.toHaveBeenCalled();
  });

  it('resume continues segment delivery after pause', () => {
    const onSegment = jest.fn();
    const guide = new MindfulnessGuide({ onSegment, onComplete: jest.fn() });
    guide.startSession(5, 'test-session');

    guide.pause('test-session');
    jest.advanceTimersByTime(30_000);
    expect(onSegment).not.toHaveBeenCalled();

    guide.resume('test-session');
    jest.advanceTimersByTime(30_000);
    expect(onSegment).toHaveBeenCalledTimes(1);
  });

  it('supports 5, 10, and 15 minute durations', () => {
    const durations: Array<5 | 10 | 15> = [5, 10, 15];

    for (const duration of durations) {
      const onComplete = jest.fn();
      const guide = new MindfulnessGuide({ onSegment: jest.fn(), onComplete });
      guide.startSession(duration, `session-${duration}`);

      jest.advanceTimersByTime(duration * 60_000);
      expect(onComplete).toHaveBeenCalledWith(`session-${duration}`);
    }
  });

  it('starting a new session replaces the previous one', () => {
    const onSegment = jest.fn();
    const guide = new MindfulnessGuide({ onSegment, onComplete: jest.fn() });

    guide.startSession(5, 'session-1');
    guide.startSession(5, 'session-1'); // restart

    jest.advanceTimersByTime(30_000);

    // Should still deliver segments (not broken by restart)
    expect(onSegment).toHaveBeenCalledTimes(1);
  });

  it('getSession returns null after completion', () => {
    const guide = new MindfulnessGuide({ onSegment: jest.fn(), onComplete: jest.fn() });
    guide.startSession(5, 'test-session');

    jest.advanceTimersByTime(300_000);

    expect(guide.getSession('test-session')).toBeNull();
  });
});
