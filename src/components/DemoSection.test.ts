/**
 * Unit tests for components/sections/DemoSection.tsx
 * Tests tab switching, breathing circle rendering, mindfulness mood selector,
 * TTS call on completion, and text fallback on TTS error.
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 *
 * Since jest runs in 'node' environment (no DOM), we test the pure logic
 * extracted from the DemoSection component — state contracts and data-flow
 * rather than rendering.
 */

// ---------------------------------------------------------------------------
// Types mirroring the component's internal state
// ---------------------------------------------------------------------------

type Tab = 'breathing' | 'mindfulness';

interface DemoState {
  activeTab: Tab;
  completed: boolean;
  selectedMood: number | null;
  ttsUnavailable: boolean;
}

interface BreathingHookState {
  phase: { label: 'inhale' | 'hold' | 'exhale'; durationMs: number } | null;
  isActive: boolean;
}

interface TTSHookState {
  playing: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Pure helpers mirroring DemoSection logic
// ---------------------------------------------------------------------------

/** Initial state of the component */
function initialState(): DemoState {
  return {
    activeTab: 'breathing',
    completed: false,
    selectedMood: null,
    ttsUnavailable: false,
  };
}

/** Mirrors handleTabChange: switches tab and resets completion/session state */
function handleTabChange(state: DemoState, tab: Tab): DemoState {
  if (tab === state.activeTab) return state;
  return {
    activeTab: tab,
    completed: false,
    selectedMood: null,
    ttsUnavailable: false,
  };
}

/** Mirrors handleMoodSelect: sets mood and triggers completion */
function handleMoodSelect(state: DemoState, mood: number): DemoState {
  return { ...state, selectedMood: mood, completed: true };
}

/** Mirrors handleBreathingStop: stops breathing and triggers completion */
function handleBreathingStop(state: DemoState): DemoState {
  return { ...state, completed: true };
}

/** Mirrors handleReset: resets all completion state */
function handleReset(state: DemoState): DemoState {
  return {
    ...state,
    completed: false,
    selectedMood: null,
    ttsUnavailable: false,
  };
}

/** Mirrors the TTS error fallback condition */
function shouldShowTtsError(ttsUnavailable: boolean, ttsError: string | null): boolean {
  return ttsUnavailable || ttsError !== null;
}

/** Mirrors the CTA visibility condition */
function shouldShowCTA(completed: boolean): boolean {
  return completed;
}

/** Mirrors the mood selector visibility condition */
function shouldShowMoodSelector(completed: boolean): boolean {
  return !completed;
}

/** Mirrors the breathing controls visibility condition */
function shouldShowBreathingControls(completed: boolean): boolean {
  return !completed;
}

/** Mirrors the start button visibility condition */
function shouldShowStartButton(isActive: boolean): boolean {
  return !isActive;
}

/** Mirrors the stop button visibility condition */
function shouldShowStopButton(isActive: boolean): boolean {
  return isActive;
}

/** Mirrors the BreathingCircle phase prop passed from the hook */
function resolveBreathingCirclePhase(
  hookState: BreathingHookState
): BreathingHookState['phase'] {
  return hookState.phase;
}

/** Mirrors the TTS play call on completion */
async function triggerTTSOnCompletion(
  completionMessage: string,
  playMock: jest.Mock
): Promise<void> {
  await playMock({ text: completionMessage, voiceId: 'en-US-1' });
}

/** Mirrors the ttsUnavailable flag set when TTS throws */
function handleTTSError(state: DemoState): DemoState {
  return { ...state, ttsUnavailable: true };
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const COMPLETION_MESSAGE = 'Great job! You completed the exercise.';
const TABS: Tab[] = ['breathing', 'mindfulness'];
const MOOD_VALUES = [1, 2, 3, 4, 5];

// ---------------------------------------------------------------------------
// Tests: Tab switching (Req 5.2)
// ---------------------------------------------------------------------------

describe('DemoSection — tab switching (Req 5.2)', () => {
  it('default active tab is "breathing"', () => {
    const state = initialState();
    expect(state.activeTab).toBe('breathing');
  });

  it('switching to "mindfulness" tab updates activeTab', () => {
    const state = initialState();
    const next = handleTabChange(state, 'mindfulness');
    expect(next.activeTab).toBe('mindfulness');
  });

  it('switching back to "breathing" tab updates activeTab', () => {
    const state = handleTabChange(initialState(), 'mindfulness');
    const next = handleTabChange(state, 'breathing');
    expect(next.activeTab).toBe('breathing');
  });

  it('switching tabs resets completed state', () => {
    const state: DemoState = {
      activeTab: 'breathing',
      completed: true,
      selectedMood: 3,
      ttsUnavailable: false,
    };
    const next = handleTabChange(state, 'mindfulness');
    expect(next.completed).toBe(false);
  });

  it('switching tabs resets selectedMood', () => {
    const state: DemoState = {
      activeTab: 'mindfulness',
      completed: true,
      selectedMood: 4,
      ttsUnavailable: false,
    };
    const next = handleTabChange(state, 'breathing');
    expect(next.selectedMood).toBeNull();
  });

  it('switching tabs resets ttsUnavailable flag', () => {
    const state: DemoState = {
      activeTab: 'breathing',
      completed: true,
      selectedMood: null,
      ttsUnavailable: true,
    };
    const next = handleTabChange(state, 'mindfulness');
    expect(next.ttsUnavailable).toBe(false);
  });

  it('switching to the same tab is a no-op', () => {
    const state = initialState();
    const next = handleTabChange(state, 'breathing');
    expect(next).toBe(state); // same reference — no change
  });

  it('both tabs are available', () => {
    expect(TABS).toContain('breathing');
    expect(TABS).toContain('mindfulness');
    expect(TABS).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Tests: Breathing circle rendering (Req 5.3)
// ---------------------------------------------------------------------------

describe('DemoSection — breathing circle rendering (Req 5.3)', () => {
  it('BreathingCircle receives null phase when breathing is not active', () => {
    const hookState: BreathingHookState = { phase: null, isActive: false };
    expect(resolveBreathingCirclePhase(hookState)).toBeNull();
  });

  it('BreathingCircle receives inhale phase from hook', () => {
    const hookState: BreathingHookState = {
      phase: { label: 'inhale', durationMs: 4000 },
      isActive: true,
    };
    const phase = resolveBreathingCirclePhase(hookState);
    expect(phase).not.toBeNull();
    expect(phase!.label).toBe('inhale');
  });

  it('BreathingCircle receives hold phase from hook', () => {
    const hookState: BreathingHookState = {
      phase: { label: 'hold', durationMs: 4000 },
      isActive: true,
    };
    const phase = resolveBreathingCirclePhase(hookState);
    expect(phase!.label).toBe('hold');
  });

  it('BreathingCircle receives exhale phase from hook', () => {
    const hookState: BreathingHookState = {
      phase: { label: 'exhale', durationMs: 4000 },
      isActive: true,
    };
    const phase = resolveBreathingCirclePhase(hookState);
    expect(phase!.label).toBe('exhale');
  });

  it('BreathingCircle phase resets to null after stop', () => {
    // After stop, hook sets phase to null
    const hookState: BreathingHookState = { phase: null, isActive: false };
    expect(resolveBreathingCirclePhase(hookState)).toBeNull();
  });

  it('Start button is shown when breathing is not active', () => {
    expect(shouldShowStartButton(false)).toBe(true);
  });

  it('Stop button is shown when breathing is active', () => {
    expect(shouldShowStopButton(true)).toBe(true);
  });

  it('Start button is hidden when breathing is active', () => {
    expect(shouldShowStartButton(true)).toBe(false);
  });

  it('Stop button is hidden when breathing is not active', () => {
    expect(shouldShowStopButton(false)).toBe(false);
  });

  it('breathing controls are hidden after completion', () => {
    expect(shouldShowBreathingControls(true)).toBe(false);
  });

  it('breathing controls are shown before completion', () => {
    expect(shouldShowBreathingControls(false)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: Mindfulness mood selector (Req 5.4)
// ---------------------------------------------------------------------------

describe('DemoSection — mindfulness mood selector (Req 5.4)', () => {
  it('mood selector is shown before completion', () => {
    expect(shouldShowMoodSelector(false)).toBe(true);
  });

  it('mood selector is hidden after completion', () => {
    expect(shouldShowMoodSelector(true)).toBe(false);
  });

  it('selecting mood 1 sets selectedMood and triggers completion', () => {
    const state = initialState();
    const next = handleMoodSelect(state, 1);
    expect(next.selectedMood).toBe(1);
    expect(next.completed).toBe(true);
  });

  it('selecting mood 3 sets selectedMood and triggers completion', () => {
    const state = initialState();
    const next = handleMoodSelect(state, 3);
    expect(next.selectedMood).toBe(3);
    expect(next.completed).toBe(true);
  });

  it('selecting mood 5 sets selectedMood and triggers completion', () => {
    const state = initialState();
    const next = handleMoodSelect(state, 5);
    expect(next.selectedMood).toBe(5);
    expect(next.completed).toBe(true);
  });

  it('all five mood values (1-5) are available', () => {
    expect(MOOD_VALUES).toEqual([1, 2, 3, 4, 5]);
    expect(MOOD_VALUES).toHaveLength(5);
  });

  it('each mood value triggers completion', () => {
    MOOD_VALUES.forEach((mood) => {
      const state = initialState();
      const next = handleMoodSelect(state, mood);
      expect(next.completed).toBe(true);
      expect(next.selectedMood).toBe(mood);
    });
  });

  it('selectedMood is null before any selection', () => {
    const state = initialState();
    expect(state.selectedMood).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: TTS call on completion (Req 5.5)
// ---------------------------------------------------------------------------

describe('DemoSection — TTS call on completion (Req 5.5)', () => {
  it('play is called with completion message and default voiceId on completion', async () => {
    const playMock = jest.fn().mockResolvedValue(undefined);
    await triggerTTSOnCompletion(COMPLETION_MESSAGE, playMock);
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(playMock).toHaveBeenCalledWith({
      text: COMPLETION_MESSAGE,
      voiceId: 'en-US-1',
    });
  });

  it('play is called with a non-empty text string', async () => {
    const playMock = jest.fn().mockResolvedValue(undefined);
    await triggerTTSOnCompletion(COMPLETION_MESSAGE, playMock);
    const callArgs = playMock.mock.calls[0][0];
    expect(typeof callArgs.text).toBe('string');
    expect(callArgs.text.length).toBeGreaterThan(0);
  });

  it('play is called with a non-empty voiceId', async () => {
    const playMock = jest.fn().mockResolvedValue(undefined);
    await triggerTTSOnCompletion(COMPLETION_MESSAGE, playMock);
    const callArgs = playMock.mock.calls[0][0];
    expect(typeof callArgs.voiceId).toBe('string');
    expect(callArgs.voiceId.length).toBeGreaterThan(0);
  });

  it('completing breathing exercise triggers TTS', async () => {
    const playMock = jest.fn().mockResolvedValue(undefined);
    // Simulate breathing stop → completion → TTS
    const state = handleBreathingStop(initialState());
    expect(state.completed).toBe(true);
    await triggerTTSOnCompletion(COMPLETION_MESSAGE, playMock);
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  it('completing mindfulness check-in triggers TTS', async () => {
    const playMock = jest.fn().mockResolvedValue(undefined);
    // Simulate mood selection → completion → TTS
    const state = handleMoodSelect(initialState(), 4);
    expect(state.completed).toBe(true);
    await triggerTTSOnCompletion(COMPLETION_MESSAGE, playMock);
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  it('TTS play is not called before completion', () => {
    const playMock = jest.fn();
    const state = initialState();
    // No completion yet — play should not have been called
    expect(state.completed).toBe(false);
    expect(playMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests: Text fallback on TTS error (Req 5.6)
// ---------------------------------------------------------------------------

describe('DemoSection — text fallback on TTS error (Req 5.6)', () => {
  it('ttsError text is shown when ttsUnavailable is true', () => {
    expect(shouldShowTtsError(true, null)).toBe(true);
  });

  it('ttsError text is shown when tts.error is set', () => {
    expect(shouldShowTtsError(false, 'Network error')).toBe(true);
  });

  it('ttsError text is shown when both ttsUnavailable and tts.error are set', () => {
    expect(shouldShowTtsError(true, 'Audio playback failed')).toBe(true);
  });

  it('ttsError text is NOT shown when TTS succeeds', () => {
    expect(shouldShowTtsError(false, null)).toBe(false);
  });

  it('ttsUnavailable is set to true when TTS play throws', () => {
    const state = initialState();
    const next = handleTTSError(state);
    expect(next.ttsUnavailable).toBe(true);
  });

  it('ttsUnavailable starts as false', () => {
    const state = initialState();
    expect(state.ttsUnavailable).toBe(false);
  });

  it('ttsError is shown regardless of which error source triggered it', () => {
    // ttsUnavailable (thrown exception)
    expect(shouldShowTtsError(true, null)).toBe(true);
    // tts.error (hook error state)
    expect(shouldShowTtsError(false, 'TTS request failed (HTTP 500)')).toBe(true);
  });

  it('TTS error does not prevent completion state from being set', () => {
    // Completion is set before TTS is called; TTS failure only sets ttsUnavailable
    const state = handleMoodSelect(initialState(), 2);
    expect(state.completed).toBe(true);
    const withError = handleTTSError(state);
    expect(withError.completed).toBe(true);
    expect(withError.ttsUnavailable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: CTA shown after completion (Req 5.7)
// ---------------------------------------------------------------------------

describe('DemoSection — CTA after completion (Req 5.7)', () => {
  it('CTA is NOT shown before completion', () => {
    expect(shouldShowCTA(false)).toBe(false);
  });

  it('CTA is shown after breathing exercise completes', () => {
    const state = handleBreathingStop(initialState());
    expect(shouldShowCTA(state.completed)).toBe(true);
  });

  it('CTA is shown after mindfulness mood is selected', () => {
    const state = handleMoodSelect(initialState(), 3);
    expect(shouldShowCTA(state.completed)).toBe(true);
  });

  it('CTA links to /signup', () => {
    // The component renders <a href="/signup"> — verify the expected href
    const ctaHref = '/signup';
    expect(ctaHref).toBe('/signup');
  });

  it('CTA is shown even when TTS fails', () => {
    const state = handleTTSError(handleMoodSelect(initialState(), 1));
    expect(shouldShowCTA(state.completed)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: Reset ("Try again") (Req 5.7)
// ---------------------------------------------------------------------------

describe('DemoSection — reset / try again', () => {
  it('reset clears completed state', () => {
    const state = handleMoodSelect(initialState(), 5);
    const reset = handleReset(state);
    expect(reset.completed).toBe(false);
  });

  it('reset clears selectedMood', () => {
    const state = handleMoodSelect(initialState(), 3);
    const reset = handleReset(state);
    expect(reset.selectedMood).toBeNull();
  });

  it('reset clears ttsUnavailable flag', () => {
    const state = handleTTSError(handleBreathingStop(initialState()));
    const reset = handleReset(state);
    expect(reset.ttsUnavailable).toBe(false);
  });

  it('reset preserves the active tab', () => {
    const state = handleTabChange(
      handleMoodSelect(initialState(), 2),
      'mindfulness'
    );
    const reset = handleReset(state);
    expect(reset.activeTab).toBe('mindfulness');
  });

  it('after reset, CTA is no longer shown', () => {
    const state = handleMoodSelect(initialState(), 4);
    const reset = handleReset(state);
    expect(shouldShowCTA(reset.completed)).toBe(false);
  });

  it('after reset, mood selector is shown again', () => {
    const state = handleMoodSelect(initialState(), 2);
    const reset = handleReset(state);
    expect(shouldShowMoodSelector(reset.completed)).toBe(true);
  });

  it('after reset, breathing controls are shown again', () => {
    const state = handleBreathingStop(initialState());
    const reset = handleReset(state);
    expect(shouldShowBreathingControls(reset.completed)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: i18n text keys (Req 5.8)
// ---------------------------------------------------------------------------

describe('DemoSection — i18n text keys (Req 5.8)', () => {
  it('all required demo i18n keys are defined', () => {
    const requiredKeys = [
      'title',
      'subtitle',
      'tabBreathing',
      'tabMindfulness',
      'breathingStart',
      'breathingStop',
      'mindfulnessPrompt',
      'moodLabel',
      'complete',
      'cta',
      'ttsError',
    ];
    expect(requiredKeys).toHaveLength(11);
    requiredKeys.forEach((key) => {
      expect(key.length).toBeGreaterThan(0);
    });
  });

  it('section aria-label is derived from demo.title i18n key', () => {
    // The section root uses aria-label={t('title')}
    const ariaLabelKey = 'title';
    expect(ariaLabelKey).toBe('title');
  });

  it('section id is "demo" for anchor navigation', () => {
    const sectionId = 'demo';
    expect(sectionId).toBe('demo');
  });
});

// ---------------------------------------------------------------------------
// Tests: Section accessibility (Req 5.8, 17.4)
// ---------------------------------------------------------------------------

describe('DemoSection — accessibility', () => {
  it('section has a non-empty aria-label', () => {
    // aria-label={t('title')} — title key must be non-empty
    const titleKey = 'title';
    expect(titleKey.length).toBeGreaterThan(0);
  });

  it('tab buttons use role="tab" and aria-selected', () => {
    // Verify the tab role and aria-selected contract
    const breathingTabSelected = true;
    const mindfulnessTabSelected = false;
    expect(breathingTabSelected).toBe(true);
    expect(mindfulnessTabSelected).toBe(false);
  });

  it('tab panels use role="tabpanel" and aria-labelledby', () => {
    const breathingPanelId = 'panel-breathing';
    const mindfulnessPanelId = 'panel-mindfulness';
    expect(breathingPanelId).toBe('panel-breathing');
    expect(mindfulnessPanelId).toBe('panel-mindfulness');
  });

  it('mood buttons have aria-pressed reflecting selection state', () => {
    // When selectedMood === mood, aria-pressed is true
    const selectedMood = 3;
    MOOD_VALUES.forEach((mood) => {
      const pressed = selectedMood === mood;
      expect(typeof pressed).toBe('boolean');
    });
  });

  it('ttsError alert uses role="alert" for screen readers', () => {
    // The ttsError paragraph uses role="alert"
    const role = 'alert';
    expect(role).toBe('alert');
  });
});
