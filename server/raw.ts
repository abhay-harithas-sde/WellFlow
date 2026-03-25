/**
 * RAW — Unified WellFlow Server
 *
 * Single entry point for the entire project:
 *   - HTTP API  (all /api/raw/* routes)
 *   - WebSocket (real-time TTS streaming via Murf)
 *   - Static proxy to Next.js frontend (dev) or static build (prod)
 *
 * Usage:
 *   npx ts-node server/raw.ts          (dev)
 *   node dist/server/raw.js            (prod, after tsc)
 *
 * Env vars (from .env.local):
 *   PORT            — HTTP port (default 4000)
 *   NEXT_URL        — Next.js dev server to proxy (default http://localhost:3000)
 *   MURF_API_KEY    — Murf AI API key
 */

import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';

// ─── Load .env.local ────────────────────────────────────────────────────────
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

// ─── Services (same singletons as Next.js API routes) ───────────────────────
import { ProfileStore } from '../src/store/ProfileStore';
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
} from '../src/components';

function log(tag: string, msg: string) {
  console.log(`[RAW:${tag}] ${msg}`);
}

const noopBiometricFetcher = async () => ({
  heartRateBpm: null, sleepScore: null, stepCount: null, updatedAt: new Date(),
});
const noopCalendarAdapter = {
  createEvent: async () => 'noop-external-id',
  listEvents: async () => [],
};
const noopWearableAdapter = () => ({ stop: () => {} });

const store               = new ProfileStore();
const personalization     = new PersonalizationEngine(store);
const analytics           = new AnalyticsEngine(store, personalization);
const crisis              = new CrisisDetector(store);
const integrations        = new IntegrationManager(store, {
  onTokenRefreshFailure: (pid: string, uid: string) =>
    log('integration', `Token refresh failed: ${uid}/${pid}`),
});
const healthSync          = new HealthSync(integrations, noopBiometricFetcher);
const reminders           = new RoutineReminder();
const calendarSync        = new CalendarSync(integrations, noopCalendarAdapter, reminders);
const wearable            = new WearableBridge(integrations, noopWearableAdapter);
const messaging           = new MessagingGateway(integrations, {});
const sessions            = new SessionManager(store);
const community           = new CommunityManager(
  {
    onMemberJoined:       (g, u) => log('community', `${u} joined ${g}`),
    onChallengeFinalized: (c, r) => log('community', `challenge ${c.challengeId} rate=${r}`),
    onNamePromptRequired: (u)    => log('community', `name prompt for ${u}`),
  },
  store
);
const conversation        = new ConversationEngine(crisis, personalization, community);
const breathing           = new BreathingGuide({
  onPhaseTransition: (s, p) => log('breathing', `[${s}] phase=${p.label}`),
  onComplete:        (s)    => log('breathing', `[${s}] complete`),
  onStopped:         (s)    => log('breathing', `[${s}] stopped`),
});
const mindfulness         = new MindfulnessGuide({
  onSegment:  (s, t) => log('mindfulness', `[${s}] ${t}`),
  onComplete: (s)    => log('mindfulness', `[${s}] complete`),
});

// ─── Murf helpers ────────────────────────────────────────────────────────────
function getMurfKey(): string {
  const k = process.env.MURF_API_KEY;
  if (!k?.trim()) throw new Error('MURF_API_KEY missing — set it in .env.local');
  return k;
}

async function murfFetch(method: string, urlPath: string, body?: string) {
  const res = await fetch(`https://api.murf.ai${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${getMurfKey()}`,
      'Content-Type': 'application/json',
    },
    body: body ?? undefined,
  });
  const data = await res.json().catch(() => res.text());
  return { status: res.status, data };
}

// ─── Platforms list ──────────────────────────────────────────────────────────
const PLATFORMS = [
  'APPLE_HEALTH','GOOGLE_FIT','FITBIT','GARMIN','GOOGLE_CALENDAR',
  'APPLE_CALENDAR','OUTLOOK','APPLE_WATCH','WEAR_OS','OURA',
  'SLACK','WHATSAPP','TELEGRAM',
] as const;

// ─── HTTP helpers ────────────────────────────────────────────────────────────
type Handler = (req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>) => Promise<void>;

function json(res: http.ServerResponse, data: unknown, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

async function parseBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const raw = await readBody(req);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

// ─── Route table ─────────────────────────────────────────────────────────────
interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: Handler;
}

const routes: Route[] = [];

