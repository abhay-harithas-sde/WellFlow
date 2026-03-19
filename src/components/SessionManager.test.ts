// Feature: wellflow-voice-wellness-assistant
// Unit tests for SessionManager (Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 20.3)

import { SessionManager } from './SessionManager';
import { CommunityManager } from './CommunityManager';
import { ProfileStore } from '../store/ProfileStore';
import { ActivityRecord } from '../types';

function makeStore() {
  return new ProfileStore();
}

function makeManager(store?: ProfileStore) {
  return new SessionManager(store ?? makeStore());
}

describe('SessionManager', () => {
  describe('createSession', () => {
    it('returns a session with the correct userId', () => {
      const mgr = makeManager();
      const session = mgr.createSession('user-1');
      expect(session.userId).toBe('user-1');
    });

    it('generates a unique sessionId', () => {
      const mgr = makeManager();
      const s1 = mgr.createSession('user-1');
      const s2 = mgr.createSession('user-1');
      expect(s1.sessionId).not.toBe(s2.sessionId);
    });

    it('sets startTime and lastActivityTime to approximately now', () => {
      const before = Date.now();
      const mgr = makeManager();
      const session = mgr.createSession('user-1');
      const after = Date.now();
      expect(session.startTime.getTime()).toBeGreaterThanOrEqual(before);
      expect(session.startTime.getTime()).toBeLessThanOrEqual(after);
      expect(session.lastActivityTime.getTime()).toBeGreaterThanOrEqual(before);
    });

    it('initialises activitiesCompleted, stressRatings, and reminders as empty arrays', () => {
      const mgr = makeManager();
      const session = mgr.createSession('user-1');
      expect(session.activitiesCompleted).toEqual([]);
      expect(session.stressRatings).toEqual([]);
      expect(session.reminders).toEqual([]);
    });

    it('defaults language to "en"', () => {
      const mgr = makeManager();
      const session = mgr.createSession('user-1');
      expect(session.language).toBe('en');
    });
  });

  describe('getSession', () => {
    it('returns the session after creation', () => {
      const mgr = makeManager();
      const session = mgr.createSession('user-1');
      expect(mgr.getSession(session.sessionId)).toEqual(session);
    });

    it('returns null for an unknown sessionId', () => {
      const mgr = makeManager();
      expect(mgr.getSession('nonexistent')).toBeNull();
    });
  });

  describe('saveSession', () => {
    it('persists a SessionSummary to the profile store', async () => {
      const store = makeStore();
      const mgr = new SessionManager(store);
      const session = mgr.createSession('user-1');

      await mgr.saveSession(session);

      const history = store.getSessionHistory('user-1');
      expect(history).toHaveLength(1);
      expect(history[0].sessionId).toBe(session.sessionId);
    });

    it('computes averageStressRating correctly', async () => {
      const store = makeStore();
      const mgr = new SessionManager(store);
      const session = mgr.createSession('user-1');
      session.stressRatings = [2, 4, 3];

      await mgr.saveSession(session);

      const history = store.getSessionHistory('user-1');
      expect(history[0].averageStressRating).toBeCloseTo(3);
    });

    it('sets averageStressRating to null when no ratings exist', async () => {
      const store = makeStore();
      const mgr = new SessionManager(store);
      const session = mgr.createSession('user-1');

      await mgr.saveSession(session);

      const history = store.getSessionHistory('user-1');
      expect(history[0].averageStressRating).toBeNull();
    });

    it('includes activitiesCompleted in the summary', async () => {
      const store = makeStore();
      const mgr = new SessionManager(store);
      const session = mgr.createSession('user-1');
      const activity: ActivityRecord = {
        activityType: 'BREATHING',
        startTime: new Date(),
        completedFully: true,
        metadata: {},
      };
      session.activitiesCompleted = [activity];

      await mgr.saveSession(session);

      const history = store.getSessionHistory('user-1');
      expect(history[0].activitiesCompleted).toHaveLength(1);
      expect(history[0].activitiesCompleted[0].activityType).toBe('BREATHING');
    });

    it('removes the session from the active-session index after save', async () => {
      const mgr = makeManager();
      const session = mgr.createSession('user-1');
      await mgr.saveSession(session);
      const restored = await mgr.restoreSession('user-1');
      expect(restored).toBeNull();
    });
  });

  describe('recordActivity', () => {
    it('adds the activity to session.activitiesCompleted', async () => {
      const mgr = makeManager();
      const session = mgr.createSession('user-1');
      const activity: ActivityRecord = {
        activityType: 'BREATHING',
        startTime: new Date(),
        completedFully: true,
        metadata: {},
      };

      await mgr.recordActivity(session, activity);

      expect(session.activitiesCompleted).toHaveLength(1);
      expect(session.activitiesCompleted[0].activityType).toBe('BREATHING');
    });

    it('updates session.lastActivityTime', async () => {
      const mgr = makeManager();
      const session = mgr.createSession('user-1');
      const before = Date.now();
      const activity: ActivityRecord = {
        activityType: 'MINDFULNESS',
        startTime: new Date(),
        completedFully: true,
        metadata: {},
      };

      await mgr.recordActivity(session, activity);

      expect(session.lastActivityTime.getTime()).toBeGreaterThanOrEqual(before);
    });

    it('calls CommunityManager.publishActivityEvent with the correct userId and activityType', async () => {
      const store = makeStore();
      const communityManager = new CommunityManager();
      const publishSpy = jest.spyOn(communityManager, 'publishActivityEvent').mockResolvedValue(undefined);

      const mgr = new SessionManager(store, undefined, undefined, undefined, communityManager);
      const session = mgr.createSession('user-1');
      const activity: ActivityRecord = {
        activityType: 'BREATHING',
        startTime: new Date(),
        completedFully: true,
        metadata: {},
      };

      await mgr.recordActivity(session, activity);

      expect(publishSpy).toHaveBeenCalledTimes(1);
      expect(publishSpy).toHaveBeenCalledWith('user-1', 'BREATHING');
    });

    it('calls publishActivityEvent for each activity type', async () => {
      const store = makeStore();
      const communityManager = new CommunityManager();
      const publishSpy = jest.spyOn(communityManager, 'publishActivityEvent').mockResolvedValue(undefined);

      const mgr = new SessionManager(store, undefined, undefined, undefined, communityManager);
      const session = mgr.createSession('user-1');

      const activityTypes: ActivityRecord['activityType'][] = ['BREATHING', 'MINDFULNESS', 'STRESS_RELIEF', 'REMINDER'];
      for (const activityType of activityTypes) {
        await mgr.recordActivity(session, { activityType, startTime: new Date(), completedFully: true, metadata: {} });
      }

      expect(publishSpy).toHaveBeenCalledTimes(4);
      expect(publishSpy).toHaveBeenCalledWith('user-1', 'BREATHING');
      expect(publishSpy).toHaveBeenCalledWith('user-1', 'MINDFULNESS');
      expect(publishSpy).toHaveBeenCalledWith('user-1', 'STRESS_RELIEF');
      expect(publishSpy).toHaveBeenCalledWith('user-1', 'REMINDER');
    });

    it('does not call publishActivityEvent when no CommunityManager is injected', async () => {
      const mgr = makeManager(); // no communityManager
      const session = mgr.createSession('user-1');
      const activity: ActivityRecord = {
        activityType: 'BREATHING',
        startTime: new Date(),
        completedFully: true,
        metadata: {},
      };

      // Should not throw
      await expect(mgr.recordActivity(session, activity)).resolves.toBeUndefined();
      expect(session.activitiesCompleted).toHaveLength(1);
    });
  });

  describe('restoreSession', () => {
    it('returns the active session before it is saved', async () => {
      const mgr = makeManager();
      const session = mgr.createSession('user-1');
      const restored = await mgr.restoreSession('user-1');
      expect(restored).not.toBeNull();
      expect(restored!.sessionId).toBe(session.sessionId);
    });

    it('returns null when no session has been created for the user', async () => {
      const mgr = makeManager();
      const restored = await mgr.restoreSession('unknown-user');
      expect(restored).toBeNull();
    });

    it('returns null after the session has been saved (crash recovery complete)', async () => {
      const mgr = makeManager();
      const session = mgr.createSession('user-1');
      await mgr.saveSession(session);
      expect(await mgr.restoreSession('user-1')).toBeNull();
    });

    it('returns the most recent session when multiple sessions were created', async () => {
      const mgr = makeManager();
      const s1 = mgr.createSession('user-1');
      await mgr.saveSession(s1);
      const s2 = mgr.createSession('user-1');
      const restored = await mgr.restoreSession('user-1');
      expect(restored!.sessionId).toBe(s2.sessionId);
    });
  });

  describe('60-minute duration notification', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('fires the callback after 60 minutes', () => {
      const mgr = makeManager();
      const cb = jest.fn();
      mgr.onDurationNotification = cb;

      const session = mgr.createSession('user-1');
      expect(cb).not.toHaveBeenCalled();

      jest.advanceTimersByTime(60 * 60 * 1000);
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(session.sessionId, 'user-1');
    });

    it('does not fire before 60 minutes', () => {
      const mgr = makeManager();
      const cb = jest.fn();
      mgr.onDurationNotification = cb;

      mgr.createSession('user-1');
      jest.advanceTimersByTime(59 * 60 * 1000);
      expect(cb).not.toHaveBeenCalled();
    });

    it('does not fire after the session is saved', async () => {
      const mgr = makeManager();
      const cb = jest.fn();
      mgr.onDurationNotification = cb;

      const session = mgr.createSession('user-1');
      await mgr.saveSession(session);

      jest.advanceTimersByTime(60 * 60 * 1000);
      expect(cb).not.toHaveBeenCalled();
    });
  });
});

