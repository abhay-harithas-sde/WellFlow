// Feature: wellflow-voice-wellness-assistant
// CrisisDetector: monitors transcripts for crisis signals (Requirements 19.1–19.8)

import { CrisisSignalType, CrisisEvent, EmergencyResource } from '../types';
import { ProfileStore } from '../store/ProfileStore';

interface CrisisPattern {
  signal: CrisisSignalType;
  keywords: string[];
}

const CRISIS_PATTERNS: CrisisPattern[] = [
  {
    signal: 'SELF_HARM',
    keywords: ['hurt myself', 'harm myself', 'cut myself', 'self harm'],
  },
  {
    signal: 'SUICIDAL_IDEATION',
    keywords: [
      "want to die",
      "can't go on",
      "end my life",
      "kill myself",
      "no reason to live",
      "want to hurt myself",
      "suicidal",
      "suicide",
      "don't want to live",
    ],
  },
  {
    signal: 'EMERGENCY',
    keywords: ['emergency', 'call 911', "can't breathe", 'need emergency help', 'call an ambulance'],
  },
  {
    signal: 'GENERAL_CRISIS',
    keywords: ['crisis', 'breakdown', "can't cope", 'overwhelmed and need help', 'in danger', 'not safe'],
  },
];

const EMERGENCY_RESOURCES: EmergencyResource[] = [
  {
    name: '988 Suicide & Crisis Lifeline',
    phoneNumber: '988',
    description: 'Call or text 988 for free, confidential support 24/7.',
  },
  {
    name: '911 Emergency Services',
    phoneNumber: '911',
    description: 'Call 911 for immediate emergency assistance.',
  },
  {
    name: 'Crisis Text Line',
    phoneNumber: 'Text HOME to 741741',
    description: 'Text HOME to 741741 to connect with a crisis counselor.',
  },
];

export class CrisisDetector {
  private crisisEvents: CrisisEvent[] = [];

  constructor(private readonly profileStore: ProfileStore) {}

  /**
   * Analyzes a transcript for crisis signals.
   * Returns the signal type or null if no crisis detected.
   * Requirement 19.1
   */
  analyze(transcript: string, _sessionId: string): CrisisSignalType | null {
    const lower = transcript.toLowerCase();

    for (const pattern of CRISIS_PATTERNS) {
      for (const keyword of pattern.keywords) {
        if (lower.includes(keyword)) {
          return pattern.signal;
        }
      }
    }

    return null;
  }

  /**
   * Returns the list of emergency resources.
   * Requirement 19.3
   */
  getEmergencyResources(): EmergencyResource[] {
    return [...EMERGENCY_RESOURCES];
  }

  /**
   * Logs a CrisisEvent without storing conversation content.
   * Requirement 19.5
   */
  async logCrisisEvent(userId: string, signalType: CrisisSignalType): Promise<void> {
    const event: CrisisEvent = {
      eventId: `crisis-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      userId,
      timestamp: new Date(),
      signalType,
      // NOTE: no conversation content stored (Req 19.5)
    };
    this.crisisEvents.push(event);
  }

  /** Returns logged crisis events (for testing). */
  getCrisisEvents(): CrisisEvent[] {
    return [...this.crisisEvents];
  }
}
