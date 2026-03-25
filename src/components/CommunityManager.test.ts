// Feature: wellflow-voice-wellness-assistant
// Tests for CommunityManager — Requirements 20.1–20.10

import { CommunityManager, CommunityManagerCallbacks } from './CommunityManager';
import { SharedChallenge, CommunityFeedEvent } from '../types';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCallbacks(): { callbacks: CommunityManagerCallbacks; joinedEvents: string[]; finalizedChallenges: Array<{ challenge: SharedChallenge; rate: number }>; namePrompts: string[] } {
  const joinedEvents: string[] = [];
  const finalizedChallenges: Array<{ challenge: SharedChallenge; rate: number }> = [];
  const namePrompts: string[] = [];
  const callbacks: CommunityManagerCallbacks = {
    onMemberJoined: (_gid, uid) => joinedEvents.push(uid),
    onChallengeFinalized: (c, r) => finalizedChallenges.push({ challenge: c, rate: r }),
    onNamePromptRequired: (uid) => namePrompts.push(uid),
  };
  return { callbacks, joinedEvents, finalizedChallenges, namePrompts };
}

// ---------------------------------------------------------------------------
// Property 62: Group membership cap (Task 46.2)
// Feature: wellflow-voice-wellness-assistant, Property 62: Group membership cap
// Validates: Requirements 20.9
// ---------------------------------------------------------------------------

describe('CommunityManager — Property 62: Group membership cap', () => {
  it('joining a group at capacity (20 members) throws an error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const { callbacks } = makeCallbacks();
          const mgr = new CommunityManager(callbacks);

          // Create a group and fill it to capacity
          const group = await mgr.createGroup('creator', 'Full Group');
          for (let i = 1; i < 20; i++) {
            await mgr.setAnonymizedName(`user-${i}`, `User ${i}`);
            // Directly add members by joining with group code
            await mgr.joinGroup(`user-${i}`, group.groupCode);
          }

          // 21st member should be rejected
          await expect(mgr.joinGroup('user-21', group.groupCode)).rejects.toThrow();
        },
      ),
      { numRuns: 10 }, // fewer runs since this is expensive
    );
  });
});

// ---------------------------------------------------------------------------
// Property 63: User group cap (Task 46.3)
// Feature: wellflow-voice-wellness-assistant, Property 63: User group cap
// Validates: Requirements 20.9
// ---------------------------------------------------------------------------

