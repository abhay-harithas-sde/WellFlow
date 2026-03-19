// Feature: wellflow-voice-wellness-assistant
// IntegrationManager: manages OAuth 2.0 and API key credentials for third-party platforms
// Requirements: 13.1, 13.2, 13.7, 14.1, 14.7, 15.1, 16.1, 16.7

import { PlatformId, IntegrationStatus, OAuth_Token, IntegrationConfig } from '../types';
import { ProfileStore } from '../store/ProfileStore';

export interface IntegrationManagerCallbacks {
  onTokenRefreshFailure: (platformId: PlatformId, userId: string) => void;
}

export class IntegrationManager {
  private configs: Map<string, IntegrationConfig> = new Map();

  constructor(
    private readonly profileStore: ProfileStore,
    private readonly callbacks?: IntegrationManagerCallbacks,
  ) {}

  /**
   * Initiates OAuth / API key flow for the given platform.
   * In production this would open a browser; here we accept a token directly for testability.
   * Requirements: 13.1, 14.1, 15.1, 16.1
   */
  async authorize(platformId: PlatformId, userId: string, token: OAuth_Token): Promise<void> {
    const config = this._getOrCreateConfig(userId);
    config.platforms[platformId] = { status: 'CONNECTED', token };
    this._saveConfig(userId, config);
  }

  /**
   * Deletes the stored token and sets status to DISCONNECTED.
   * Requirements: 13.7, 14.7, 16.7
   */
  async revoke(platformId: PlatformId, userId: string): Promise<void> {
    const config = this._getOrCreateConfig(userId);
    config.platforms[platformId] = { status: 'DISCONNECTED' };
    this._saveConfig(userId, config);
  }

  /**
   * Returns a valid access token, refreshing if needed.
   * On refresh failure, sets status to UNAUTHORIZED and throws.
   * Requirement 13.2
   */
  async getToken(platformId: PlatformId, userId: string): Promise<string> {
    const config = this._getOrCreateConfig(userId);
    const entry = config.platforms[platformId];

    if (!entry?.token) {
      throw new Error(`No token for platform ${platformId}`);
    }

    const token = entry.token;

    // Check if token needs refresh (within 60 seconds of expiry)
    const now = new Date();
    const expiresAt = new Date(token.expiresAt);
    const needsRefresh = expiresAt.getTime() - now.getTime() < 60_000;

    if (needsRefresh) {
      try {
        const refreshed = await this._refreshToken(token);
        entry.token = refreshed;
        this._saveConfig(userId, config);
        return refreshed.accessToken;
      } catch {
        entry.status = 'UNAUTHORIZED';
        this._saveConfig(userId, config);
        this.callbacks?.onTokenRefreshFailure(platformId, userId);
        throw new Error(`Token refresh failed for platform ${platformId}`);
      }
    }

    return token.accessToken;
  }

  /**
   * Returns the current integration status for the platform.
   */
  getStatus(platformId: PlatformId, userId: string): IntegrationStatus {
    const config = this._getOrCreateConfig(userId);
    return config.platforms[platformId]?.status ?? 'DISCONNECTED';
  }

  /**
   * Explicitly sets the integration status for a platform.
   * Used by integration components to mark a platform as UNAUTHORIZED on error.
   */
  setStatus(platformId: PlatformId, userId: string, status: IntegrationStatus): void {
    const config = this._getOrCreateConfig(userId);
    const entry = config.platforms[platformId];
    if (entry) {
      entry.status = status;
    } else {
      config.platforms[platformId] = { status };
    }
    this._saveConfig(userId, config);
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  private _getOrCreateConfig(userId: string): IntegrationConfig {
    if (!this.configs.has(userId)) {
      this.configs.set(userId, { userId, platforms: {} });
    }
    return this.configs.get(userId)!;
  }

  private _saveConfig(userId: string, config: IntegrationConfig): void {
    this.configs.set(userId, config);
  }

  /**
   * Simulates token refresh — in production would call the platform's token endpoint.
   * Returns a new token with extended expiry.
   */
  private async _refreshToken(token: OAuth_Token): Promise<OAuth_Token> {
    if (!token.refreshToken) {
      throw new Error('No refresh token available');
    }
    // Simulate refresh: extend expiry by 1 hour
    return {
      ...token,
      accessToken: `refreshed-${token.accessToken}`,
      expiresAt: new Date(Date.now() + 3600_000),
    };
  }
}
