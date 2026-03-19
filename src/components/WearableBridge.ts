// Feature: wellflow-voice-wellness-assistant
// WearableBridge: streams real-time biometric readings from wearable devices (Requirements 15.1–15.6)

import { WearableReading, PlatformId } from '../types';
import { IntegrationManager } from './IntegrationManager';

export type WearableStreamAdapter = (
  platformId: PlatformId,
  token: string,
  onReading: (reading: WearableReading) => void,
  onDisconnect: () => void,
) => { stop: () => void };

const WEARABLE_PLATFORMS: PlatformId[] = ['APPLE_WATCH', 'WEAR_OS', 'OURA'];
const MAX_READING_INTERVAL_MS = 5_000;

export class WearableBridge {
  public onReading: ((reading: WearableReading) => void) | null = null;
  public onDisconnect: ((platformId: PlatformId) => void) | null = null;
  public onReconnect: ((platformId: PlatformId) => void) | null = null;

  private streams: Map<string, { stop: () => void }> = new Map(); // key: `${sessionId}-${platformId}`
  private latestReadings: Map<string, WearableReading> = new Map(); // key: sessionId
  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(
    private readonly integrationManager: IntegrationManager,
    private readonly adapter: WearableStreamAdapter,
  ) {}

  /**
   * Starts streaming from all connected wearable platforms.
   * Requirement 15.1, 15.2: deliver readings at ≤5 second intervals.
   */
  async startStream(userId: string, sessionId: string): Promise<void> {
    for (const platformId of WEARABLE_PLATFORMS) {
      if (this.integrationManager.getStatus(platformId, userId) !== 'CONNECTED') continue;

      try {
        const token = await this.integrationManager.getToken(platformId, userId);
        this._startPlatformStream(userId, sessionId, platformId, token);
      } catch {
        // Platform unavailable — skip (Req 15.5)
      }
    }
  }

  /**
   * Stops all streams for the session.
   */
  stopStream(sessionId: string): void {
    for (const [key, stream] of this.streams) {
      if (key.startsWith(`${sessionId}-`)) {
        stream.stop();
        this.streams.delete(key);
      }
    }
    this._clearReconnectTimers(sessionId);
  }

  /**
   * Returns the most recent reading for the session.
   * Requirement 15.3
   */
  getLatestReading(sessionId: string): WearableReading | null {
    return this.latestReadings.get(sessionId) ?? null;
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  private _startPlatformStream(
    userId: string,
    sessionId: string,
    platformId: PlatformId,
    token: string,
  ): void {
    const key = `${sessionId}-${platformId}`;

    const stream = this.adapter(
      platformId,
      token,
      (reading) => {
        this.latestReadings.set(sessionId, reading);
        this.onReading?.(reading);
      },
      () => {
        // Disconnect handler (Req 15.4)
        this.streams.delete(key);
        this.onDisconnect?.(platformId);
        this._scheduleReconnect(userId, sessionId, platformId);
      },
    );

    this.streams.set(key, stream);
  }

  private _scheduleReconnect(userId: string, sessionId: string, platformId: PlatformId): void {
    const key = `${sessionId}-${platformId}`;
    const timer = setTimeout(async () => {
      this.reconnectTimers.delete(key);
      try {
        const token = await this.integrationManager.getToken(platformId, userId);
        this._startPlatformStream(userId, sessionId, platformId, token);
        this.onReconnect?.(platformId);
      } catch {
        // Reconnect failed — session continues without this platform (Req 15.4)
      }
    }, 5_000);

    this.reconnectTimers.set(key, timer);
  }

  private _clearReconnectTimers(sessionId: string): void {
    for (const [key, timer] of this.reconnectTimers) {
      if (key.startsWith(`${sessionId}-`)) {
        clearTimeout(timer);
        this.reconnectTimers.delete(key);
      }
    }
  }

  /** Exposed for testing: max reading interval in ms */
  static readonly MAX_READING_INTERVAL_MS = MAX_READING_INTERVAL_MS;
}