function addRoute(method: string, path: string, handler: Handler) {
  const paramNames: string[] = [];
  const regexStr = path
    .replace(/\[(\w+)\]/g, (_, name) => { paramNames.push(name); return '([^/]+)'; })
    .replace(/\//g, '\\/');
  routes.push({ method, pattern: new RegExp(`^${regexStr}$`), paramNames, handler });
}

// ─── Route definitions ───────────────────────────────────────────────────────

// Health
addRoute('GET', '/api/raw/health', async (_req, res) => {
  json(res, {
    status: 'ok', server: 'RAW', version: '1.0.0',
    integrations: [
      'murf-tts','murf-voices','conversation','breathing','mindfulness',
      'reminders','sessions','analytics','crisis','community',
      'integrations','health-sync','calendar-sync','wearable','messaging','profile',
    ],
  });
});

// Profile
addRoute('GET', '/api/raw/profile/[userId]', async (_req, res, { userId }) => {
  const profile = store.getProfile(userId);
  if (!profile) return json(res, { error: 'Not found' }, 404);
  json(res, profile);
});
addRoute('PUT', '/api/raw/profile/[userId]', async (req, res, { userId }) => {
  const body = await parseBody(req);
  const profile = store.upsertProfile(userId, body as any);
  json(res, profile);
});

// Sessions
addRoute('POST', '/api/raw/sessions/start', async (req, res) => {
  const { userId, language } = await parseBody(req) as any;
  const session = await sessions.startSession(userId);
  if (language) session.language = language;
  log('session', `Started ${session.sessionId} for ${userId}`);
  json(res, session, 201);
});
addRoute('POST', '/api/raw/sessions/[sessionId]/end', async (req, res, { sessionId }) => {
  const { stressRating } = await parseBody(req) as any;
  const session = sessions.getSession(sessionId);
  if (!session) return json(res, { error: 'Session not found' }, 404);
  if (stressRating != null) session.stressRatings.push(Number(stressRating));
  await sessions.saveSession(session);
  json(res, { ended: true, sessionId });
});
addRoute('GET', '/api/raw/sessions/[sessionId]/history', async (_req, res, { sessionId }) => {
  const history = store.getSessionHistory(sessionId);
  json(res, history);
});

// Conversation
addRoute('POST', '/api/raw/conversation', async (req, res) => {
  const { userId, sessionId, text, language } = await parseBody(req) as any;
  if (language) conversation.setLanguage(sessionId, language);
  const response = await conversation.processInput(text, sessionId);
  log('conversation', `[${sessionId}] intent=${response.intent.type}`);
  json(res, response);
});

// Breathing
addRoute('GET', '/api/raw/breathing/techniques', async (_req, res) => {
  json(res, breathing.listTechniques());
});
addRoute('POST', '/api/raw/breathing/start', async (req, res) => {
  const { sessionId, techniqueId } = await parseBody(req) as any;
  const techniques = breathing.listTechniques();
  const technique = techniques.find((t) => t.id === (techniqueId ?? 'BOX'));
  if (!technique) return json(res, { error: 'Unknown technique' }, 400);
  json(res, breathing.startExercise(technique, sessionId));
});
addRoute('POST', '/api/raw/breathing/stop', async (req, res) => {
  const { sessionId } = await parseBody(req) as any;
  breathing.stopExercise(sessionId);
  json(res, { stopped: true });
});

// Mindfulness
addRoute('POST', '/api/raw/mindfulness/start', async (req, res) => {
  const { sessionId, durationMinutes } = await parseBody(req) as any;
  const validDuration = [5, 10, 15].includes(durationMinutes) ? durationMinutes : 5;
  const result = mindfulness.startSession(validDuration, sessionId);
  json(res, result);
});
addRoute('POST', '/api/raw/mindfulness/stop', async (req, res) => {
  const { sessionId } = await parseBody(req) as any;
  mindfulness.pause(sessionId);
  json(res, { stopped: true });
});

// Reminders
addRoute('POST', '/api/raw/reminders', async (req, res) => {
  const { userId, topic, scheduledTime } = await parseBody(req) as any;
  const reminder = await reminders.createReminder(topic, new Date(scheduledTime), userId);
  json(res, reminder, 201);
});
addRoute('GET', '/api/raw/reminders/[id]', async (_req, res, { id }) => {
  const list = await reminders.listReminders(id);
  json(res, list);
});
addRoute('DELETE', '/api/raw/reminders/[id]', async (req, res, { id }) => {
  const { userId } = await parseBody(req) as any;
  reminders.deleteReminder(id, userId);
  json(res, { deleted: true });
});

// Analytics
addRoute('GET', '/api/raw/analytics/[userId]/streak', async (_req, res, { userId }) => {
  json(res, await analytics.computeStreak(userId));
});
addRoute('GET', '/api/raw/analytics/[userId]/mood', async (req, res, { userId }) => {
  const u = new URL(req.url!, `http://localhost`);
  const days = (u.searchParams.get('days') === '30' ? 30 : 7) as 7 | 30;
  json(res, await analytics.computeMoodTrend(userId, days));
});
addRoute('GET', '/api/raw/analytics/[userId]/activity', async (req, res, { userId }) => {
  const u = new URL(req.url!, `http://localhost`);
  const days = (u.searchParams.get('days') === '30' ? 30 : 7) as 7 | 30;
  json(res, await analytics.computeActivityFrequency(userId, days));
});
addRoute('GET', '/api/raw/analytics/[userId]/insights', async (_req, res, { userId }) => {
  json(res, await analytics.generateInsights(userId));
});
addRoute('GET', '/api/raw/analytics/[userId]/summary', async (req, res, { userId }) => {
  const u = new URL(req.url!, `http://localhost`);
  const days = (u.searchParams.get('days') === '30' ? 30 : 7) as 7 | 30;
  const summary = await analytics.generateWeeklySummary(userId, days);
  if (!summary) return json(res, { error: 'Not enough session data' }, 404);
  json(res, summary);
});

// Crisis
addRoute('POST', '/api/raw/crisis/analyze', async (req, res) => {
  const { transcript, sessionId } = await parseBody(req) as any;
  const signal = crisis.analyze(transcript, sessionId);
  const resources = signal ? crisis.getEmergencyResources() : [];
  if (signal) log('crisis', `Signal=${signal} session=${sessionId}`);
  json(res, { signal, resources });
});
addRoute('GET', '/api/raw/crisis/resources', async (_req, res) => {
  json(res, crisis.getEmergencyResources());
});

// Community
addRoute('POST', '/api/raw/community/groups', async (req, res) => {
  const { userId, name } = await parseBody(req) as any;
  json(res, await community.createGroup(userId, name), 201);
});
addRoute('POST', '/api/raw/community/groups/join', async (req, res) => {
  const { userId, groupCode } = await parseBody(req) as any;
  json(res, await community.joinGroup(userId, groupCode));
});
addRoute('GET', '/api/raw/community/feed', async (req, res) => {
  const u = new URL(req.url!, `http://localhost`);
  const userId = u.searchParams.get('userId') ?? '';
  const limit = parseInt(u.searchParams.get('limit') ?? '20', 10);
  json(res, await community.getFeed(userId, limit));
});
addRoute('POST', '/api/raw/community/challenges', async (req, res) => {
  const { userId, groupId, activityType, durationDays } = await parseBody(req) as any;
  json(res, await community.createChallenge(userId, groupId, activityType, durationDays), 201);
});

// Integrations
addRoute('GET', '/api/raw/integrations/[userId]/status', async (_req, res, { userId }) => {
  const status: Record<string, string> = {};
  for (const p of PLATFORMS) status[p] = integrations.getStatus(p, userId);
  json(res, status);
});
addRoute('POST', '/api/raw/integrations/token', async (req, res) => {
  const { platformId, userId, accessToken, refreshToken, expiresAt } = await parseBody(req) as any;
  await integrations.authorize(platformId, userId, { platformId, userId, accessToken, refreshToken: refreshToken ?? null, expiresAt: new Date(expiresAt) });
  json(res, { stored: true });
});

// Health sync
addRoute('POST', '/api/raw/health-sync/[userId]', async (_req, res, { userId }) => {
  const snapshot = await healthSync.fetchSnapshot(userId);
  json(res, snapshot);
});

// Calendar sync
addRoute('GET', '/api/raw/calendar-sync/[userId]', async (_req, res, { userId }) => {
  await calendarSync.pollChanges(userId);
  json(res, { polled: true, userId });
});

// i18n
addRoute('GET', '/api/raw/i18n/[locale]', async (_req, res, { locale }) => {
  const msgPath = path.resolve(process.cwd(), 'messages', `${locale}.json`);
  if (!fs.existsSync(msgPath)) return json(res, { error: 'Locale not found' }, 404);
  json(res, JSON.parse(fs.readFileSync(msgPath, 'utf-8')));
});

// Messaging
addRoute('POST', '/api/raw/messaging/send', async (req, res) => {
  const body = await parseBody(req) as any;
  await messaging.sendNotification(body);
  json(res, { sent: true });
});

// Murf TTS
addRoute('POST', '/api/raw/murf/tts', async (req, res) => {
  try {
    const body = await readBody(req);
    const { status, data } = await murfFetch('POST', '/v1/speech/generate', body);
    json(res, data, status);
  } catch (err: any) {
    json(res, { error: err.message }, 500);
  }
});

// Murf Voices
addRoute('GET', '/api/raw/murf/voices', async (_req, res) => {
  try {
    const { status, data } = await murfFetch('GET', '/v1/speech/voices');
    json(res, data, status);
  } catch (err: any) {
    json(res, { error: err.message }, 500);
  }
});

// ─── Router ──────────────────────────────────────────────────────────────────
function matchRoute(method: string, pathname: string): { handler: Handler; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    const m = pathname.match(route.pattern);
    if (!m) continue;
    const params: Record<string, string> = {};
    route.paramNames.forEach((name, i) => { params[name] = m[i + 1]; });
    return { handler: route.handler, params };
  }
  return null;
}

