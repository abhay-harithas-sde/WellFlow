// Feature: wellflow-voice-wellness-assistant
// ConversationEngine: interprets user intent and generates wellness responses (Requirements 2.1–2.5, 10.1, 10.3)

import {
  WellnessIntent,
  ConversationResponse,
  ConversationContext,
  Exchange,
  WearableReading,
  PendingSuggestion,
  SuggestionFeedback,
} from '../types';
import { CrisisDetector } from './CrisisDetector';
import { PersonalizationEngine } from './PersonalizationEngine';
import { CommunityManager } from './CommunityManager';

const MAX_EXCHANGES = 10;

/**
 * Keyword rules evaluated in order; first match wins.
 * STRESS_RELIEF is checked before CRISIS_SUPPORT so that phrases like
 * "help me relax" resolve to STRESS_RELIEF rather than CRISIS_SUPPORT.
 */
const INTENT_RULES: Array<{
  keywords: string[];
  intent: () => WellnessIntent;
}> = [
  {
    keywords: ['stress', 'anxious', 'anxiety', 'relax'],
    intent: () => ({ type: 'STRESS_RELIEF' }),
  },
  {
    keywords: ['crisis', 'help me', 'emergency'],
    intent: () => ({ type: 'CRISIS_SUPPORT' }),
  },
  {
    keywords: ['breath', 'breathing'],
    intent: () => ({ type: 'BREATHING_EXERCISE' }),
  },
  {
    keywords: ['list reminders', 'show reminders'],
    intent: () => ({ type: 'ROUTINE_REMINDER', action: 'view' }),
  },
  {
    keywords: ['delete reminder', 'remove reminder'],
    intent: () => ({ type: 'ROUTINE_REMINDER', action: 'delete' }),
  },
  {
    keywords: ['remind', 'reminder', 'schedule'],
    intent: () => ({ type: 'ROUTINE_REMINDER', action: 'set' }),
  },
  {
    keywords: ['mindful', 'meditation', 'meditate'],
    intent: () => ({ type: 'MINDFULNESS_SESSION' }),
  },
  {
    keywords: ['end', 'stop', 'goodbye', 'bye'],
    intent: () => ({ type: 'END_SESSION' }),
  },
  {
    keywords: ['view feed', 'activity feed', 'community feed'],
    intent: () => ({ type: 'COMMUNITY' }),
  },
  {
    keywords: ['create group'],
    intent: () => ({ type: 'COMMUNITY' }),
  },
  {
    keywords: ['join group'],
    intent: () => ({ type: 'COMMUNITY' }),
  },
  {
    keywords: ['create challenge'],
    intent: () => ({ type: 'COMMUNITY' }),
  },
  {
    keywords: ['opt in'],
    intent: () => ({ type: 'COMMUNITY' }),
  },
  {
    keywords: ['community', 'group', 'challenge'],
    intent: () => ({ type: 'COMMUNITY' }),
  },
];

const RESPONSE_TEXTS: Record<string, string> = {
  BREATHING_EXERCISE:
    "Let's start a breathing exercise. I'll guide you through box breathing, 4-7-8, or diaphragmatic breathing. Which would you prefer?",
  MINDFULNESS_SESSION:
    "I'll guide you through a mindfulness session. Would you like 5, 10, or 15 minutes?",
  STRESS_RELIEF:
    "I'm here to help you relax. I can guide you through progressive muscle relaxation, a grounding exercise, or positive affirmations. Which technique sounds good to you?",
  ROUTINE_REMINDER_SET:
    "Sure, let's set a reminder. What topic and time would you like to schedule?",
  ROUTINE_REMINDER_VIEW:
    "Here are your active reminders. I'll read them out in chronological order.",
  ROUTINE_REMINDER_DELETE:
    "Which reminder would you like to delete? I'll confirm before removing it.",
  END_SESSION:
    "Thank you for your wellness session today. Take care and see you next time!",
  CRISIS_SUPPORT:
    "I hear you. You're not alone. Please reach out to the 988 Suicide & Crisis Lifeline by calling or texting 988, or call 911 for immediate help. I'm here with you.",
  COMMUNITY:
    "Let's connect with your wellness community. You can join a group, view challenges, or check the activity feed.",
  UNKNOWN:
    "I'm not sure I understood that. Here are the wellness options I can help with: breathing exercises, mindfulness sessions, stress relief techniques, routine reminders, community groups, or ending the session. What would you like to do?",
};

