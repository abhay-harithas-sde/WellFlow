// Feature: wellflow-voice-wellness-assistant
// HealthSync: retrieves biometric data from connected health platforms (Requirements 13.3–13.6)

import { BiometricSnapshot, PlatformId } from '../types';
import { IntegrationManager } from './IntegrationManager';

export interface PlatformBiometricData {
  heartRateBpm?: number | null;
  sleepScore?: number | null;
  stepCount?: number | null;
  updatedAt: Date;
}

export type BiometricFetcher = (platformId: PlatformId, token: string) => Promise<PlatformBiometricData>;

const HEALTH_PLATFORMS: PlatformId[] = ['APPLE_HEALTH', 'GOOGLE_FIT', 'FITBIT', 'GARMIN'];

export class HealthSync {
  constructor(
    private readonly integrationManager: IntegrationManager,
    private readonly fetcher: BiometricFetcher,
  ) {}

  /**
   * Returns the connected health platforms for the user.
   */
  getConnectedPlatforms(userId: string): PlatformId[] {
    return HEALTH_PLATFORMS.filter(
      (p) => this.integrationManager.getStatus(p, userId) === 'CONNECTED',
    );
  }

  /**
   * Fetches biometric data from all connected platforms and merges into a snapshot.
   * Uses the most recently updated value per metric.
   * On all platforms failing, returns a snapshot with all fields null.
   * Requirements: 13.3, 13.5, 13.6
   */
  async fetchSnapshot(userId: string): Promise<BiometricSnapshot> {
    const connected = this.getConnectedPlatforms(userId);
    const sources: PlatformId[] = [];

    let heartRateBpm: number | null = null;
    let sleepScore: number | null = null;
    let stepCount: number | null = null;
    let latestHeartRateTime: Date | null = null;
    let latestSleepTime: Date | null = null;
    let latestStepTime: Date | null = null;

    for (const platformId of connected) {
      try {
        const token = await this.integrationManager.getToken(platformId, userId);
        const data = await this.fetcher(platformId, token);
        sources.push(platformId);

        // Use most recently updated value per metric (Req 13.5)
        if (data.heartRateBpm != null) {
          if (!latestHeartRateTime || data.updatedAt > latestHeartRateTime) {
            heartRateBpm = data.heartRateBpm;
            latestHeartRateTime = data.updatedAt;
          }
        }
        if (data.sleepScore != null) {
          if (!latestSleepTime || data.updatedAt > latestSleepTime) {
            sleepScore = data.sleepScore;
            latestSleepTime = data.updatedAt;
          }
        }
        if (data.stepCount != null) {
          if (!latestStepTime || data.updatedAt > latestStepTime) {
            stepCount = data.stepCount;
            latestStepTime = data.updatedAt;
          }
        }
      } catch {
        // Log failure and continue (Req 13.5)
      }
    }

    return {
      userId,
      capturedAt: new Date(),
      heartRateBpm,
      sleepScore,
      stepCount,
      sources,
    };
  }
}