// ─── Frontend proxy ──────────────────────────────────────────────────────────
const NEXT_URL = process.env.NEXT_URL ?? 'http://localhost:4000';

async function proxyToNext(req: http.IncomingMessage, res: http.ServerResponse) {
  const target = `${NEXT_URL}${req.url}`;
  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: Object.fromEntries(
        Object.entries(req.headers).filter(([, v]) => v !== undefined) as [string, string][]
      ),
      body: ['GET', 'HEAD'].includes(req.method ?? 'GET') ? undefined : await readBody(req),
    });
    res.writeHead(upstream.status, Object.fromEntries(upstream.headers.entries()));
    const buf = await upstream.arrayBuffer();
    res.end(Buffer.from(buf));
  } catch {
    res.writeHead(502);
    res.end('Bad Gateway — Next.js not reachable');
  }
}

// ─── HTTP server ─────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const pathname = new URL(req.url!, `http://localhost`).pathname;

  // API routes
  if (pathname.startsWith('/api/raw/')) {
    const match = matchRoute(req.method ?? 'GET', pathname);
    if (match) {
      try {
        await match.handler(req, res, match.params);
      } catch (err: any) {
        log('error', err.message);
        json(res, { error: err.message }, 500);
      }
      return;
    }
    json(res, { error: 'Not found' }, 404);
    return;
  }

  // Everything else → proxy to Next.js
  await proxyToNext(req, res);
});

