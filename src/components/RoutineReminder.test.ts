// Feature: wellflow-voice-wellness-assistant
// Unit tests for RoutineReminder (Requirements 8.1–8.6)

import { RoutineReminder } from './RoutineReminder';

const USER_A = 'user-a';
const USER_B = 'user-b';

function futureDate(offsetMs: number): Date {
  return new Date(Date.now() + offsetMs);
}

function pastDate(offsetMs: number): Date {
  return new Date(Date.now() - offsetMs);
}

describe('RoutineReminder', () => {
  let rr: RoutineReminder;

  beforeEach(() => {
    rr = new RoutineReminder();
  });

  // ----------------------------------------------------------------
  // getConfirmationMessage (Req 8.1)
  // ----------------------------------------------------------------
  describe('getConfirmationMessage', () => {
    it('returns a confirmation string containing the topic', () => {
      const msg = rr.getConfirmationMessage('morning yoga', new Date());
      expect(msg).toContain('morning yoga');
    });

    it('starts with "I\'ll remind you about"', () => {
      const msg = rr.getConfirmationMessage('hydration', new Date());
      expect(msg).toMatch(/^I'll remind you about/);
    });
  });

  // ----------------------------------------------------------------
  // createReminder (Req 8.1, 8.3)
  // ----------------------------------------------------------------
  describe('createReminder', () => {
    it('creates a reminder with the correct fields', async () => {
      const time = futureDate(60_000);
      const reminder = await rr.createReminder('meditation', time, USER_A);

      expect(reminder.userId).toBe(USER_A);
      expect(reminder.topic).toBe('meditation');
      expect(reminder.scheduledTime).toEqual(time);
      expect(reminder.delivered).toBe(false);
      expect(typeof reminder.reminderId).toBe('string');
      expect(reminder.reminderId.length).toBeGreaterThan(0);
    });

    it('allows up to 10 active reminders', async () => {
      for (let i = 0; i < 10; i++) {
        await rr.createReminder(`topic-${i}`, futureDate(i * 1000 + 1000), USER_A);
      }
      const list = await rr.listReminders(USER_A);
      expect(list).toHaveLength(10);
    });

    it('throws when user already has 10 active reminders', async () => {
      for (let i = 0; i < 10; i++) {
        await rr.createReminder(`topic-${i}`, futureDate(i * 1000 + 1000), USER_A);
      }
      await expect(
        rr.createReminder('overflow', futureDate(20_000), USER_A),
      ).rejects.toThrow();
    });

    it('does not count delivered reminders toward the cap', async () => {
      // Create 10 reminders in the past so checkDue marks them delivered
      for (let i = 0; i < 10; i++) {
        await rr.createReminder(`past-${i}`, pastDate((i + 1) * 1000), USER_A);
      }
      await rr.checkDue(USER_A); // marks all as delivered

      // Should now be able to create a new one
      const reminder = await rr.createReminder('new', futureDate(5000), USER_A);
      expect(reminder.delivered).toBe(false);
    });

    it('isolates reminders between users', async () => {
      for (let i = 0; i < 10; i++) {
        await rr.createReminder(`topic-${i}`, futureDate(i * 1000 + 1000), USER_A);
      }
      // USER_B should still be able to create reminders
      const reminder = await rr.createReminder('b-topic', futureDate(5000), USER_B);
      expect(reminder.userId).toBe(USER_B);
    });
  });

  // ----------------------------------------------------------------
  // deleteReminder (Req 8.5)
  // ----------------------------------------------------------------
  describe('deleteReminder', () => {
    it('removes the reminder from the list', async () => {
      const r = await rr.createReminder('yoga', futureDate(5000), USER_A);
      await rr.deleteReminder(r.reminderId, USER_A);
      const list = await rr.listReminders(USER_A);
      expect(list.find((x) => x.reminderId === r.reminderId)).toBeUndefined();
    });

    it('throws when reminder does not exist', async () => {
      await expect(rr.deleteReminder('nonexistent-id', USER_A)).rejects.toThrow();
    });

    it('throws when reminder belongs to a different user', async () => {
      const r = await rr.createReminder('yoga', futureDate(5000), USER_A);
      await expect(rr.deleteReminder(r.reminderId, USER_B)).rejects.toThrow();
    });
  });

  // ----------------------------------------------------------------
  // listReminders (Req 8.4)
  // ----------------------------------------------------------------
  describe('listReminders', () => {
    it('returns reminders sorted chronologically', async () => {
      const t3 = futureDate(30_000);
      const t1 = futureDate(10_000);
      const t2 = futureDate(20_000);

      await rr.createReminder('third', t3, USER_A);
      await rr.createReminder('first', t1, USER_A);
      await rr.createReminder('second', t2, USER_A);

      const list = await rr.listReminders(USER_A);
      expect(list[0].topic).toBe('first');
      expect(list[1].topic).toBe('second');
      expect(list[2].topic).toBe('third');
    });

    it('returns empty array when user has no reminders', async () => {
      const list = await rr.listReminders('unknown-user');
      expect(list).toEqual([]);
    });

    it('includes both delivered and undelivered reminders', async () => {
      await rr.createReminder('past', pastDate(5000), USER_A);
      await rr.checkDue(USER_A); // marks as delivered
      await rr.createReminder('future', futureDate(5000), USER_A);

      const list = await rr.listReminders(USER_A);
      expect(list).toHaveLength(2);
    });
  });

  // ----------------------------------------------------------------
  // checkDue (Req 8.2, 8.6)
  // ----------------------------------------------------------------
  describe('checkDue', () => {
    it('returns overdue undelivered reminders', async () => {
      await rr.createReminder('overdue', pastDate(5000), USER_A);
      const due = await rr.checkDue(USER_A);
      expect(due).toHaveLength(1);
      expect(due[0].topic).toBe('overdue');
    });

    it('marks returned reminders as delivered', async () => {
      const r = await rr.createReminder('overdue', pastDate(5000), USER_A);
      await rr.checkDue(USER_A);

      const list = await rr.listReminders(USER_A);
      const found = list.find((x) => x.reminderId === r.reminderId);
      expect(found?.delivered).toBe(true);
    });

    it('does not return already-delivered reminders', async () => {
      await rr.createReminder('overdue', pastDate(5000), USER_A);
      await rr.checkDue(USER_A); // first call delivers it
      const due2 = await rr.checkDue(USER_A); // second call should return nothing
      expect(due2).toHaveLength(0);
    });

    it('does not return future reminders', async () => {
      await rr.createReminder('future', futureDate(60_000), USER_A);
      const due = await rr.checkDue(USER_A);
      expect(due).toHaveLength(0);
    });

    it('returns due reminders sorted chronologically', async () => {
      const t2 = pastDate(1000);
      const t1 = pastDate(5000);

      await rr.createReminder('later', t2, USER_A);
      await rr.createReminder('earlier', t1, USER_A);

      const due = await rr.checkDue(USER_A);
      expect(due[0].topic).toBe('earlier');
      expect(due[1].topic).toBe('later');
    });

    it('isolates due reminders between users', async () => {
      await rr.createReminder('a-overdue', pastDate(5000), USER_A);
      await rr.createReminder('b-overdue', pastDate(5000), USER_B);

      const dueA = await rr.checkDue(USER_A);
      expect(dueA).toHaveLength(1);
      expect(dueA[0].userId).toBe(USER_A);
    });
  });
});

// ============================================================
// Property-Based Tests (fast-check)
// ============================================================
import * as fc from 'fast-check';

// Feature: wellflow-voice-wellness-assistant, Property 19: Reminder confirmation before save
/**
 * Validates: Requirements 8.1
 *
 * Property 19 verifies that:
 * - For any arbitrary non-empty topic string and scheduledTime (Date),
 *   getConfirmationMessage(topic, scheduledTime) returns a string that contains the topic.
 */
describe('RoutineReminder — Property 19: Reminder confirmation before save', () => {
  it('confirmation message always contains the topic', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.date(),
        (topic, scheduledTime) => {
          const rr = new RoutineReminder();
          const msg = rr.getConfirmationMessage(topic, scheduledTime);
          return msg.includes(topic);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: wellflow-voice-wellness-assistant, Property 20: Reminder chronological ordering
/**
 * Validates: Requirements 8.4
 *
 * Property 20 verifies that:
 * - For any arbitrary list of reminders with random scheduledTimes,
 *   listReminders(userId) returns them sorted in ascending order by scheduledTime.
 */
describe('RoutineReminder — Property 20: Reminder chronological ordering', () => {
  it('listReminders returns reminders sorted ascending by scheduledTime', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            topic: fc.string({ minLength: 1 }),
            scheduledTime: fc.date(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (entries) => {
          const rr = new RoutineReminder();
          const userId = 'pbt-user-ordering';
          for (const { topic, scheduledTime } of entries) {
            await rr.createReminder(topic, scheduledTime, userId);
          }
          const list = await rr.listReminders(userId);
          for (let i = 1; i < list.length; i++) {
            if (list[i].scheduledTime.getTime() < list[i - 1].scheduledTime.getTime()) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: wellflow-voice-wellness-assistant, Property 21: Reminder deletion round-trip
/**
 * Validates: Requirements 8.5
 *
 * Property 21 verifies that:
 * - For any arbitrary reminder, after createReminder followed by deleteReminder,
 *   listReminders does not contain the deleted reminder.
 */
describe('RoutineReminder — Property 21: Reminder deletion round-trip', () => {
  it('deleted reminder is absent from listReminders', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.date(),
        async (topic, scheduledTime) => {
          const rr = new RoutineReminder();
          const userId = 'pbt-user-deletion';
          const reminder = await rr.createReminder(topic, scheduledTime, userId);
          await rr.deleteReminder(reminder.reminderId, userId);
          const list = await rr.listReminders(userId);
          return list.every((r) => r.reminderId !== reminder.reminderId);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: wellflow-voice-wellness-assistant, Property 22: Reminder capacity
/**
 * Validates: Requirements 8.3
 *
 * Property 22 verifies that:
 * - For any number of reminders n > 10, attempting to create more than 10 active
 *   reminders throws an error.
 */
describe('RoutineReminder — Property 22: Reminder capacity', () => {
  it('creating more than 10 active reminders throws an error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 11, max: 20 }),
        async (n) => {
          const rr = new RoutineReminder();
          const userId = 'pbt-user-capacity';
          const baseTime = new Date(Date.now() + 60_000);
          for (let i = 0; i < 10; i++) {
            await rr.createReminder(
              `topic-${i}`,
              new Date(baseTime.getTime() + i * 1000),
              userId
            );
          }
          let threw = false;
          for (let i = 10; i < n; i++) {
            try {
              await rr.createReminder(
                `overflow-${i}`,
                new Date(baseTime.getTime() + i * 1000),
                userId
              );
              threw = false;
              break;
            } catch {
              threw = true;
            }
          }
          return threw;
        }
      ),
      { numRuns: 100 }
    );
  });
});
