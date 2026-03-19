// Feature: wellflow-voice-wellness-assistant
// MessagingGateway: delivers notifications and receives inbound commands (Requirements 16.1–16.7)

import { MessagingPlatformId, OutboundMessage, InboundCommand } from '../types';
import { IntegrationManager } from './IntegrationManager';

export interface MessagingPlatformAdapter {
  send(token: string, text: string): Promise<void>;
}

const DEDUP_WINDOW_MS = 60_000;

export class MessagingGateway {
  public onInboundCommand: ((command: InboundCommand) => void) | null = null;

  /** eventId → timestamp of first delivery */
  private sentEvents: Map<string, number> = new Map();

  constructor(
    private readonly integrationManager: IntegrationManager,
    private readonly adapters: Partial<Record<MessagingPlatformId, MessagingPlatformAdapter>>,
  ) {}

  /**
   * Sends a notification to all specified platforms.
   * Deduplicates by eventId within a 60-second window.
   * Requirements: 16.2, 16.3, 16.5, 16.6
   */
  async sendNotification(message: OutboundMessage): Promise<void> {
    // Deduplication (Req 16.6)
    const now = Date.now();
    const lastSent = this.sentEvents.get(message.eventId);
    if (lastSent !== undefined && now - lastSent < DEDUP_WINDOW_MS) {
      return; // duplicate within window — skip
    }
    this.sentEvents.set(message.eventId, now);

    for (const platformId of message.platforms) {
      if (this.integrationManager.getStatus(platformId, message.userId) !== 'CONNECTED') continue;

      try {
        const token = await this.integrationManager.getToken(platformId, message.userId);
        const adapter = this.adapters[platformId];
        if (!adapter) continue;
        await adapter.send(token, message.text);
      } catch (err) {
        // Log failure, set UNAUTHORIZED, continue to remaining platforms (Req 16.5)
        console.error(`[MessagingGateway] Platform ${platformId} error:`, err);
        this.integrationManager.setStatus(platformId, message.userId, 'UNAUTHORIZED');
      }
    }
  }

  /**
   * Returns connected messaging platforms for the user.
   */
  getConnectedPlatforms(userId: string): MessagingPlatformId[] {
    const platforms: MessagingPlatformId[] = ['SLACK', 'WHATSAPP', 'TELEGRAM'];
    return platforms.filter(
      (p) => this.integrationManager.getStatus(p, userId) === 'CONNECTED',
    );
  }

  /**
   * Parses an inbound text command and routes it.
   * For UNKNOWN commands, sends a reply listing supported commands.
   * Requirement 16.4
   */
  receiveCommand(platformId: MessagingPlatformId, userId: string, rawText: string): void {
    const parsedAction = this._parseAction(rawText);
    const command: InboundCommand = { platformId, userId, rawText, parsedAction };
    this.onInboundCommand?.(command);

    // Reply with supported commands list for UNKNOWN (Req 16.4)
    if (parsedAction === 'UNKNOWN') {
      const replyText =
        'Supported commands: "start breathing", "set reminder", "session summary"';
      const replyMessage: OutboundMessage = {
        userId,
        platforms: [platformId],
        text: replyText,
        eventId: `unknown-reply-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      };
      this.sendNotification(replyMessage).catch(() => {});
    }
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  private _parseAction(text: string): InboundCommand['parsedAction'] {
    const lower = text.toLowerCase();
    if (lower.includes('start breathing') || lower.includes('breathing')) return 'START_BREATHING';
    if (lower.includes('remind') || lower.includes('reminder')) return 'SET_REMINDER';
    if (lower.includes('session summary') || lower.includes('summary')) return 'SESSION_SUMMARY';
    return 'UNKNOWN';
  }
}