// ─── WebSocket server (Murf TTS streaming) ───────────────────────────────────
const wss = new WebSocketServer({ server, path: '/ws/murf/tts' });

wss.on('connection', (ws, req) => {
  const sessionId = new URL(req.url!, `http://localhost`).searchParams.get('sessionId') ?? 'unknown';
  log('ws', `Connected session=${sessionId}`);

  let murfWs: WebSocket | null = null;

  function connectMurf() {
    try {
      const key = getMurfKey();
      murfWs = new WebSocket('wss://api.murf.ai/v1/speech/stream', {
        headers: { Authorization: `Bearer ${key}` },
      });

      murfWs.on('message', (data) => ws.readyState === WebSocket.OPEN && ws.send(data));
      murfWs.on('error', (err) => {
        log('ws', `Murf error: ${err.message}`);
        ws.send(JSON.stringify({ error: err.message }));
      });
      murfWs.on('close', () => log('ws', `Murf closed session=${sessionId}`));
    } catch (err: any) {
      ws.send(JSON.stringify({ error: err.message }));
    }
  }

  connectMurf();

  ws.on('message', (data) => {
    if (murfWs?.readyState === WebSocket.OPEN) {
      murfWs.send(data);
    }
  });

  ws.on('close', () => {
    log('ws', `Client disconnected session=${sessionId}`);
    murfWs?.close();
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '4000', 10);

server.listen(PORT, () => {
  console.log(`\n┌─────────────────────────────────────────┐`);
  console.log(`│  RAW Server — WellFlow Unified Backend  │`);
  console.log(`├─────────────────────────────────────────┤`);
  console.log(`│  HTTP  →  http://localhost:${PORT}          │`);
  console.log(`│  WS    →  ws://localhost:${PORT}/ws/murf/tts│`);
  console.log(`│  Next  →  http://localhost:4000         │`);
  console.log(`└─────────────────────────────────────────┘\n`);
  console.log(`  API routes: ${routes.length} registered`);
  console.log(`  Run "npm run dev" to start Next.js on port 4000\n`);
});
