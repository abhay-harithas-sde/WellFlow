// Feature: wellflow-voice-wellness-assistant
// RoutineReminder: manages scheduled wellness reminders (Requirements 8.1–8.6)

import { Reminder, MessagingPlatformId, OutboundMessage } from '../types';

const MAX_ACTIVE_REMINDERS = 10;

/** Minimal interface to avoid circular dependency with CalendarSync */
export interface CalendarSyncInterface {
  createEvent(userId: string, event: {
    title: string; startTime: Date; endTime: Date; description: string; wellflowReminderId?: string;
  }): Promise<unknown>;
}

/** Minimal interface to avoid circular dependency with MessagingGateway */
export interface MessagingGatewayInterface {
  sendNotification(message: OutboundMessage): Promise<void>;
  getConnectedPlatforms(userId: string): MessagingPlatformId[];
}

export class RoutineReminder {
  /** In-memory store of all reminders keyed by reminderId */
  private reminders: Map<string, Reminder> = new Map();

  constructor(
    private readonly calendarSync?: CalendarSyncInterface,
    private readonly messagingGateway?: MessagingGatewayInterface,
  ) {}

  /**
   * Returns a human-readable confirmation message for the given topic and time.
   * Requirement 8.1: confirm topic and scheduled time back to the user before saving.
   */
  getConfirmationMessage(topic: string, scheduledTime: Date): string {
    const timeStr = scheduledTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `I'll remind you about '${topic}' at ${timeStr}.`;
  }

  /**
   * Creates a new reminder for the user.
   * Throws if the user already has 10 active (non-delivered) reminders.
   * Requirement 8.1: capture topic and time, confirm before saving.
   * Requirement 8.3: support up to 10 active reminders per user.
   */
  async createReminder(
    topic: string,
    scheduledTime: Date,
    userId: string,
  ): Promise<Reminder> {
    const activeCount = this._getActiveReminders(userId).length;
    if (activeCount >= MAX_ACTIVE_REMINDERS) {
      throw new Error(
        `User ${userId} already has ${MAX_ACTIVE_REMINDERS} active reminders. Delete one before adding more.`,
      );
    }

    const reminderId = `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const reminder: Reminder = {
      reminderId,
      userId,
      topic,
      scheduledTime,
      delivered: false,
    };

    this.reminders.set(reminderId, reminder);

    // Wire: create calendar event after reminder is saved (Req 14.2)
    if (this.calendarSync) {
      this.calendarSync.createEvent(userId, {
        title: `Reminder: ${topic}`,
        startTime: scheduledTime,
        endTime: new Date(scheduledTime.getTime() + 15 * 60_000),
        description: topic,
        wellflowReminderId: reminderId,
      }).catch(() => {}); // calendar failure must not block reminder creation
    }

    return reminder;
  }

  /**
   * Deletes a reminder by ID for the given user.
   * Throws if the reminder is not found or does not belong to the user.
   * Requirement 8.5: confirm deletion and remove from active list.
   */
  async deleteReminder(reminderId: string, userId: string): Promise<void> {
    const reminder = this.reminders.get(reminderId);
    if (!reminder || reminder.userId !== userId) {
      throw new Error(`Reminder ${reminderId} not found for user ${userId}.`);
    }
    this.reminders.delete(reminderId);
  }

  /**
   * Returns all reminders for the user sorted chronologically (ascending scheduledTime).
   * Requirement 8.4: read aloud all active reminders in chronological order.
   */
  async listReminders(userId: string): Promise<Reminder[]> {
    return [...this.reminders.values()]
      .filter((r) => r.userId === userId)
      .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
  }

  /**
   * Returns all overdue, undelivered reminders for the user and marks them as delivered.
   * Handles reminders that fired while the app was inactive (queued delivery on next open).
   * When app is inactive, delivers via MessagingGateway if connected (Req 16.2).
   * Requirement 8.2: deliver reminder as voice notification when scheduled time is reached.
   * Requirement 8.6: queue reminders when app is inactive; deliver on next open.
   */
  async checkDue(userId: string): Promise<Reminder[]> {
    const now = new Date();
    const due: Reminder[] = [];

    for (const reminder of this.reminders.values()) {
      if (
        reminder.userId === userId &&
        !reminder.delivered &&
        reminder.scheduledTime <= now
      ) {
        reminder.delivered = true;
        due.push(reminder);
      }
    }

    // Return in chronological order
    const sorted = due.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

    // Wire: deliver via MessagingGateway when app is inactive (Req 16.2)
    if (this.messagingGateway && sorted.length > 0) {
      const connectedPlatforms = this.messagingGateway.getConnectedPlatforms(userId);
      if (connectedPlatforms.length > 0) {
        for (const reminder of sorted) {
          const message: OutboundMessage = {
            userId,
            platforms: connectedPlatforms,
            text: `WellFlow Reminder: ${reminder.topic}`,
            eventId: `reminder-${reminder.reminderId}`,
          };
          this.messagingGateway.sendNotification(message).catch(() => {});
        }
      }
    }

    return sorted;
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  private _getActiveReminders(userId: string): Reminder[] {
    return [...this.reminders.values()].filter(
      (r) => r.userId === userId && !r.delivered,
    );
  }
}
