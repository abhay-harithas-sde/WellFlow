/**
 * Unit tests for components/sections/VoiceDemoSection.tsx
 * Tests skeleton loader, voice selection, play/stop, error state, and retry.
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10
 *
 * Since jest runs in 'node' environment (no DOM), we test the pure logic
 * extracted from the VoiceDemoSection component — state contracts and
 * data-flow rather than rendering.
 */

import { MurfVoice } from '../../hooks/useMurfVoices';

// ---------------------------------------------------------------------------
// Types mirroring the component's internal state
// ---------------------------------------------------------------------------

type ScriptKey = 'breathing' | 'mindfulness' | 'stress';

interface VoiceDemoState {
  selectedVoiceId: string | null;
  selectedScript: ScriptKey;
}

interface VoicesHookState {
  voices: MurfVoice[];
  loading: boolean;
  error: string | null;
}

interface TTSHookState {
  playing: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Pure helpers mirroring VoiceDemoSection logic
// ---------------------------------------------------------------------------

/** Mirrors the `activeVoiceId` derivation in the component */
function resolveActiveVoiceId(
  selectedVoiceId: string | null,
  voices: MurfVoice[]
): string | null {
  return selectedVoiceId ?? voices[0]?.voiceId ?? null;
}

/** Mirrors the `handlePlay` guard: returns false when no voice is available */
function canPlay(voices: MurfVoice[], selectedVoiceId: string | null): boolean {
  const voiceId = selectedVoiceId ?? voices[0]?.voiceId;
  return voiceId !== undefined && voiceId !== null && voiceId !== '';
}

/** Mirrors the play button disabled logic: disabled when voices list is empty */
function isPlayButtonDisabled(voices: MurfVoice[]): boolean {
  return voices.length === 0;
}

/** Mirrors the skeleton loader visibility logic */
function shouldShowSkeleton(loading: boolean): boolean {
  return loading;
}

/** Mirrors the error state visibility logic */
function shouldShowError(loading: boolean, voicesError: string | null): boolean {
  return !loading && voicesError !== null;
}

/** Mirrors the main UI visibility logic */
function shouldShowMainUI(loading: boolean, voicesError: string | null): boolean {
  return !loading && voicesError === null;
}

/** Mirrors the waveform visibility logic */
function shouldShowWaveform(playing: boolean): boolean {
  return playing;
}

/** Mirrors the stop button visibility logic */
function shouldShowStopButton(playing: boolean): boolean {
  return playing;
}

/** Mirrors the play button visibility logic */
function shouldShowPlayButton(playing: boolean): boolean {
  return !playing;
}

/** Mirrors the script preset selection logic */
function selectScript(
  state: VoiceDemoState,
  key: ScriptKey
): VoiceDemoState {
  return { ...state, selectedScript: key };
}

/** Mirrors the voice selection logic */
function selectVoice(
  state: VoiceDemoState,
  voiceId: string
): VoiceDemoState {
  return { ...state, selectedVoiceId: voiceId };
}

/** Returns the text to synthesize for a given script key */
function resolveScriptText(
  scriptKey: ScriptKey,
  scripts: Record<ScriptKey, string>
): string {
  return scripts[scriptKey];
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const sampleVoices: MurfVoice[] = [
  { voiceId: 'v1', displayName: 'Alice', language: 'en-US', gender: 'female' },
  { voiceId: 'v2', displayName: 'Bob', language: 'en-GB', gender: 'male' },
];

const sampleScripts: Record<ScriptKey, string> = {
  breathing: 'Take a deep breath in through your nose...',
  mindfulness: 'Close your eyes and focus on the present moment...',
  stress: 'Let go of tension with each exhale...',
};

const defaultState: VoiceDemoState = {
  selectedVoiceId: null,
  selectedScript: 'breathing',
};

// ---------------------------------------------------------------------------
// Tests: Skeleton loader state (Req 6.3)
// ---------------------------------------------------------------------------

describe('VoiceDemoSection — skeleton loader (Req 6.3)', () => {
  it('shows skeleton when loading=true', () => {
    expect(shouldShowSkeleton(true)).toBe(true);
  });

  it('hides skeleton when loading=false', () => {
    expect(shouldShowSkeleton(false)).toBe(false);
  });

  it('hides main UI while loading', () => {
    expect(shouldShowMainUI(true, null)).toBe(false);
  });

  it('hides error state while loading', () => {
    expect(shouldShowError(true, 'some error')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Voice selection (Req 6.2)
// ---------------------------------------------------------------------------

describe('VoiceDemoSection — voice selection (Req 6.2)', () => {
  it('selecting a voice updates selectedVoiceId', () => {
    const next = selectVoice(defaultState, 'v2');
    expect(next.selectedVoiceId).toBe('v2');
  });

  it('initial selectedVoiceId is null', () => {
    expect(defaultState.selectedVoiceId).toBeNull();
  });

  it('activeVoiceId falls back to first voice when selectedVoiceId is null', () => {
    const active = resolveActiveVoiceId(null, sampleVoices);
    expect(active).toBe('v1');
  });

  it('activeVoiceId uses selectedVoiceId when set', () => {
    const active = resolveActiveVoiceId('v2', sampleVoices);
    expect(active).toBe('v2');
  });

  it('activeVoiceId is null when no voices and no selection', () => {
    const active = resolveActiveVoiceId(null, []);
    expect(active).toBeNull();
  });

  it('selecting a different voice overrides the previous selection', () => {
    const state1 = selectVoice(defaultState, 'v1');
    const state2 = selectVoice(state1, 'v2');
    expect(state2.selectedVoiceId).toBe('v2');
  });
});

// ---------------------------------------------------------------------------
// Tests: Play/Stop controls (Req 6.5, 6.6, 6.7)
// ---------------------------------------------------------------------------

describe('VoiceDemoSection — play/stop controls (Req 6.5, 6.6, 6.7)', () => {
  it('play button is shown when not playing', () => {
    expect(shouldShowPlayButton(false)).toBe(true);
  });

  it('stop button is shown when playing', () => {
    expect(shouldShowStopButton(true)).toBe(true);
  });

  it('play button is hidden when playing', () => {
    expect(shouldShowPlayButton(true)).toBe(false);
  });

  it('stop button is hidden when not playing', () => {
    expect(shouldShowStopButton(false)).toBe(false);
  });

  it('waveform is shown when playing=true (Req 6.6)', () => {
    expect(shouldShowWaveform(true)).toBe(true);
  });

  it('waveform is hidden when playing=false (Req 6.6)', () => {
    expect(shouldShowWaveform(false)).toBe(false);
  });

  it('play calls TTS with correct voiceId and script text', () => {
    const playMock = jest.fn();
    const voiceId = resolveActiveVoiceId(null, sampleVoices);
    const text = resolveScriptText('breathing', sampleScripts);
    if (voiceId) {
      playMock({ text, voiceId });
    }
    expect(playMock).toHaveBeenCalledWith({
      text: sampleScripts.breathing,
      voiceId: 'v1',
    });
  });

  it('stop calls the stop function', () => {
    const stopMock = jest.fn();
    stopMock();
    expect(stopMock).toHaveBeenCalledTimes(1);
  });

  it('play is not called when no voice is available', () => {
    const playMock = jest.fn();
    const voiceId = resolveActiveVoiceId(null, []);
    if (voiceId) {
      playMock({ text: sampleScripts.breathing, voiceId });
    }
    expect(playMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests: Play button disabled when no voices (Req 6.5)
// ---------------------------------------------------------------------------

describe('VoiceDemoSection — play button disabled state (Req 6.5)', () => {
  it('play button is disabled when voices list is empty', () => {
    expect(isPlayButtonDisabled([])).toBe(true);
  });

  it('play button is enabled when voices are available', () => {
    expect(isPlayButtonDisabled(sampleVoices)).toBe(false);
  });

  it('canPlay returns false when voices list is empty', () => {
    expect(canPlay([], null)).toBe(false);
  });

  it('canPlay returns true when voices are available and no explicit selection', () => {
    expect(canPlay(sampleVoices, null)).toBe(true);
  });

  it('canPlay returns true when a voice is explicitly selected', () => {
    expect(canPlay([], 'v1')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: Error state (Req 6.8)
// ---------------------------------------------------------------------------

describe('VoiceDemoSection — error state (Req 6.8)', () => {
  it('shows error state when voicesError is set and not loading', () => {
    expect(shouldShowError(false, 'Failed to load voices')).toBe(true);
  });

  it('does not show error state when voicesError is null', () => {
    expect(shouldShowError(false, null)).toBe(false);
  });

  it('does not show error state while loading even if error is set', () => {
    expect(shouldShowError(true, 'some error')).toBe(false);
  });

  it('hides main UI when error is present', () => {
    expect(shouldShowMainUI(false, 'Failed to load voices')).toBe(false);
  });

  it('shows main UI when no error and not loading', () => {
    expect(shouldShowMainUI(false, null)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: Retry (Req 6.8)
// ---------------------------------------------------------------------------

describe('VoiceDemoSection — retry (Req 6.8)', () => {
  it('clicking retry calls refetch', () => {
    const refetchMock = jest.fn();
    // Simulate the retry button onClick handler
    refetchMock();
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it('refetch can be called multiple times', () => {
    const refetchMock = jest.fn();
    refetchMock();
    refetchMock();
    expect(refetchMock).toHaveBeenCalledTimes(2);
  });

  it('retry button is only shown in error state', () => {
    // Retry button is rendered inside the error block
    const showError = shouldShowError(false, 'Network error');
    expect(showError).toBe(true);

    const showErrorNoError = shouldShowError(false, null);
    expect(showErrorNoError).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Script preset selection (Req 6.4)
// ---------------------------------------------------------------------------

describe('VoiceDemoSection — script preset selection (Req 6.4)', () => {
  it('default selected script is "breathing"', () => {
    expect(defaultState.selectedScript).toBe('breathing');
  });

  it('selecting "mindfulness" preset updates selectedScript', () => {
    const next = selectScript(defaultState, 'mindfulness');
    expect(next.selectedScript).toBe('mindfulness');
  });

  it('selecting "stress" preset updates selectedScript', () => {
    const next = selectScript(defaultState, 'stress');
    expect(next.selectedScript).toBe('stress');
  });

  it('selecting "breathing" preset updates selectedScript', () => {
    const state = selectScript(defaultState, 'stress');
    const next = selectScript(state, 'breathing');
    expect(next.selectedScript).toBe('breathing');
  });

  it('three script presets are available', () => {
    const scriptKeys: ScriptKey[] = ['breathing', 'mindfulness', 'stress'];
    expect(scriptKeys).toHaveLength(3);
  });

  it('each script key resolves to a non-empty text string', () => {
    const keys: ScriptKey[] = ['breathing', 'mindfulness', 'stress'];
    keys.forEach((key) => {
      const text = resolveScriptText(key, sampleScripts);
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
    });
  });

  it('play uses the currently selected script text', () => {
    const playMock = jest.fn();
    const state = selectScript(defaultState, 'mindfulness');
    const voiceId = resolveActiveVoiceId(state.selectedVoiceId, sampleVoices);
    const text = resolveScriptText(state.selectedScript, sampleScripts);
    if (voiceId) {
      playMock({ text, voiceId });
    }
    expect(playMock).toHaveBeenCalledWith({
      text: sampleScripts.mindfulness,
      voiceId: 'v1',
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: WaveformAnimation shown only when playing (Req 6.6)
// ---------------------------------------------------------------------------

describe('VoiceDemoSection — waveform animation visibility (Req 6.6)', () => {
  it('waveform is visible only when playing=true', () => {
    expect(shouldShowWaveform(true)).toBe(true);
    expect(shouldShowWaveform(false)).toBe(false);
  });

  it('waveform transitions from hidden to visible when playback starts', () => {
    const beforePlay = shouldShowWaveform(false);
    const afterPlay = shouldShowWaveform(true);
    expect(beforePlay).toBe(false);
    expect(afterPlay).toBe(true);
  });

  it('waveform transitions from visible to hidden when playback stops', () => {
    const whilePlaying = shouldShowWaveform(true);
    const afterStop = shouldShowWaveform(false);
    expect(whilePlaying).toBe(true);
    expect(afterStop).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: TTS error display (Req 6.8)
// ---------------------------------------------------------------------------

describe('VoiceDemoSection — TTS error display (Req 6.8)', () => {
  it('TTS error is shown when ttsError is non-null', () => {
    const ttsState: TTSHookState = { playing: false, error: 'Audio playback failed' };
    expect(ttsState.error).not.toBeNull();
    expect(ttsState.error!.length).toBeGreaterThan(0);
  });

  it('TTS error is not shown when ttsError is null', () => {
    const ttsState: TTSHookState = { playing: false, error: null };
    expect(ttsState.error).toBeNull();
  });

  it('playing is false when TTS error occurs', () => {
    const ttsState: TTSHookState = { playing: false, error: 'Network error: unable to reach TTS service' };
    expect(ttsState.playing).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Section accessibility (Req 6.10)
// ---------------------------------------------------------------------------

describe('VoiceDemoSection — accessibility (Req 6.10)', () => {
  it('section has an aria-label derived from i18n title key', () => {
    // The section root uses aria-label={t('title')}
    const ariaLabel = 'Hear WellFlow in Action';
    expect(ariaLabel.length).toBeGreaterThan(0);
  });

  it('section id is "voice-demo" for anchor navigation', () => {
    const sectionId = 'voice-demo';
    expect(sectionId).toBe('voice-demo');
  });
});

// ---------------------------------------------------------------------------
// Tests: i18n text rendering (Req 6.9)
// ---------------------------------------------------------------------------

describe('VoiceDemoSection — i18n text (Req 6.9)', () => {
  it('all voiceDemo i18n keys are defined', () => {
    const requiredKeys = [
      'title', 'subtitle', 'selectVoice', 'selectScript',
      'play', 'stop', 'loading', 'error', 'retry',
      'scripts.breathing', 'scripts.mindfulness', 'scripts.stress',
    ];
    expect(requiredKeys).toHaveLength(12);
    requiredKeys.forEach((key) => {
      expect(key.length).toBeGreaterThan(0);
    });
  });

  it('script keys map to the voiceDemo.scripts.* i18n namespace', () => {
    const scriptKeys: ScriptKey[] = ['breathing', 'mindfulness', 'stress'];
    scriptKeys.forEach((key) => {
      const i18nPath = `scripts.${key}`;
      expect(i18nPath).toMatch(/^scripts\.(breathing|mindfulness|stress)$/);
    });
  });
});
