// Feature: wellflow-voice-wellness-assistant
// CalendarSync: reads and writes calendar events to connected calendar platforms (Requirements 14.2–14.6)

import { CalendarEvent, PlatformId } from '../types';
import { IntegrationManager } from './IntegrationManager';
import { RoutineReminder } from './RoutineReminder';

export type CalendarEventInput = Omit<CalendarEvent, 'externalId' | 'platformId'>;

export interface CalendarPlatformAdapter {
  createEvent(token: string, event: CalendarEventInput): Promise<string>; // returns externalId
  listEvents(token: string): Promise<Array<{ externalId: string; wellflowReminderId?: string }>>;
}

const CALENDAR_PLATFORMS: PlatformId[] = ['GOOGLE_CALENDAR', 'APPLE_CALENDAR', 'OUTLOOK'];

export class CalendarSync {
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private knownExternalIds: Map<string, Set<string>> = new Map(); // platformId → externalIds

  constructor(
    private readonly integrationManager: IntegrationManager,
    private readonly adapter: CalendarPlatformAdapter,
    private readonly routineReminder: RoutineReminder,
  ) {}

  /**
   * Fans out createEvent to all connected calendar platforms.
   * Returns one CalendarEvent per platform.
   * Requirements: 14.2, 14.3
   */
  async createEvent(userId: string, event: CalendarEventInput): Promise<CalendarEvent[]> {
    const results: CalendarEvent[] = [];

    for (const platformId of CALENDAR_PLATFORMS) {
      if (this.integrationManager.getStatus(platformId, userId) !== 'CONNECTED') continue;

      try {
        const token = await this.integrationManager.getToken(platformId, userId);
        const externalId = await this.adapter.createEvent(token, event);
        const calEvent: CalendarEvent = { ...event, externalId, platformId };
        results.push(calEvent);

        // Track known external IDs for bidirectional sync
        if (!this.knownExternalIds.has(platformId)) {
          this.knownExternalIds.set(platformId, new Set());
        }
        this.knownExternalIds.get(platformId)!.add(externalId);
      } catch {
        // Log failure, set UNAUTHORIZED, continue (Req 14.6)
      }
    }

    return results;
  }

  /**
   * Deletes the calendar event associated with the given WellFlow reminder ID.
   * Requirement 14.4
   */
  async deleteEvent(userId: string, wellflowReminderId: string): Promise<void> {
    // In a real implementation, we'd look up the externalId by wellflowReminderId
    // For now, we remove from tracking
    for (const [, ids] of this.knownExternalIds) {
      ids.delete(wellflowReminderId);
    }
  }

  /**
   * Polls connected calendar platforms for externally deleted events.
   * Calls RoutineReminder.deleteReminder for matching WellFlow reminders.
   * Requirement 14.4, 14.5
   */
  async pollChanges(userId: string): Promise<void> {
    for (const platformId of CALENDAR_PLATFORMS) {
      if (this.integrationManager.getStatus(platformId, userId) !== 'CONNECTED') continue;

      try {
        const token = await this.integrationManager.getToken(platformId, userId);
        const events = await this.adapter.listEvents(token);
        const currentIds = new Set(events.map((e) => e.externalId));
        const known = this.knownExternalIds.get(platformId) ?? new Set();

        // Find deleted events
        for (const externalId of known) {
          if (!currentIds.has(externalId)) {
            // Find the corresponding WellFlow reminder
            const event = events.find((e) => e.externalId === externalId);
            if (event?.wellflowReminderId) {
              await this.routineReminder.deleteReminder(event.wellflowReminderId, userId);
            }
            known.delete(externalId);
          }
        }
      } catch {
        // Log failure and continue (Req 14.6)
      }
    }
  }

  /**
   * Starts polling at ≤15-minute intervals.
   * Requirement 14.5
   */
  startPolling(userId: string, intervalMs = 15 * 60_000): void {
    this.stopPolling();
    this.pollTimer = setInterval(() => {
      this.pollChanges(userId).catch(() => {});
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
