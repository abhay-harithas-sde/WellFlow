// Feature: wellflow-voice-wellness-assistant
// WellFlowAssistant: wires all components together into the full pipeline
// Requirements: 1.1–1.5, 2.1–2.5, 3.1–3.6, 4.1–4.6, 12.7–12.11, 13.3–13.4, 14.2–14.3, 15.3, 16.2–16.4

import { Session, ActivityType, OutboundMessage, SessionSummary } from '../types';
import { ProfileStore } from '../store/ProfileStore';
import { RateLimiter } from './RateLimiter';
import { WebSocketManager } from './WebSocketManager';
import { TTSEngine, TTSEngineCallbacks } from './TTSEngine';
import { VoiceInputHandler, VoiceInputHandlerCallbacks, SpeechRecognitionFactory } from './VoiceInputHandler';
import { ConversationEngine } from './ConversationEngine';
import { SessionManager } from './SessionManager';
import { RoutineReminder } from './RoutineReminder';
import { BreathingGuide, BreathingGuideCallbacks } from './BreathingGuide';
import { MindfulnessGuide, MindfulnessGuideCallbacks } from './MindfulnessGuide';
import { VoiceSelector, VoiceSelectorCallbacks } from './VoiceSelector';
import { IntegrationManager } from './IntegrationManager';
import { HealthSync } from './HealthSync';
import { CalendarSync } from './CalendarSync';
import { WearableBridge } from './WearableBridge';
import { MessagingGateway, MessagingPlatformAdapter } from './MessagingGateway';
import { CrisisDetector } from './CrisisDetector';
import { AnalyticsEngine } from './AnalyticsEngine';
import { BiometricFetcher } from './HealthSync';
import { CalendarPlatformAdapter } from './CalendarSync';
import { WearableStreamAdapter } from './WearableBridge';
import { WeeklySummaryReport } from '../types';
import { PersonalizationEngine } from './PersonalizationEngine';
import { CommunityManager, CommunityManagerCallbacks } from './CommunityManager';

export interface WellFlowAssistantCallbacks {
  /** Called when TTS fails twice — display text on screen (Req 3.6) */
  onTextFallback: (text: string) => void;
  /** Called when selected language is unsupported (Req 10.4) */
  onUnsupportedLanguage: (language: string) => void;
  /** Called when session reaches 60 minutes (Req 9.5) */
  onSessionDurationWarning: (sessionId: string, userId: string) => void;
  /** Called when WebSocket reconnection fails after 3 retries (Req 4.6) */
  onConnectionLost: (sessionId: string) => void;
  /** Called when a voice preview fails (Req 12.4) */
  onVoicePreviewError: (voiceId: string, message: string) => void;
  /** Called when a microphone error occurs (Req 1.4) */
  onMicrophoneError: (error: string) => void;
  /** Called when a breathing phase transitions (Req 5.2, 5.3) */
  onBreathingPhase: (sessionId: string, phase: { label: string; durationMs: number }) => void;
  /** Called when a breathing exercise completes (Req 5.4) */
  onBreathingComplete: (sessionId: string) => void;
  /** Called when a mindfulness segment is delivered (Req 6.2) */
  onMindfulnessSegment: (sessionId: string, text: string) => void;
  /** Called when a mindfulness session completes (Req 6.4) */
  onMindfulnessComplete: (sessionId: string) => void;
  /** Called with the assistant's text response (Req 2.2) */
  onResponse: (sessionId: string, text: string, intent: string) => void;
  /**
   * Called when a weekly summary report is available at session start (Req 17.6).
   * Render the report fields as formatted text in the UI layer.
   */
  onWeeklySummary?: (report: WeeklySummaryReport) => void;
}

export interface WellFlowAssistantConfig {
  profileStore: ProfileStore;
  messagingAdapters?: Partial<Record<'SLACK' | 'WHATSAPP' | 'TELEGRAM', MessagingPlatformAdapter>>;
  speechRecognitionFactory?: SpeechRecognitionFactory;
  /** Optional biometric fetcher — if omitted, health sync is a no-op */
  biometricFetcher?: BiometricFetcher;
  /** Optional calendar adapter — if omitted, calendar sync is a no-op */
  calendarAdapter?: CalendarPlatformAdapter;
  /** Optional wearable stream adapter — if omitted, wearable bridge is a no-op */
  wearableAdapter?: WearableStreamAdapter;
  callbacks: WellFlowAssistantCallbacks;
}

