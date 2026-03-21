/**
 * Singleton service instances shared across all RAW API routes.
 * Module-level state persists for the lifetime of the Next.js dev server process.
 */
import { ProfileStore } from '../../../src/store/ProfileStore';
import {
  AnalyticsEngine,
  PersonalizationEngine,
  CrisisDetector,
  CommunityManager,
  BreathingGuide,
  MindfulnessGuide,
  RoutineReminder,
  SessionManager,
  ConversationEngine,
  IntegrationManager,
  HealthSync,
  CalendarSync,
  WearableBridge,
  MessagingGateway,
} from '../../../src/components';

function log(tag: string, msg: string) {
  console.log(`[BJP:${tag}] ${msg}`);
}

const noopBiometricFetcher = async () => ({
  heartRateBpm: null,
  sleepScore: null,
  stepCount: null,
  updatedAt: new Date(),
});

const noopCalendarAdapter = {
  createEvent: async () => 'noop-external-id',
  listEvents: async () => [],
};

const noopWearableAdapter = () => ({ stop: () => {} });

export const store = new ProfileStore();
export const personalizationEngine = new PersonalizationEngine(store);
export const analyticsEngine = new AnalyticsEngine(store, personalizationEngine);
export const crisisDetector = new CrisisDetector(store);
export const integrationManager = new IntegrationManager(store, {
  onTokenRefreshFailure: (pid: string, uid: string) =>
    log('integration', `Token refresh failed: ${uid} / ${pid}`),
});
export const healthSync = new HealthSync(integrationManager, noopBiometricFetcher);
export const routineReminder = new RoutineReminder();
export const calendarSync = new CalendarSync(
  integrationManager,
  noopCalendarAdapter,
  routineReminder
);
export const wearableBridge = new WearableBridge(integrationManager, noopWearableAdapter);
export const messagingGateway = new MessagingGateway(integrationManager, {});
export const sessionManager = new SessionManager(store);
export const communityManager = new CommunityManager(
  {
    onMemberJoined: (groupId: string, userId: string) =>
      log('community', `User ${userId} joined group ${groupId}`),
    onChallengeFinalized: (c: any, rate: number) =>
      log('community', `Challenge ${c.challengeId} finalized, completion=${rate}`),
    onNamePromptRequired: (userId: string) =>
      log('community', `Name prompt required for ${userId}`),
  },
  store
);
export const conversationEngine = new ConversationEngine(
  crisisDetector,
  personalizationEngine,
  communityManager
);
export const breathingGuide = new BreathingGuide({
  onPhaseTransition: (sid: string, phase: any) =>
    log('breathing', `[${sid}] phase=${phase.label} dur=${phase.durationMs}ms`),
  onComplete: (sid: string) => log('breathing', `[${sid}] complete`),
  onStopped: (sid: string) => log('breathing', `[${sid}] stopped`),
});
export const mindfulnessGuide = new MindfulnessGuide({
  onSegment: (sid: string, text: string) => log('mindfulness', `[${sid}] ${text}`),
  onComplete: (sid: string) => log('mindfulness', `[${sid}] complete`),
  onStopped: (sid: string) => log('mindfulness', `[${sid}] stopped`),
});

export function getMurfApiKey(): string {
  const key = process.env.MURF_API_KEY;
  if (!key?.trim()) throw new Error('MURF_API_KEY is missing. Set it in .env.local');
  return key;
}

export async function murfFetch(
  method: string,
  path: string,
  body?: string
): Promise<{ status: number; data: unknown }> {
  const apiKey = getMurfApiKey();
  const res = await fetch(`https://api.murf.ai${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(body ? { 'Content-Length': String(Buffer.byteLength(body)) } : {}),
    },
    body: body ?? undefined,
  });
  const data = await res.json().catch(() => res.text());
  return { status: res.status, data };
}
