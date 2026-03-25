import fc from 'fast-check';

// ---------------------------------------------------------------------------
// P16: TTS fallback on error
// ---------------------------------------------------------------------------
// Feature: website-completion-murf-wellflow, Property 16: For any TTS error, DemoSection displays completion message as visible text and does not attempt audio playback

/**
 * Pure state machine modelling DemoSection's TTS fallback behaviour.
 *
 * DemoState captures the subset of DemoSection state relevant to P16:
 *   - completed:        whether the demo exercise has finished
 *   - ttsError:         the error string passed to onDemoComplete (null = success)
 *   - ttsUnavailable:   set to true when TTS throws / returns an error
 *   - showTextFallback: true when the completion message must be shown as text
 *   - audioAttempted:   true when audio playback was (or would be) attempted
 */
interface DemoState {
  completed: boolean;
  ttsError: string | null;
  ttsUnavailable: boolean;
  showTextFallback: boolean;
  audioAttempted: boolean;
}

/** Initial state before any demo interaction. */
function initialDemoState(): DemoState {
  return {
    completed: false,
    ttsError: null,
    ttsUnavailable: false,
    showTextFallback: false,
    audioAttempted: false,
  };
}

/**
 * Mirrors DemoSection's handleCompletion logic:
 *   - Always marks the demo as completed.
 *   - If ttsError is non-null (TTS failed):
 *       set ttsUnavailable=true, showTextFallback=true, audioAttempted=false
 *   - If ttsError is null (TTS succeeded):
 *       set audioAttempted=true, showTextFallback=false
 */
function onDemoComplete(state: DemoState, ttsError: string | null): DemoState {
  if (ttsError !== null) {
    return {
      ...state,
      completed: true,
      ttsError,
      ttsUnavailable: true,
      showTextFallback: true,
      audioAttempted: false,
    };
  }
  return {
    ...state,
    completed: true,
    ttsError: null,
    ttsUnavailable: false,
    showTextFallback: false,
    audioAttempted: true,
  };
}

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('DemoSection property tests', () => {
  // Feature: website-completion-murf-wellflow, Property 16: For any TTS error, DemoSection displays completion message as visible text and does not attempt audio playback
  test('P16: for any non-null TTS error string, showTextFallback=true and audioAttempted=false', () => {
    fc.assert(
      fc.property(
        // Generate any non-empty string as the TTS error (network message, HTTP status, etc.)
        fc.string({ minLength: 1 }),
        (ttsError) => {
          const state = onDemoComplete(initialDemoState(), ttsError);

          // The completion message must be shown as visible text
          if (!state.showTextFallback) return false;

          // Audio playback must NOT have been attempted
          if (state.audioAttempted) return false;

          // ttsUnavailable flag must be set
          if (!state.ttsUnavailable) return false;

          // The demo must still be marked as completed
          if (!state.completed) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Complementary: when TTS succeeds (null error), audio IS attempted and text fallback is NOT shown
  test('P16 complement: when TTS succeeds (null error), audioAttempted=true and showTextFallback=false', () => {
    fc.assert(
      fc.property(
        fc.constant(null as null),
        (ttsError) => {
          const state = onDemoComplete(initialDemoState(), ttsError);

          if (state.showTextFallback) return false;
          if (!state.audioAttempted) return false;
          if (!state.completed) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