/**
 * WellFlowAssistant wires all components together.
 *
 * Pipeline:
 *   VoiceInputHandler → ConversationEngine → TTSEngine
 *                              ↕
 *                       SessionManager
 *                              ↕
 *          BreathingGuide / MindfulnessGuide / RoutineReminder
 *
 * Integrations:
 *   IntegrationManager → HealthSync / CalendarSync / WearableBridge / MessagingGateway
 *   VoiceSelector ↔ TTSEngine (voice resolution)
 *   VoiceSelector ↔ SessionManager (load/save VoiceProfile)
 */
export class WellFlowAssistant {
  // Core pipeline
  readonly rateLimiter: RateLimiter;
  readonly wsManager: WebSocketManager;
  readonly ttsEngine: TTSEngine;
  readonly voiceInput: VoiceInputHandler;
  readonly conversationEngine: ConversationEngine;
  readonly sessionManager: SessionManager;

  // Feature components
  readonly routineReminder: RoutineReminder;
  readonly breathingGuide: BreathingGuide;
  readonly mindfulnessGuide: MindfulnessGuide;
  readonly voiceSelector: VoiceSelector;

  // Integration components
  readonly integrationManager: IntegrationManager;
  readonly healthSync: HealthSync;
  readonly calendarSync: CalendarSync;
  readonly wearableBridge: WearableBridge;
  readonly messagingGateway: MessagingGateway;

  // Crisis detection
  readonly crisisDetector: CrisisDetector;

  // Analytics
  readonly analyticsEngine: AnalyticsEngine;

  // Personalization
  readonly personalizationEngine: PersonalizationEngine;

  // Community
  readonly communityManager: CommunityManager;

  private activeSession: Session | null = null;
  private readonly callbacks: WellFlowAssistantCallbacks;