const ACCEPT_KEYWORDS = ['yes', 'ok', 'okay', 'sure', 'accept', 'sounds good', 'let\'s do it', 'go ahead'];
const DISMISS_KEYWORDS = ['no', 'skip', 'dismiss', 'not now', 'later', 'nope', 'pass'];

function detectSuggestionResponse(transcript: string): 'ACCEPTED' | 'DISMISSED' | null {
  const lower = transcript.toLowerCase().trim();
  for (const kw of ACCEPT_KEYWORDS) {
    if (lower === kw || lower.startsWith(kw + ' ') || lower.endsWith(' ' + kw)) {
      return 'ACCEPTED';
    }
  }
  for (const kw of DISMISS_KEYWORDS) {
    if (lower === kw || lower.startsWith(kw + ' ') || lower.endsWith(' ' + kw)) {
      return 'DISMISSED';
    }
  }
  return null;
}

function classifyIntent(transcript: string): WellnessIntent {
  const lower = transcript.toLowerCase();

  for (const rule of INTENT_RULES) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword)) {
        return rule.intent();
      }
    }
  }

  return { type: 'UNKNOWN' };
}

function buildResponseText(intent: WellnessIntent): string {
  if (intent.type === 'ROUTINE_REMINDER') {
    return RESPONSE_TEXTS[`ROUTINE_REMINDER_${intent.action.toUpperCase()}`];
  }
  return RESPONSE_TEXTS[intent.type];
}

export class ConversationEngine {
  private contexts: Map<string, ConversationContext> = new Map();
  /** Latest wearable reading per session, updated by WearableBridge (Req 15.3) */
  private latestWearableReadings: Map<string, WearableReading> = new Map();

  constructor(
    private readonly crisisDetector?: CrisisDetector,
    private readonly personalizationEngine?: PersonalizationEngine,
    private readonly communityManager?: CommunityManager,
  ) {}

  /**
   * Called by WearableBridge.onReading to pass real-time biometrics for session adaptation.
   * Requirement 15.3: adapt session intensity based on latest wearable readings.
   */
  updateWearableReading(sessionId: string, reading: WearableReading): void {
    this.latestWearableReadings.set(sessionId, reading);
  }

  /**
   * Returns the latest wearable reading for the session, or null if none received.
   */
  getLatestWearableReading(sessionId: string): WearableReading | null {
    return this.latestWearableReadings.get(sessionId) ?? null;
  }

  /**
   * Records a pending suggestion on the session context so that the next user
   * response can be matched as ACCEPTED or DISMISSED.
   * Requirement 18.6
   */
  setPendingSuggestion(sessionId: string, suggestion: PendingSuggestion): void {
    const context = this.getContext(sessionId);
    context.pendingSuggestion = suggestion;
  }

  /**
   * Returns the ConversationContext for the session, creating one if it doesn't exist.
   * Requirement 2.4: maintain context across at least 10 consecutive exchanges.
   */
  getContext(sessionId: string): ConversationContext {
    if (!this.contexts.has(sessionId)) {
      this.contexts.set(sessionId, {
        sessionId,
        exchanges: [],
        language: 'en',
        stressRatings: [],
      });
    }
    return this.contexts.get(sessionId)!;
  }