// Feature: wellflow-voice-wellness-assistant, Property 23: Session metadata persistence round-trip
/**
 * Validates: Requirements 9.2, 9.3
 *
 * Property 23 verifies that for any arbitrary session with random activities and stress ratings,
 * after calling saveSession(), the ProfileStore contains a SessionSummary with:
 *   - The same sessionId
 *   - The same number of activitiesCompleted
 *   - The correct averageStressRating (mean of ratings, or null if empty)
 *   - durationMinutes >= 0
 */
import * as fc from 'fast-check';

describe('SessionManager — Property 23: Session metadata persistence round-trip', () => {
  const activityTypeArb = fc.oneof(
    fc.constant('BREATHING' as const),
    fc.constant('MINDFULNESS' as const),
    fc.constant('STRESS_RELIEF' as const),
    fc.constant('REMINDER' as const),
  );

  const activityRecordArb = fc.record({
    activityType: activityTypeArb,
    startTime: fc.date(),
    completedFully: fc.boolean(),
    metadata: fc.constant({} as Record<string, unknown>),
  });

  it('persisted SessionSummary matches session data for arbitrary activities and stress ratings', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 0–5 activity records
        fc.array(activityRecordArb, { minLength: 0, maxLength: 5 }),
        // 0–5 stress ratings between 1 and 5
        fc.array(fc.float({ min: 1, max: 5, noNaN: true }), { minLength: 0, maxLength: 5 }),
        async (activities, stressRatings) => {
          const store = new ProfileStore();
          const mgr = new SessionManager(store);

          const session = mgr.createSession('user-pbt');
          session.activitiesCompleted = activities;
          session.stressRatings = stressRatings;

          await mgr.saveSession(session);

          const history = store.getSessionHistory('user-pbt');

          // Exactly one summary should be stored
          if (history.length !== 1) return false;

          const summary = history[0];

          // sessionId must match
          if (summary.sessionId !== session.sessionId) return false;

          // activitiesCompleted count must match
          if (summary.activitiesCompleted.length !== activities.length) return false;

          // durationMinutes must be >= 0
          if (summary.durationMinutes < 0) return false;

          // averageStressRating: null when no ratings, otherwise mean of ratings
          if (stressRatings.length === 0) {
            if (summary.averageStressRating !== null) return false;
          } else {
            const expectedAvg =
              stressRatings.reduce((sum, r) => sum + r, 0) / stressRatings.length;
            if (summary.averageStressRating === null) return false;
            if (Math.abs(summary.averageStressRating - expectedAvg) > 1e-9) return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: wellflow-voice-wellness-assistant, Property 24: Personalized greeting
/**
 * Validates: Requirements 9.1
 *
 * Property 24 verifies that:
 * - For any arbitrary non-empty user name, after saving a profile with that name,
 *   getGreeting(userId) returns a string containing the user's name.
 * - For a userId with no profile, getGreeting(userId) returns a generic greeting
 *   that does NOT contain a specific name.
 */
describe('SessionManager — Property 24: Personalized greeting', () => {
  it('greeting contains the user name when a profile exists', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (name) => {
          const store = new ProfileStore();
          const mgr = new SessionManager(store);
          const userId = 'user-greeting-test';

          store.saveProfile({
            userId,
            name,
            preferredLanguage: 'en',
            ttsSpeed: 'normal',
            sessionHistory: [],
            voiceProfile: { activityAssignments: {}, fallbackVoiceId: null },
          });

          const greeting = mgr.getGreeting(userId);
          return greeting.includes(name);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('greeting is generic and contains no specific name when no profile exists', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (userId) => {
          const store = new ProfileStore();
          const mgr = new SessionManager(store);

          const greeting = mgr.getGreeting(userId);
          return greeting === 'Hello! Welcome to WellFlow.';
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: wellflow-voice-wellness-assistant, Property 11: Session state round-trip after inactivity close
/**
 * Validates: Requirements 4.5, 9.4
 *
 * Property 11 verifies that for any arbitrary session state (with random activities,
 * stress ratings, and language), when the session is NOT saved (simulating an inactivity
 * close or crash), restoreSession(userId) returns the session with the same sessionId,
 * activitiesCompleted, stressRatings, and language as the original.
 *
 * This tests that session state is preserved in memory even when not explicitly saved
 * (crash recovery scenario).
 */
describe('SessionManager — Property 11: Session state round-trip after inactivity close', () => {
  const activityTypeArb = fc.oneof(
    fc.constant('BREATHING' as const),
    fc.constant('MINDFULNESS' as const),
    fc.constant('STRESS_RELIEF' as const),
    fc.constant('REMINDER' as const),
  );

  const activityRecordArb = fc.record({
    activityType: activityTypeArb,
    startTime: fc.date(),
    completedFully: fc.boolean(),
    metadata: fc.constant({} as Record<string, unknown>),
  });

  const languageArb = fc.oneof(
    fc.constant('en'),
    fc.constant('es'),
    fc.constant('fr'),
    fc.constant('de'),
    fc.constant('pt'),
  );

  it('restoreSession returns the original session state when session was not saved (inactivity close / crash)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(activityRecordArb, { minLength: 0, maxLength: 5 }),
        fc.array(fc.float({ min: 1, max: 5, noNaN: true }), { minLength: 0, maxLength: 5 }),
        languageArb,
        async (activities, stressRatings, language) => {
          const store = new ProfileStore();
          const mgr = new SessionManager(store);

          // Create session and mutate state (simulating in-progress session)
          const session = mgr.createSession('user-p11');
          session.activitiesCompleted = activities;
          session.stressRatings = stressRatings;
          session.language = language;

          // Do NOT call saveSession — simulates inactivity close or crash

          const restored = await mgr.restoreSession('user-p11');

          // Session must be recoverable
          if (restored === null) return false;

          // sessionId must match
          if (restored.sessionId !== session.sessionId) return false;

          // activitiesCompleted must match in length and content
          if (restored.activitiesCompleted.length !== activities.length) return false;
          for (let i = 0; i < activities.length; i++) {
            if (restored.activitiesCompleted[i].activityType !== activities[i].activityType) return false;
            if (restored.activitiesCompleted[i].completedFully !== activities[i].completedFully) return false;
          }

          // stressRatings must match
          if (restored.stressRatings.length !== stressRatings.length) return false;
          for (let i = 0; i < stressRatings.length; i++) {
            if (restored.stressRatings[i] !== stressRatings[i]) return false;
          }

          // language must match
          if (restored.language !== language) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
