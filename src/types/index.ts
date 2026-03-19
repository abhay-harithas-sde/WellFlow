// ============================================================
// Core Types and Interfaces for WellFlow Voice Wellness Assistant
// ============================================================

// ------------------------------------------------------------------
// Intent Types
// ------------------------------------------------------------------

export type WellnessIntent =
  | { type: 'BREATHING_EXERCISE' }
  | { type: 'MINDFULNESS_SESSION' }
  | { type: 'STRESS_RELIEF' }
  | { type: 'ROUTINE_REMINDER'; action: 'set' | 'view' | 'delete' }
  | { type: 'GENERAL_WELLNESS' }
  | { type: 'END_SESSION' }
  | { type: 'CRISIS_SUPPORT' }
  | { type: 'COMMUNITY' }
  | { type: 'UNKNOWN' };

// ------------------------------------------------------------------
// Conversation Types
// ------------------------------------------------------------------

export interface ConversationResponse {
  intent: WellnessIntent;
  responseText: string;
  language: string;
}

export interface Exchange {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  intent?: WellnessIntent;
}

export interface PendingSuggestion {
  activityType: SuggestionActivityType;
  triggeredBy: 'SESSION_OPEN' | 'STRESS_SPIKE';
  userId: string;
}

export interface ConversationContext {
  sessionId: string;
  exchanges: Exchange[]; // max 10, rolling window
  language: string;
  stressRatings: number[];
  pendingSuggestion?: PendingSuggestion;
}

// ------------------------------------------------------------------
// Session Types
// ------------------------------------------------------------------

export interface ActivityRecord {
  activityType: 'BREATHING' | 'MINDFULNESS' | 'STRESS_RELIEF' | 'REMINDER';
  startTime: Date;
  completedFully: boolean;
  metadata: Record<string, unknown>;
}

export interface Reminder {
  reminderId: string;
  userId: string;
  topic: string;
  scheduledTime: Date;
  delivered: boolean;
}

export interface Session {
  sessionId: string;
  userId: string;
  startTime: Date;
  language: string;
  activitiesCompleted: ActivityRecord[];
  lastActivityTime: Date;
  stressRatings: number[];
  reminders: Reminder[];
}

export interface SessionSummary {
  sessionId: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  activitiesCompleted: ActivityRecord[];
  averageStressRating: number | null;
}

// ------------------------------------------------------------------
// Voice / TTS Types
// ------------------------------------------------------------------

export type ActivityType =
  | 'BREATHING_EXERCISE'
  | 'MINDFULNESS_SESSION'
  | 'STRESS_RELIEF'
  | 'ROUTINE_REMINDER';

export interface VoiceFilter {
  name?: string;
  accent?: string;
  gender?: 'male' | 'female' | 'neutral';
  style?: string;
}

export interface MurfVoice {
  voiceId: string;
  name: string;
  accent: string;
  gender: 'male' | 'female' | 'neutral';
  style: string;
}

export interface VoiceProfile {
  activityAssignments: Partial<Record<ActivityType, string>>; // activityType → voiceId
  fallbackVoiceId: string | null;
}

export interface TTSOptions {
  language: string;
  speed: 'slow' | 'normal' | 'fast';
  sessionId: string;
  voiceId?: string; // optional override; if omitted, voice resolution applies
}

// ------------------------------------------------------------------
// User Profile
// ------------------------------------------------------------------

export interface UserProfile {
  userId: string;
  name: string;
  preferredLanguage: string;
  ttsSpeed: 'slow' | 'normal' | 'fast';
  sessionHistory: SessionSummary[];
  voiceProfile: VoiceProfile;
}

// ------------------------------------------------------------------
// Error / Connection Types
// ------------------------------------------------------------------

export type MicrophoneError =
  | 'PERMISSION_DENIED'
  | 'DEVICE_UNAVAILABLE'
  | 'CAPTURE_FAILED';

export interface WebSocketError {
  code: number;
  reason: string;
  wasClean: boolean;
}

export type CloseReason =
  | 'INACTIVITY_TIMEOUT'
  | 'UNEXPECTED'
  | 'USER_INITIATED';

// ------------------------------------------------------------------
// Integration Types
// ------------------------------------------------------------------

export type PlatformId =
  | 'APPLE_HEALTH'
  | 'GOOGLE_FIT'
  | 'FITBIT'
  | 'GARMIN'
  | 'GOOGLE_CALENDAR'
  | 'APPLE_CALENDAR'
  | 'OUTLOOK'
  | 'APPLE_WATCH'
  | 'WEAR_OS'
  | 'OURA'
  | 'SLACK'
  | 'WHATSAPP'
  | 'TELEGRAM';

export type IntegrationStatus = 'CONNECTED' | 'DISCONNECTED' | 'UNAUTHORIZED';

export interface OAuth_Token {
  platformId: PlatformId;
  userId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
}

export interface BiometricSnapshot {
  userId: string;
  capturedAt: Date;
  heartRateBpm: number | null;
  sleepScore: number | null; // 0–100 normalized
  stepCount: number | null;
  sources: PlatformId[];
}

export interface WearableReading {
  platformId: PlatformId;
  timestamp: Date;
  heartRateBpm: number | null;
  hrvMs: number | null; // heart rate variability in milliseconds
  stressScore: number | null; // 0–100 normalized
}

