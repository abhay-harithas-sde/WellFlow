// Feature: wellflow-voice-wellness-assistant
// BreathingGuide: delivers timed breathing exercise sequences (Requirements 5.1–5.5)

export interface BreathingPhase {
  label: 'inhale' | 'hold' | 'exhale';
  durationMs: number;
}

export interface BreathingTechnique {
  id: 'BOX' | '4-7-8' | 'DIAPHRAGMATIC';
  name: string;
  phases: BreathingPhase[];
}

export interface BreathingSession {
  techniqueId: string;
  sessionId: string;
  status: 'active' | 'stopped' | 'complete';
  currentPhaseIndex: number;
}

export interface BreathingGuideCallbacks {
  onPhaseTransition: (sessionId: string, phase: BreathingPhase) => void;
  onComplete: (sessionId: string) => void;
  onStopped: (sessionId: string) => void;
}

const TECHNIQUES: BreathingTechnique[] = [
  {
    id: 'BOX',
    name: 'Box Breathing',
    phases: [
      { label: 'inhale', durationMs: 4000 },
      { label: 'hold', durationMs: 4000 },
      { label: 'exhale', durationMs: 4000 },
      { label: 'hold', durationMs: 4000 },
    ],
  },
  {
    id: '4-7-8',
    name: '4-7-8 Breathing',
    phases: [
      { label: 'inhale', durationMs: 4000 },
      { label: 'hold', durationMs: 7000 },
      { label: 'exhale', durationMs: 8000 },
    ],
  },
  {
    id: 'DIAPHRAGMATIC',
    name: 'Diaphragmatic Breathing',
    phases: [
      { label: 'inhale', durationMs: 4000 },
      { label: 'hold', durationMs: 2000 },
      { label: 'exhale', durationMs: 6000 },
    ],
  },
];

// Number of cycles per exercise
const CYCLES = 4;

export class BreathingGuide {
  private activeSessions: Map<string, BreathingSession> = new Map();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(private readonly callbacks: BreathingGuideCallbacks) {}

  /**
   * Returns the list of available breathing techniques.
   * Requirement 5.1: at least 3 techniques.
   */
  listTechniques(): BreathingTechnique[] {
    return [...TECHNIQUES];
  }

  /**
   * Starts a breathing exercise for the given technique and session.
   * Requirement 5.2: deliver step-by-step voice instructions with timing cues.
   * Requirement 5.3: announce each phase transition within ±200ms.
   */
  startExercise(technique: BreathingTechnique, sessionId: string): BreathingSession {
    // Stop any existing session for this sessionId
    this.stopExercise(sessionId);

    const session: BreathingSession = {
      techniqueId: technique.id,
      sessionId,
      status: 'active',
      currentPhaseIndex: 0,
    };
    this.activeSessions.set(sessionId, session);

    this._runPhase(technique, session, 0, 0);
    return session;
  }

  /**
   * Stops the exercise immediately.
   * Requirement 5.5: stop immediately on user request.
   */
  stopExercise(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    this._clearTimer(sessionId);
    session.status = 'stopped';
    this.activeSessions.delete(sessionId);
    this.callbacks.onStopped(sessionId);
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  private _runPhase(
    technique: BreathingTechnique,
    session: BreathingSession,
    phaseIndex: number,
    cycle: number,
  ): void {
    if (session.status !== 'active') return;

    const phases = technique.phases;
    const phase = phases[phaseIndex];
    session.currentPhaseIndex = phaseIndex;

    // Announce the phase transition (Req 5.3: within ±200ms — synchronous call)
    this.callbacks.onPhaseTransition(session.sessionId, phase);

    const timer = setTimeout(() => {
      this.timers.delete(session.sessionId);
      if (session.status !== 'active') return;

      const nextPhaseIndex = phaseIndex + 1;
      if (nextPhaseIndex < phases.length) {
        this._runPhase(technique, session, nextPhaseIndex, cycle);
      } else {
        const nextCycle = cycle + 1;
        if (nextCycle < CYCLES) {
          this._runPhase(technique, session, 0, nextCycle);
        } else {
          // Exercise complete (Req 5.4)
          session.status = 'complete';
          this.activeSessions.delete(session.sessionId);
          this.callbacks.onComplete(session.sessionId);
        }
      }
    }, phase.durationMs);

    this.timers.set(session.sessionId, timer);
  }

  private _clearTimer(sessionId: string): void {
    const timer = this.timers.get(sessionId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(sessionId);
    }
  }
}