  /**
   * Processes a transcribed user input, classifies intent, generates a response,
   * and updates the rolling context window.
   *
   * Requirement 2.1: map input to a WellnessIntent.
   * Requirement 2.2: respond within 1 second (synchronous classification wrapped in Promise).
   * Requirement 2.3: UNKNOWN intent returns a clarifying prompt with all options.
   * Requirement 2.4: rolling window of last 10 exchanges.
   * Requirement 2.5: END_SESSION intent closes the session gracefully.
   * Requirement 10.1 / 10.3: language is carried through from the session context.
   * Requirement 19.1: Crisis_Detector runs before normal intent classification.
   */
  async processInput(
    transcript: string,
    sessionId: string
  ): Promise<ConversationResponse> {
    const context = this.getContext(sessionId);

    // Requirement 18.6: check if user is responding to a pending suggestion
    if (context.pendingSuggestion && this.personalizationEngine) {
      const signal = detectSuggestionResponse(transcript);
      if (signal !== null) {
        const feedback: SuggestionFeedback = {
          feedbackId: `${sessionId}-${Date.now()}`,
          userId: context.pendingSuggestion.userId,
          activityType: context.pendingSuggestion.activityType,
          signal,
          recordedAt: new Date(),
        };
        await this.personalizationEngine.recordFeedback(feedback);
        context.pendingSuggestion = undefined;
      }
    }

    // Requirement 19.1: check for crisis signal BEFORE normal intent routing
    if (this.crisisDetector) {
      const crisisSignal = this.crisisDetector.analyze(transcript, sessionId);
      if (crisisSignal !== null) {
        // Requirement 19.2, 19.3: deliver empathetic response + emergency resources
        const resources = this.crisisDetector.getEmergencyResources();
        const resourceText = resources.map((r) => `${r.name}: ${r.phoneNumber}`).join('. ');
        const crisisResponse = `I hear you, and you're not alone. Please reach out for help right now. ${resourceText}. I'm here with you.`;

        // Requirement 19.6: do NOT add crisis exchange to session history
        // Requirement 19.5: log the event
        await this.crisisDetector.logCrisisEvent(context.sessionId, crisisSignal);

        return {
          intent: { type: 'CRISIS_SUPPORT' },
          responseText: crisisResponse,
          language: context.language,
        };
      }
    }

    const intent = classifyIntent(transcript);
    const responseText = buildResponseText(intent);

    // Requirement 20.1, 20.4, 20.5: route COMMUNITY intents to CommunityManager
    if (intent.type === 'COMMUNITY' && this.communityManager) {
      const lower = transcript.toLowerCase();
      if (lower.includes('view feed') || lower.includes('activity feed') || lower.includes('community feed')) {
        // Req 20.4: view feed
        this.communityManager.getFeed(context.sessionId, 10).catch(() => {});
      } else if (lower.includes('create group')) {
        // Req 20.1: create group — name extracted from transcript or placeholder
        const nameMatch = lower.match(/create group(?:\s+called)?\s+(.+)/);
        const groupName = nameMatch ? nameMatch[1].trim() : 'My Wellness Group';
        this.communityManager.createGroup(context.sessionId, groupName).catch(() => {});
      } else if (lower.includes('join group')) {
        // Req 20.1: join group — code extracted from transcript
        const codeMatch = transcript.match(/\b([A-Z0-9]{6})\b/);
        if (codeMatch) {
          this.communityManager.joinGroup(context.sessionId, codeMatch[1]).catch(() => {});
        }
      } else if (lower.includes('create challenge')) {
        // Req 20.5: create challenge — extract groupId and activityType from transcript
        const activityType = lower.includes('breath')
          ? 'BREATHING'
          : lower.includes('mindful') || lower.includes('meditat')
          ? 'MINDFULNESS'
          : 'STRESS_RELIEF';
        const groupIdMatch = transcript.match(/\b(group[-\w]+)\b/i);
        const groupId = groupIdMatch ? groupIdMatch[1] : '';
        const durationMatch = lower.match(/(\d+)[- ]?day/);
        const durationDays = durationMatch ? parseInt(durationMatch[1], 10) : 7;
        if (groupId) {
          this.communityManager
            .createChallenge(context.sessionId, groupId, activityType as 'BREATHING' | 'MINDFULNESS' | 'STRESS_RELIEF', durationDays)
            .catch(() => {});
        }
      } else if (lower.includes('opt in')) {
        // Req 20.5: opt in to challenge — extract challengeId from transcript
        const challengeIdMatch = transcript.match(/\bchallenge[- _]?([A-Za-z0-9]+)\b/i);
        if (challengeIdMatch) {
          this.communityManager.optInToChallenge(context.sessionId, challengeIdMatch[0]).catch(() => {});
        }
      }
    }

    const userExchange: Exchange = {
      role: 'user',
      text: transcript,
      timestamp: new Date(),
      intent,
    };

    const assistantExchange: Exchange = {
      role: 'assistant',
      text: responseText,
      timestamp: new Date(),
      intent,
    };

    // Append both exchanges and enforce rolling window (max 10)
    context.exchanges.push(userExchange, assistantExchange);
    if (context.exchanges.length > MAX_EXCHANGES) {
      context.exchanges = context.exchanges.slice(
        context.exchanges.length - MAX_EXCHANGES
      );
    }

    return {
      intent,
      responseText,
      language: context.language,
    };
  }

  /**
   * Sets the language for the session context.
   * Requirement 10.1: conduct all interactions in the selected language.
   * Requirement 10.3: acknowledge language change and continue in new language.
   */
  setLanguage(sessionId: string, language: string): void {
    const context = this.getContext(sessionId);
    context.language = language;
  }

  /**
   * Adds a stress rating to the session context.
   * Requirement 7.4: store post-session stress rating for personalization.
   */
  addStressRating(sessionId: string, rating: number): void {
    const context = this.getContext(sessionId);
    context.stressRatings.push(rating);
  }
}