// ------------------------------------------------------------------
// Analytics Types
// ------------------------------------------------------------------

export interface StreakRecord {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | null;
}

export interface MoodTrend {
  userId: string;
  periodDays: 7 | 30;
  dataPoints: Array<{
    date: Date;
    averageStressRating: number;
    sessionCount: number;
  }>;
}

export interface ActivityFrequency {
  userId: string;
  periodDays: 7 | 30;
  counts: Partial<Record<'BREATHING' | 'MINDFULNESS' | 'STRESS_RELIEF' | 'REMINDER', number>>;
}

export interface WellnessInsight {
  insightId: string;
  activityType: 'BREATHING' | 'MINDFULNESS' | 'STRESS_RELIEF' | 'REMINDER';
  text: string;
  averageStressBefore: number;
  averageStressAfter: number;
  sessionCount: number;
}

export interface WeeklySummaryReport {
  userId: string;
  periodDays: 7 | 30;
  generatedAt: Date;
  streak: StreakRecord;
  moodTrend: MoodTrend;
  activityFrequency: ActivityFrequency;
  insights: WellnessInsight[];
  voiceScript: string;
}

// ------------------------------------------------------------------
// Personalization Types
// ------------------------------------------------------------------

export type SuggestionActivityType =
  | 'BREATHING_EXERCISE'
  | 'MINDFULNESS_SESSION'
  | 'STRESS_RELIEF';

export interface ActivitySuggestion {
  activityType: SuggestionActivityType;
  confidence: number; // 0.0–1.0
  rationale: string;
  triggeredBy: 'SESSION_OPEN' | 'STRESS_SPIKE';
}

export interface SuggestionFeedback {
  feedbackId: string;
  userId: string;
  activityType: SuggestionActivityType;
  signal: 'ACCEPTED' | 'DISMISSED';
  recordedAt: Date;
}

export interface PersonalizationContext {
  userId: string;
  currentHour: number; // 0–23
  currentDayOfWeek: number; // 0 (Sunday) – 6 (Saturday)
  latestBiometricSnapshot: BiometricSnapshot | null;
  latestWearableReading: WearableReading | null;
}

export interface ActivityWeight {
  activityType: SuggestionActivityType;
  stressReductionScore: number;
  timeOfDayScores: number[]; // 24-element array
  feedbackScore: number;
}

export interface PersonalizationProfile {
  userId: string;
  activityWeights: ActivityWeight[];
  feedbackHistory: SuggestionFeedback[];
  minConfidenceThreshold: number; // default 0.3
  lastUpdated: Date;
}

// ------------------------------------------------------------------
// Crisis Types
// ------------------------------------------------------------------

export type CrisisSignalType =
  | 'SELF_HARM'
  | 'SUICIDAL_IDEATION'
  | 'EMERGENCY'
  | 'GENERAL_CRISIS';

export interface CrisisEvent {
  eventId: string;
  userId: string;
  timestamp: Date;
  signalType: CrisisSignalType;
}

export interface EmergencyResource {
  name: string;
  phoneNumber: string;
  description: string;
}

// ------------------------------------------------------------------
// Community Types
// ------------------------------------------------------------------

export type ChallengeStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface WellnessGroup {
  groupId: string;
  groupCode: string;
  name: string;
  memberIds: string[]; // max 20
  createdAt: Date;
}

export interface SharedChallenge {
  challengeId: string;
  groupId: string;
  activityType: 'BREATHING' | 'MINDFULNESS' | 'STRESS_RELIEF';
  durationDays: number;
  startDate: Date;
  endDate: Date;
  status: ChallengeStatus;
  optedInMemberIds: string[];
  completionLog: Record<string, Date[]>;
}

export interface CommunityFeedEvent {
  eventId: string;
  groupId: string;
  anonymizedName: string;
  activityType: 'BREATHING' | 'MINDFULNESS' | 'STRESS_RELIEF' | 'REMINDER';
  occurredAt: Date;
}

export interface GroupInvite {
  inviteId: string;
  groupId: string;
  inviteeUserId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: Date;
}

// ------------------------------------------------------------------
// Messaging Types
// ------------------------------------------------------------------

export type MessagingPlatformId = 'SLACK' | 'WHATSAPP' | 'TELEGRAM';

export interface OutboundMessage {
  userId: string;
  platforms: MessagingPlatformId[];
  text: string;
  eventId: string;
}

export interface InboundCommand {
  platformId: MessagingPlatformId;
  userId: string;
  rawText: string;
  parsedAction: 'START_BREATHING' | 'SET_REMINDER' | 'SESSION_SUMMARY' | 'UNKNOWN';
}

// ------------------------------------------------------------------
// Calendar Types
// ------------------------------------------------------------------

export interface CalendarEvent {
  externalId: string;
  platformId: PlatformId;
  title: string;
  startTime: Date;
  endTime: Date;
  description: string;
  wellflowReminderId?: string;
}

// ------------------------------------------------------------------
// Integration Config
// ------------------------------------------------------------------

export interface IntegrationConfig {
  userId: string;
  platforms: {
    [K in PlatformId]?: {
      status: IntegrationStatus;
      token?: OAuth_Token;
    };
  };
}
