// Feature: wellflow-voice-wellness-assistant
// SessionManager: creates, persists, and restores session state (Requirements 9.1–9.5)

import { Session, SessionSummary, BiometricSnapshot, OutboundMessage, MessagingPlatformId, ActivityRecord } from '../types';
import { ProfileStore } from '../store/ProfileStore';
import { HealthSync } from './HealthSync';
import { CommunityManager } from './CommunityManager';

/** Minimal interface to avoid circular dependency with CalendarSync */
export interface CalendarSyncInterface {
  createEvent(userId: string, event: {
    title: string; startTime: Date; endTime: Date; description: string;
  }): Promise<unknown>;
}

/** Minimal interface to avoid circular dependency with MessagingGateway */
export interface MessagingGatewayInterface {
  sendNotification(message: OutboundMessage): Promise<void>;
  getConnectedPlatforms(userId: string): MessagingPlatformId[];
}

const SESSION_DURATION_NOTIFY_MS = 60 * 60 * 1000; // 60 minutes

export type DurationNotificationCallback = (sessionId: string, userId: string) => void;

export class SessionManager {
  /** In-memory store of active/recent sessions keyed by sessionId */
  private sessions: Map<string, Session> = new Map();

  /**
   * Tracks the most recent sessionId per userId so restoreSession can find it.
   * Only updated when a session is created; cleared when saveSession is called.
   */
  private activeSessionByUser: Map<string, string> = new Map();

  /** Timers for 60-minute duration notifications */
  private durationTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  /** Callback invoked when a session reaches 60 minutes of continuous use */
  public onDurationNotification: DurationNotificationCallback | null = null;

  /** Callback invoked at session start with the fetched BiometricSnapshot (Req 13.3, 13.4) */
  public onBiometricSnapshot: ((sessionId: string, snapshot: BiometricSnapshot) => void) | null = null;

  /** Latest BiometricSnapshot per sessionId, stored at session start */
  private latestSnapshots: Map<string, BiometricSnapshot> = new Map();

  constructor(
    private readonly profileStore: ProfileStore,
    private readonly healthSync?: HealthSync,
    private readonly calendarSync?: CalendarSyncInterface,
    private readonly messagingGateway?: MessagingGatewayInterface,
    private readonly communityManager?: CommunityManager,
  ) {}

  /**
   * Creates a new Session and, if HealthSync is wired in, fetches a BiometricSnapshot
   * and emits it via onBiometricSnapshot for the ConversationEngine to use.
   * Requirements: 9.1, 13.3, 13.4
   */
  async startSession(userId: string): Promise<Session> {
    const session = this.createSession(userId);
    if (this.healthSync) {
      try {
        const snapshot = await this.healthSync.fetchSnapshot(userId);
        this.latestSnapshots.set(session.sessionId, snapshot);
        this.onBiometricSnapshot?.(session.sessionId, snapshot);
      } catch {
        // Health fetch failure must not block session start (Req 13.6)
      }
    }
    return session;
  }

  /**
   * Creates a new Session for the given user.
   * Requirement 9.1: Session_Manager SHALL create a new Session when a user starts WellFlow.
   */
  createSession(userId: string): Session {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();

    const session: Session = {
      sessionId,
      userId,
      startTime: now,
      language: 'en',
      activitiesCompleted: [],
      lastActivityTime: now,
      stressRatings: [],
      reminders: [],
    };

    this.sessions.set(sessionId, session);
    this.activeSessionByUser.set(userId, sessionId);
    this._scheduleDurationNotification(session);

    return session;
  }

  /**
   * Returns the session with the given sessionId, or null if not found.
   */
  getSession(sessionId: string): Session | null {
    return this.sessions.get(sessionId) ?? null;
  }

  /**
   * Records a completed activity on the session and publishes an anonymized
   * activity event to the community feed (Requirement 20.3).
   */
  async recordActivity(session: Session, activity: ActivityRecord): Promise<void> {
    session.activitiesCompleted.push(activity);
    session.lastActivityTime = new Date();

    if (this.communityManager) {
      this.communityManager.publishActivityEvent(session.userId, activity.activityType).catch(() => {});
    }
  }