  constructor(config: WellFlowAssistantConfig) {
    const {
      profileStore,
      messagingAdapters = {},
      speechRecognitionFactory,
      biometricFetcher,
      calendarAdapter,
      wearableAdapter,
      callbacks,
    } = config;

    this.callbacks = callbacks;

    // ----------------------------------------------------------------
    // 1. Rate limiter + WebSocket (Req 3.4, 3.5, 4.1–4.6)
    // ----------------------------------------------------------------
    this.rateLimiter = new RateLimiter();
    this.wsManager = new WebSocketManager();
    this.wsManager.onMaxRetriesExceeded = (sessionId) => callbacks.onConnectionLost(sessionId);

    // ----------------------------------------------------------------
    // 2. Integration manager (Req 13.1, 14.1, 15.1, 16.1)
    // ----------------------------------------------------------------
    this.integrationManager = new IntegrationManager(profileStore);

    // ----------------------------------------------------------------
    // 2a. Analytics engine (Req 17.1–17.10)
    // ----------------------------------------------------------------
    this.analyticsEngine = new AnalyticsEngine(profileStore);

    // ----------------------------------------------------------------
    // 2b. Personalization engine (Req 18.1–18.8)
    // ----------------------------------------------------------------
    this.personalizationEngine = new PersonalizationEngine(profileStore);

    // ----------------------------------------------------------------
    // 2c. Community manager (Req 20.1–20.10)
    // ----------------------------------------------------------------
    const communityCallbacks: CommunityManagerCallbacks = {
      onMemberJoined: (_groupId, _userId) => {},
      onChallengeFinalized: (_challenge, _rate) => {},
      onNamePromptRequired: (userId) => {
        // Deliver a voice prompt to the user to set their anonymized name
        if (this.activeSession && this.activeSession.userId === userId) {
          this.ttsEngine.speak(
            'Please set your community display name before sharing activities.',
            { language: this.activeSession.language, speed: 'normal', sessionId: this.activeSession.sessionId },
          ).catch(() => {});
        }
      },
      onAnnouncement: (userId, text) => {
        // Deliver TTS announcement to the user if they have an active session
        if (this.activeSession && this.activeSession.userId === userId) {
          this.ttsEngine.speak(text, {
            language: this.activeSession.language,
            speed: 'normal',
            sessionId: this.activeSession.sessionId,
          }).catch(() => {});
        }
      },
    };
    this.communityManager = new CommunityManager(communityCallbacks, profileStore);

    // ----------------------------------------------------------------
    // 3. Voice selector (Req 12.1–12.11)
    // ----------------------------------------------------------------
    const voiceSelectorCallbacks: VoiceSelectorCallbacks = {
      onPreviewError: (voiceId, message) => callbacks.onVoicePreviewError(voiceId, message),
    };
    this.voiceSelector = new VoiceSelector(
      profileStore,
      this.wsManager,
      this.rateLimiter,
      voiceSelectorCallbacks,
    );

    // ----------------------------------------------------------------
    // 4. TTS engine with voice resolver wired in (Req 3.1–3.6, 12.7–12.9)
    // ----------------------------------------------------------------
    const ttsCallbacks: TTSEngineCallbacks = {
      onTextFallback: (text) => callbacks.onTextFallback(text),
      onUnsupportedLanguage: (lang) => callbacks.onUnsupportedLanguage(lang),
    };
    this.ttsEngine = new TTSEngine(
      this.rateLimiter,
      this.wsManager,
      ttsCallbacks,
      this.voiceSelector, // voice resolution: activity → fallback → system default
    );

    // ----------------------------------------------------------------
    // 5. Crisis detector (Req 19.1–19.6)
    // ----------------------------------------------------------------
    this.crisisDetector = new CrisisDetector(profileStore);

    // ----------------------------------------------------------------
    // 6. Conversation engine (Req 2.1–2.5, 10.1, 10.3)
    // ----------------------------------------------------------------
    this.conversationEngine = new ConversationEngine(this.crisisDetector);

    // ----------------------------------------------------------------
    // 7. Calendar sync (Req 14.1–14.7)
    // ----------------------------------------------------------------
    // Stub adapter: no-op when no real adapter is provided
    const calendarPlatformAdapter: CalendarPlatformAdapter = calendarAdapter ?? {
      createEvent: async () => `ext-${Date.now()}`,
      listEvents: async () => [],
    };

    // ----------------------------------------------------------------
    // 8. Routine reminder wired to calendar sync (Req 8.1–8.6, 14.2)
    // ----------------------------------------------------------------
    // We create RoutineReminder first with a placeholder, then create CalendarSync
    // with the RoutineReminder, and finally wire CalendarSync back into RoutineReminder
    // via the CalendarSyncInterface it accepts in its constructor.
    // To avoid the circular dependency, we use a late-binding wrapper.
    let calendarSyncRef: typeof this.calendarSync | undefined;
    const calendarSyncProxy: import('./RoutineReminder').CalendarSyncInterface = {
      createEvent: (userId, event) => {
        if (calendarSyncRef) return calendarSyncRef.createEvent(userId, event);
        return Promise.resolve([]);
      },
    };

    this.routineReminder = new RoutineReminder(calendarSyncProxy);

    this.calendarSync = new CalendarSync(
      this.integrationManager,
      calendarPlatformAdapter,
      this.routineReminder,
    );

    // Now bind the real CalendarSync into the proxy
    calendarSyncRef = this.calendarSync;

    // ----------------------------------------------------------------
    // 9. Health sync (Req 13.3–13.6)
    // ----------------------------------------------------------------
    // Stub fetcher: returns null metrics when no real fetcher is provided
    const healthFetcher: BiometricFetcher = biometricFetcher ?? (async () => ({
      heartRateBpm: null,
      sleepScore: null,
      stepCount: null,
      updatedAt: new Date(),
    }));
    this.healthSync = new HealthSync(this.integrationManager, healthFetcher);

    // ----------------------------------------------------------------
    // 10. Session manager wired to health sync + calendar sync (Req 9.1–9.5, 13.3, 14.3)
    // ----------------------------------------------------------------
    this.sessionManager = new SessionManager(profileStore, this.healthSync, this.calendarSync);
    // Wire: biometric snapshot → conversation engine (Req 13.4)
    this.sessionManager.onBiometricSnapshot = (sessionId, snapshot) => {
      // Personalize opening recommendation based on biometrics
      const hints: string[] = [];
      if (snapshot.sleepScore !== null && snapshot.sleepScore < 50) {
        hints.push('low sleep score detected — consider a rest-focused activity');
      }
      if (snapshot.heartRateBpm !== null && snapshot.heartRateBpm > 90) {
        hints.push('elevated heart rate detected — breathing exercise recommended');
      }
      // Store hint in context for the conversation engine to use
      const context = this.conversationEngine.getContext(sessionId);
      // Double-cast needed: ConversationContext lacks an index signature (Req 13.4)
      (context as unknown as Record<string, unknown>)['biometricHints'] = hints;
    };

    // Wire: session duration notification (Req 9.5)
    this.sessionManager.onDurationNotification = (sessionId, userId) => {
      callbacks.onSessionDurationWarning(sessionId, userId);
    };

    // ----------------------------------------------------------------
    // 11. Wearable bridge wired to conversation engine (Req 15.1–15.6)
    // ----------------------------------------------------------------
    // Stub adapter: no-op when no real adapter is provided
    const wearableStreamAdapter: WearableStreamAdapter = wearableAdapter ?? (
      (_platformId, _token, _onReading, _onDisconnect) => ({ stop: () => {} })
    );
    this.wearableBridge = new WearableBridge(this.integrationManager, wearableStreamAdapter);

    // Wire: wearable readings → conversation engine for real-time adaptation (Req 15.3)
    // Also detect stress spikes and deliver proactive voice suggestions (Req 18.2)
    this.wearableBridge.onReading = (reading) => {
      if (this.activeSession) {
        const session = this.activeSession;
        this.conversationEngine.updateWearableReading(session.sessionId, reading);

        // Req 18.2: detect stress spike and interrupt with proactive suggestion
        this.personalizationEngine.detectStressSpike(reading, session.userId)
          .then((suggestion) => {
            if (suggestion !== null) {
              this.ttsEngine.speak(suggestion.rationale, {
                language: session.language,
                speed: 'normal',
                sessionId: session.sessionId,
              }).catch(() => {}); // fire-and-forget, swallow errors
            }
          })
          .catch(() => {}); // swallow detectStressSpike errors
      }
    };

    // ----------------------------------------------------------------
    // 12. Messaging gateway (Req 16.1–16.7)
    // ----------------------------------------------------------------
    this.messagingGateway = new MessagingGateway(this.integrationManager, messagingAdapters);

    // Wire: inbound commands → conversation engine (Req 16.4)
    this.messagingGateway.onInboundCommand = async (command) => {
      if (!this.activeSession) return;
      const actionMap: Record<string, string> = {
        START_BREATHING: 'start breathing exercise',
        SET_REMINDER: 'set a reminder',
        SESSION_SUMMARY: 'session summary',
      };
      const transcript = actionMap[command.parsedAction] ?? command.rawText;
      const response = await this.conversationEngine.processInput(
        transcript,
        this.activeSession.sessionId,
      );
      callbacks.onResponse(this.activeSession.sessionId, response.responseText, response.intent.type);
      await this.ttsEngine.speak(response.responseText, {
        language: response.language,
        speed: 'normal',
        sessionId: this.activeSession.sessionId,
      });
    };

    // ----------------------------------------------------------------
    // 13. Breathing guide (Req 5.1–5.5)
    // ----------------------------------------------------------------
    const breathingCallbacks: BreathingGuideCallbacks = {
      onPhaseTransition: (sessionId, phase) => callbacks.onBreathingPhase(sessionId, phase),
      onComplete: (sessionId) => callbacks.onBreathingComplete(sessionId),
      onStopped: (_sessionId) => {},
    };
    this.breathingGuide = new BreathingGuide(breathingCallbacks);

    // ----------------------------------------------------------------
    // 14. Mindfulness guide (Req 6.1–6.5)
    // ----------------------------------------------------------------
    const mindfulnessCallbacks: MindfulnessGuideCallbacks = {
      onSegment: (sessionId, text) => callbacks.onMindfulnessSegment(sessionId, text),
      onComplete: (sessionId) => callbacks.onMindfulnessComplete(sessionId),
    };
    this.mindfulnessGuide = new MindfulnessGuide(mindfulnessCallbacks);

    // ----------------------------------------------------------------
    // 15. Voice input handler → conversation engine → TTS pipeline (Req 1.1–1.5)
    // ----------------------------------------------------------------
    const voiceInputCallbacks: VoiceInputHandlerCallbacks = {
      onSpeechStart: () => {
        // Req 1.2: audio capture started within 200ms of voice activity
      },
      onSpeechEnd: async (transcript) => {
        if (!this.activeSession) return;
        // Req 1.3: forward transcript to conversation engine within 500ms
        const response = await this.conversationEngine.processInput(
          transcript,
          this.activeSession.sessionId,
        );
        callbacks.onResponse(this.activeSession.sessionId, response.responseText, response.intent.type);

        // Dispatch intent to feature components
        await this._dispatchIntent(response.intent.type, this.activeSession.sessionId, response.responseText, response.language);
      },
      onError: (error) => {
        // Req 1.4: notify user and enable text fallback
        callbacks.onMicrophoneError(error);
      },
    };
    this.voiceInput = new VoiceInputHandler(voiceInputCallbacks, speechRecognitionFactory);
  }

