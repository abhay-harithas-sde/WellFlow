const BASE = '/api/raw';

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  return res.json();
}

export const api = {
  health: () => req<{ status: string; version: string }>('GET', '/health'),

  // Profile
  getProfile: (userId: string) => req<any>('GET', `/profile/${userId}`),
  updateProfile: (userId: string, data: any) => req<any>('PUT', `/profile/${userId}`, data),

  // Sessions
  startSession: (userId: string, language?: string) =>
    req<any>('POST', '/sessions/start', { userId, language }),
  endSession: (sessionId: string, stressRating?: number) =>
    req<any>('POST', `/sessions/${sessionId}/end`, { stressRating }),
  getSessionHistory: (userId: string) => req<any[]>('GET', `/sessions/${userId}/history`),

  // Conversation
  converse: (userId: string, sessionId: string, text: string, language?: string) =>
    req<any>('POST', '/conversation', { userId, sessionId, text, language }),

  // Breathing
  getBreathingTechniques: () => req<any[]>('GET', '/breathing/techniques'),
  startBreathing: (sessionId: string, techniqueId?: string) =>
    req<any>('POST', '/breathing/start', { sessionId, techniqueId }),
  stopBreathing: (sessionId: string) =>
    req<any>('POST', '/breathing/stop', { sessionId }),

  // Mindfulness
  startMindfulness: (sessionId: string, durationMinutes?: number) =>
    req<any>('POST', '/mindfulness/start', { sessionId, durationMinutes }),
  stopMindfulness: (sessionId: string) =>
    req<any>('POST', '/mindfulness/stop', { sessionId }),

  // Reminders
  createReminder: (userId: string, topic: string, scheduledTime: string) =>
    req<any>('POST', '/reminders', { userId, topic, scheduledTime }),
  getReminders: (userId: string) => req<any[]>('GET', `/reminders/${userId}`),
  deleteReminder: (reminderId: string, userId: string) =>
    req<any>('DELETE', `/reminders/${reminderId}`, { userId }),

  // Analytics
  getStreak: (userId: string) => req<any>('GET', `/analytics/${userId}/streak`),
  getMoodTrend: (userId: string, days: 7 | 30 = 7) =>
    req<any>('GET', `/analytics/${userId}/mood?days=${days}`),
  getActivityFrequency: (userId: string, days: 7 | 30 = 7) =>
    req<any>('GET', `/analytics/${userId}/activity?days=${days}`),
  getInsights: (userId: string) => req<any[]>('GET', `/analytics/${userId}/insights`),
  getSummary: (userId: string, days: 7 | 30 = 7) =>
    req<any>('GET', `/analytics/${userId}/summary?days=${days}`),

  // Crisis
  analyzeCrisis: (transcript: string, sessionId: string) =>
    req<any>('POST', '/crisis/analyze', { transcript, sessionId }),
  getCrisisResources: () => req<any[]>('GET', '/crisis/resources'),

  // Community
  createGroup: (userId: string, name: string) =>
    req<any>('POST', '/community/groups', { userId, name }),
  joinGroup: (userId: string, groupCode: string) =>
    req<any>('POST', '/community/groups/join', { userId, groupCode }),
  getFeed: () => req<any[]>('GET', '/community/feed'),
  createChallenge: (groupId: string, activityType: string, durationDays: number) =>
    req<any>('POST', '/community/challenges', { groupId, activityType, durationDays }),

  // Integrations
  getIntegrationStatus: (userId: string) =>
    req<Record<string, string>>('GET', `/integrations/${userId}/status`),

  // Health sync
  syncHealth: (userId: string) => req<any>('POST', `/health-sync/${userId}`),
};