  /**
   * Persists session metadata to the profile store and removes the session from
   * the active-session index so restoreSession will not return it again.
   * Requirement 9.2: persist session metadata after each Session ends.
   * Requirement 9.3: present a brief summary of activities completed.
   */
  async saveSession(session: Session): Promise<void> {
    // Update in-memory store with latest state
    this.sessions.set(session.sessionId, session);

    const endTime = new Date();
    const durationMinutes =
      (endTime.getTime() - session.startTime.getTime()) / 60_000;

    const stressRatings = session.stressRatings;
    const averageStressRating =
      stressRatings.length > 0
        ? stressRatings.reduce((sum, r) => sum + r, 0) / stressRatings.length
        : null;

    const summary: SessionSummary = {
      sessionId: session.sessionId,
      startTime: session.startTime,
      endTime,
      durationMinutes,
      activitiesCompleted: [...session.activitiesCompleted],
      averageStressRating,
    };

    this.profileStore.appendSessionSummary(session.userId, summary);

    // Wire: create calendar event for completed session (Req 14.3)
    if (this.calendarSync) {
      this.calendarSync.createEvent(session.userId, {
        title: `WellFlow Session`,
        startTime: summary.startTime,
        endTime: summary.endTime,
        description: `Activities: ${summary.activitiesCompleted.map((a) => a.activityType).join(', ') || 'none'}`,
      }).catch(() => {}); // calendar failure must not block session save
    }

    // Wire: send session summary via messaging within 60 seconds of session end (Req 16.3)
    if (this.messagingGateway) {
      const connectedPlatforms = this.messagingGateway.getConnectedPlatforms(session.userId);
      if (connectedPlatforms.length > 0) {
        const activities = summary.activitiesCompleted.map((a) => a.activityType).join(', ') || 'none';
        const stressPart = summary.averageStressRating !== null
          ? ` | Avg stress: ${summary.averageStressRating.toFixed(1)}/5`
          : '';
        const summaryText = `WellFlow session complete — ${Math.round(summary.durationMinutes)} min | Activities: ${activities}${stressPart}`;
        const message: OutboundMessage = {
          userId: session.userId,
          platforms: connectedPlatforms,
          text: summaryText,
          eventId: `session-end-${session.sessionId}`,
        };
        this.messagingGateway.sendNotification(message).catch(() => {}); // must not block session save
      }
    }

    // Remove from active-session index so it won't be restored
    if (this.activeSessionByUser.get(session.userId) === session.sessionId) {
      this.activeSessionByUser.delete(session.userId);
    }

    this._clearDurationTimer(session.sessionId);
  }

  /**
   * Returns the most recent unsaved/active session for the user, or null.
   * Requirement 9.4: restore session state on app restart after crash/network failure.
   */
  async restoreSession(userId: string): Promise<Session | null> {
    const sessionId = this.activeSessionByUser.get(userId);
    if (!sessionId) return null;
    return this.sessions.get(sessionId) ?? null;
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  private _scheduleDurationNotification(session: Session): void {
    this._clearDurationTimer(session.sessionId);

    const elapsed = Date.now() - session.startTime.getTime();
    const remaining = SESSION_DURATION_NOTIFY_MS - elapsed;

    if (remaining <= 0) {
      // Already past 60 minutes — fire immediately (async to keep createSession sync)
      Promise.resolve().then(() => this._fireDurationNotification(session));
      return;
    }

    const timer = setTimeout(() => {
      this._fireDurationNotification(session);
    }, remaining);

    this.durationTimers.set(session.sessionId, timer);
  }

  private _fireDurationNotification(session: Session): void {
    if (this.onDurationNotification) {
      this.onDurationNotification(session.sessionId, session.userId);
    }
  }

  /**
   * Returns the latest BiometricSnapshot fetched at session start, or null if none.
   * Used by WellFlowAssistant to build PersonalizationContext.
   */
  getLatestBiometricSnapshot(sessionId: string): import('../types').BiometricSnapshot | null {
    return this.latestSnapshots.get(sessionId) ?? null;
  }

  /**
   * Returns the personalized greeting for the user.
   * Requirement 9.1: greet the user by name if a user profile exists.
   */
  getGreeting(userId: string): string {
    const profile = this.profileStore.getProfile(userId);
    if (profile) {
      return `Hello, ${profile.name}! Welcome back.`;
    }
    return 'Hello! Welcome to WellFlow.';
  }

  private _clearDurationTimer(sessionId: string): void {
    const timer = this.durationTimers.get(sessionId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.durationTimers.delete(sessionId);
    }
  }
}