  // ----------------------------------------------------------------
  // Public API
  // ----------------------------------------------------------------

  /**
   * Starts a new session: loads VoiceProfile, fetches BiometricSnapshot, delivers weekly
   * summary (if available), then greets user.
   * Requirements: 9.1, 12.11, 13.3, 17.5, 17.8
   */
  async startSession(userId: string): Promise<Session> {
    // Load VoiceProfile before session starts (Req 12.11)
    await this.voiceSelector.loadVoiceProfile(userId);

    // Create session + fetch biometric snapshot (Req 9.1, 13.3)
    const session = await this.sessionManager.startSession(userId);
    this.activeSession = session;

    // Deliver weekly summary before main greeting (Req 17.5, 17.8)
    try {
      const report = await this.analyticsEngine.generateWeeklySummary(userId);
      if (report !== null) {
        // Deliver voiceScript via TTS (Req 17.5)
        await this.ttsEngine.speak(report.voiceScript, {
          language: session.language,
          speed: 'normal',
          sessionId: session.sessionId,
        }).catch(() => {}); // TTS failure must not block session start

        // Deliver on-screen summary (Req 17.6)
        this.callbacks.onWeeklySummary?.(report);
      }
    } catch {
      // Analytics failure must not block session start
    }

    // Start wearable stream if available (Req 15.1)
    try {
      await this.wearableBridge.startStream(userId, session.sessionId);
    } catch {
      // Wearable not connected — proceed without (Req 15.5)
    }

    // Deliver proactive activity suggestion before main greeting (Req 18.1, 18.5)
    try {
      const now = new Date();
      const suggestion = await this.personalizationEngine.suggestActivity({
        userId,
        currentHour: now.getHours(),
        currentDayOfWeek: now.getDay(),
        latestBiometricSnapshot: this.sessionManager.getLatestBiometricSnapshot(session.sessionId),
        latestWearableReading: this.wearableBridge.getLatestReading(session.sessionId),
      });
      if (suggestion !== null) {
        await this.ttsEngine.speak(suggestion.rationale, {
          language: session.language,
          speed: 'normal',
          sessionId: session.sessionId,
        }).catch(() => {}); // TTS failure must not block session start
      }
    } catch {
      // Personalization failure must not block session start
    }

    // Start voice input (Req 1.1)
    await this.voiceInput.start();

    return session;
  }