describe('CommunityManager — Property 63: User group cap', () => {
  it('user cannot be in more than 5 groups', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const mgr = new CommunityManager();

          // Create 5 groups for user-1
          for (let i = 0; i < 5; i++) {
            await mgr.createGroup('user-1', `Group ${i}`);
          }

          // 6th group should be rejected
          await expect(mgr.createGroup('user-1', 'Group 6')).rejects.toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 64: CommunityFeed anonymization (Task 46.4)
// Feature: wellflow-voice-wellness-assistant, Property 64: CommunityFeed anonymization
// Validates: Requirements 20.3, 20.7
// ---------------------------------------------------------------------------

describe('CommunityManager — Property 64: CommunityFeed anonymization', () => {
  it('feed events use anonymized name, not userId', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        async (userId, anonymizedName) => {
          const mgr = new CommunityManager();
          await mgr.createGroup(userId, 'Test Group');
          await mgr.setAnonymizedName(userId, anonymizedName);
          await mgr.publishActivityEvent(userId, 'BREATHING');

          const feed = await mgr.getFeed(userId, 10);
          expect(feed.length).toBeGreaterThan(0);
          expect(feed[0].anonymizedName).toBe(anonymizedName);
          expect(feed[0].anonymizedName).not.toBe(userId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('does not publish event when user has no anonymized name', async () => {
    const { callbacks, namePrompts } = makeCallbacks();
    const mgr = new CommunityManager(callbacks);
    await mgr.createGroup('user-1', 'Group');

    await mgr.publishActivityEvent('user-1', 'BREATHING');

    const feed = await mgr.getFeed('user-1', 10);
    expect(feed).toHaveLength(0);
    expect(namePrompts).toContain('user-1');
  });
});

// ---------------------------------------------------------------------------
// Property 65: Feed ordering (Task 46.5)
// Feature: wellflow-voice-wellness-assistant, Property 65: Feed ordering
// Validates: Requirements 20.4
// ---------------------------------------------------------------------------

describe('CommunityManager — Property 65: Feed ordering', () => {
  it('getFeed returns events in descending chronological order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }),
        async (eventCount) => {
          const mgr = new CommunityManager();
          await mgr.createGroup('user-1', 'Group');
          await mgr.setAnonymizedName('user-1', 'Anon');

          for (let i = 0; i < eventCount; i++) {
            await mgr.publishActivityEvent('user-1', 'BREATHING');
          }

          const feed = await mgr.getFeed('user-1', 100);
          for (let i = 1; i < feed.length; i++) {
            expect(feed[i].occurredAt.getTime()).toBeLessThanOrEqual(feed[i - 1].occurredAt.getTime());
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 66: Challenge completion rate correctness (Task 47.3)
// Feature: wellflow-voice-wellness-assistant, Property 66: Challenge completion rate correctness
// Validates: Requirements 20.6
// ---------------------------------------------------------------------------

describe('CommunityManager — Property 66: Challenge completion rate correctness', () => {
  it('finalizeChallenge computes correct completion rate', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 0, max: 5 }),
        async (totalOptedIn, completedCount) => {
          const actualCompleted = Math.min(completedCount, totalOptedIn);
          const { callbacks, finalizedChallenges } = makeCallbacks();
          const mgr = new CommunityManager(callbacks);

          const group = await mgr.createGroup('creator', 'Challenge Group');
          const challenge = await mgr.createChallenge('creator', group.groupId, 'BREATHING', 7);

          for (let i = 0; i < totalOptedIn; i++) {
            await mgr.optInToChallenge(`user-${i}`, challenge.challengeId);
          }
          for (let i = 0; i < actualCompleted; i++) {
            await mgr.setAnonymizedName(`user-${i}`, `Anon-${i}`);
            await mgr.recordChallengeCompletion(`user-${i}`, challenge.challengeId);
          }

          await mgr.finalizeChallenge(challenge.challengeId);

          const result = finalizedChallenges[0];
          const expectedRate = totalOptedIn > 0 ? actualCompleted / totalOptedIn : 0;
          expect(result.rate).toBeCloseTo(expectedRate, 5);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 67: Anonymized name required before publish (Task 47.4)
// Feature: wellflow-voice-wellness-assistant, Property 67: Anonymized name required before publish
// Validates: Requirements 20.10
// ---------------------------------------------------------------------------

describe('CommunityManager — Property 67: Anonymized name required before publish', () => {
  // Feature: wellflow-voice-wellness-assistant, Property 67: Anonymized name required before publish
  it('publishActivityEvent does NOT produce a feed event and triggers name prompt when no anonymized name is set', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        fc.constantFrom<CommunityFeedEvent['activityType']>('BREATHING', 'MINDFULNESS', 'STRESS_RELIEF', 'REMINDER'),
        async (userId, activityType) => {
          const { callbacks, namePrompts } = makeCallbacks();
          const mgr = new CommunityManager(callbacks);
          await mgr.createGroup(userId, 'Group');

          await mgr.publishActivityEvent(userId, activityType);

          // No feed event must be produced
          const feed = await mgr.getFeed(userId, 100);
          expect(feed).toHaveLength(0);

          // Name prompt must be triggered
          expect(namePrompts).toContain(userId);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: wellflow-voice-wellness-assistant, Property 67: Anonymized name required before publish
  it('publishActivityEvent produces a CommunityFeedEvent with the anonymized name when one is set', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        fc.constantFrom<CommunityFeedEvent['activityType']>('BREATHING', 'MINDFULNESS', 'STRESS_RELIEF', 'REMINDER'),
        async (userId, anonymizedName, activityType) => {
          const { callbacks, namePrompts } = makeCallbacks();
          const mgr = new CommunityManager(callbacks);
          await mgr.createGroup(userId, 'Group');
          await mgr.setAnonymizedName(userId, anonymizedName);

          await mgr.publishActivityEvent(userId, activityType);

          // A feed event must be produced
          const feed = await mgr.getFeed(userId, 100);
          expect(feed).toHaveLength(1);
          expect(feed[0].anonymizedName).toBe(anonymizedName);
          expect(feed[0].activityType).toBe(activityType);

          // No name prompt should be triggered
          expect(namePrompts).not.toContain(userId);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('CommunityManager — unit tests', () => {
  it('createGroup assigns a unique group code', async () => {
    const mgr = new CommunityManager();
    const g1 = await mgr.createGroup('user-1', 'Group 1');
    const g2 = await mgr.createGroup('user-1', 'Group 2');
    expect(g1.groupCode).not.toBe(g2.groupCode);
  });

  it('leaveGroup removes user from group', async () => {
    const mgr = new CommunityManager();
    const group = await mgr.createGroup('user-1', 'Group');
    await mgr.joinGroup('user-2', group.groupCode);
    await mgr.leaveGroup('user-2', group.groupId);

    const updatedGroup = (mgr as unknown as { groups: Map<string, { memberIds: string[] }> }).groups.get(group.groupId);
    expect(updatedGroup?.memberIds).not.toContain('user-2');
  });

  it('getAnonymizedName returns null when not set', () => {
    const mgr = new CommunityManager();
    expect(mgr.getAnonymizedName('user-1')).toBeNull();
  });

  it('setAnonymizedName stores the name', async () => {
    const mgr = new CommunityManager();
    await mgr.setAnonymizedName('user-1', 'WellnessWarrior');
    expect(mgr.getAnonymizedName('user-1')).toBe('WellnessWarrior');
  });
});
