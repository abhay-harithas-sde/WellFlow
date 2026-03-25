// Feature: wellflow-voice-wellness-assistant
// MindfulnessGuide: delivers continuous mindfulness sessions with pause/resume (Requirements 6.1–6.5)

export interface MindfulnessSession {
  durationMinutes: 5 | 10 | 15;
  positionMs: number;
  status: 'active' | 'paused' | 'complete';
}

export interface MindfulnessGuideCallbacks {
  onSegment: (sessionId: string, text: string) => void;
  onComplete: (sessionId: string) => void;
}

// Segment interval — deliver a guidance segment every 30 seconds
const SEGMENT_INTERVAL_MS = 30_000;

const GUIDANCE_SEGMENTS = [
  'Take a deep breath and let your body relax.',
  'Notice the sensations in your body without judgment.',
  'Gently bring your attention back to your breath.',
  'Allow thoughts to pass like clouds in the sky.',
  'Feel the ground beneath you, steady and supportive.',
  'With each exhale, release any tension you are holding.',
  'You are present, calm, and at peace.',
  'Continue breathing slowly and naturally.',
];

export class MindfulnessGuide {
  private sessions: Map<string, MindfulnessSession> = new Map();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private segmentIndices: Map<string, number> = new Map();

  constructor(private readonly callbacks: MindfulnessGuideCallbacks) {}

  /**
   * Starts a mindfulness session for the given duration.
   * Requirement 6.1: offer 5, 10, and 15 minute durations.
   * Requirement 6.2: deliver continuous voice-guided session.
   */
  startSession(durationMinutes: 5 | 10 | 15, sessionId: string): MindfulnessSession {
    this._clearTimer(sessionId);

    const session: MindfulnessSession = {
      durationMinutes,
      positionMs: 0,
      status: 'active',
    };
    this.sessions.set(sessionId, session);
    this.segmentIndices.set(sessionId, 0);

    this._scheduleNextSegment(sessionId, session);
    return session;
  }

  /**
   * Pauses the session.
   * Requirement 6.5: pause and resume from the same position.
   */
  pause(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') return;

    this._clearTimer(sessionId);
    session.status = 'paused';
  }

  /**
   * Resumes the session from the paused position.
   * Requirement 6.5: resume within 500ms tolerance.
   */
  resume(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'paused') return;

    session.status = 'active';
    this._scheduleNextSegment(sessionId, session);
  }

  getSession(sessionId: string): MindfulnessSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  private _scheduleNextSegment(sessionId: string, session: MindfulnessSession): void {
    const totalMs = session.durationMinutes * 60_000;

    if (session.positionMs >= totalMs) {
      session.status = 'complete';
      this.sessions.delete(sessionId);
      this.callbacks.onComplete(sessionId);
      return;
    }

    const timer = setTimeout(() => {
      this.timers.delete(sessionId);
      if (session.status !== 'active') return;

      // Deliver a guidance segment (Req 6.3: calm, measured pace)
      const idx = this.segmentIndices.get(sessionId) ?? 0;
      const text = GUIDANCE_SEGMENTS[idx % GUIDANCE_SEGMENTS.length];
      this.callbacks.onSegment(sessionId, text);
      this.segmentIndices.set(sessionId, idx + 1);

      session.positionMs += SEGMENT_INTERVAL_MS;

      this._scheduleNextSegment(sessionId, session);
    }, SEGMENT_INTERVAL_MS);

    this.timers.set(sessionId, timer);
  }

  private _clearTimer(sessionId: string): void {
    const timer = this.timers.get(sessionId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(sessionId);
    }
  }
}