  /**
   * Ends the session: saves VoiceProfile, persists session, sends messaging summary.
   * Requirements: 9.2, 9.3, 12.10, 16.3
   */
  async endSession(): Promise<void> {
    if (!this.activeSession) return;
    const session = this.activeSession;

    // Stop voice input and wearable stream
    this.voiceInput.stop();
    this.wearableBridge.stopStream(session.sessionId);

    // Save VoiceProfile (Req 12.10)
    await this.voiceSelector.saveVoiceProfile(session.userId);

    // Persist session (Req 9.2)
    await this.sessionManager.saveSession(session);

    // Recompute analytics after session save (Req 17.9)
    this.analyticsEngine.recomputeAll(session.userId).catch(() => {}); // must not block session end

    // Send session summary via messaging (Req 16.3)
    const summary = this._buildSessionSummaryText(session);
    const connectedPlatforms = this.messagingGateway.getConnectedPlatforms(session.userId);
    if (connectedPlatforms.length > 0) {
      const message: OutboundMessage = {
        userId: session.userId,
        platforms: connectedPlatforms,
        text: summary,
        eventId: `session-end-${session.sessionId}`,
      };
      // Fire-and-forget within 60 seconds (Req 16.3)
      this.messagingGateway.sendNotification(message).catch(() => {});
    }

    this.activeSession = null;
  }

  /**
   * Returns the personalized greeting for the user.
   * Requirement 9.1
   */
  getGreeting(userId: string): string {
    return this.sessionManager.getGreeting(userId);
  }

  /**
   * Delivers a due reminder via messaging when app is inactive.
   * Requirement 16.2
   */
  async deliverDueRemindersViaMessaging(userId: string): Promise<void> {
    const dueReminders = await this.routineReminder.checkDue(userId);
    const connectedPlatforms = this.messagingGateway.getConnectedPlatforms(userId);
    if (connectedPlatforms.length === 0) return;

    for (const reminder of dueReminders) {
      const message: OutboundMessage = {
        userId,
        platforms: connectedPlatforms,
        text: `WellFlow Reminder: ${reminder.topic}`,
        eventId: `reminder-${reminder.reminderId}`,
      };
      await this.messagingGateway.sendNotification(message);
    }
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  /**
   * Routes a classified intent to the appropriate feature component.
   * Requirements: 2.1, 5.1, 6.1, 7.1, 8.1
   */
  private async _dispatchIntent(
    intentType: string,
    sessionId: string,
    responseText: string,
    language: string,
  ): Promise<void> {
    // Speak the response text via TTS (Req 3.1)
    await this.ttsEngine.speak(responseText, {
      language,
      speed: 'normal',
      sessionId,
    }, this._intentToActivityType(intentType));

    // Dispatch to feature component
    switch (intentType) {
      case 'BREATHING_EXERCISE': {
        const techniques = this.breathingGuide.listTechniques();
        // Default to box breathing; in a real app the user would choose
        this.breathingGuide.startExercise(techniques[0], sessionId);
        break;
      }
      case 'MINDFULNESS_SESSION': {
        // Default to 5 minutes; in a real app the user would choose
        this.mindfulnessGuide.startSession(5, sessionId);
        break;
      }
      case 'STRESS_RELIEF': {
        // Stress relief is handled entirely by the TTS response (Req 7.1)
        // A follow-up exchange lets the user choose a specific technique
        break;
      }
      case 'ROUTINE_REMINDER': {
        // ROUTINE_REMINDER intent with action='set' schedules a reminder.
        // The actual topic/time is parsed from a follow-up exchange in a real app;
        // here we acknowledge that the intent was received — the TTS response already
        // prompts the user to provide topic and time (Req 8.1).
        break;
      }
      case 'END_SESSION': {
        await this.endSession();
        break;
      }
    }
  }

  private _intentToActivityType(intentType: string): ActivityType | undefined {
    const map: Record<string, ActivityType> = {
      BREATHING_EXERCISE: 'BREATHING_EXERCISE',
      MINDFULNESS_SESSION: 'MINDFULNESS_SESSION',
      STRESS_RELIEF: 'STRESS_RELIEF',
      ROUTINE_REMINDER: 'ROUTINE_REMINDER',
    };
    return map[intentType];
  }

  private _buildSessionSummaryText(session: Session): string {
    const activities = session.activitiesCompleted.map((a) => a.activityType).join(', ') || 'none';
    const durationMin = Math.round((Date.now() - session.startTime.getTime()) / 60_000);
    const stressAvg = session.stressRatings.length > 0
      ? (session.stressRatings.reduce((s, r) => s + r, 0) / session.stressRatings.length).toFixed(1)
      : null;
    const stressPart = stressAvg ? ` | Avg stress: ${stressAvg}/5` : '';
    return `WellFlow session complete — ${durationMin} min | Activities: ${activities}${stressPart}`;
  }
}
