// Feature: wellflow-voice-wellness-assistant
// Tests for IntegrationManager — Requirements 13.1, 13.2, 13.7, 14.1, 14.7, 15.1, 16.1, 16.7

import { IntegrationManager, IntegrationManagerCallbacks } from './IntegrationManager';
import { ProfileStore } from '../store/ProfileStore';
import { OAuth_Token, PlatformId } from '../types';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStore(): ProfileStore { return new ProfileStore(); }

function makeCallbacks(): { callbacks: IntegrationManagerCallbacks; failures: Array<{ platformId: PlatformId; userId: string }> } {
  const failures: Array<{ platformId: PlatformId; userId: string }> = [];
  const callbacks: IntegrationManagerCallbacks = {
    onTokenRefreshFailure: (platformId, userId) => failures.push({ platformId, userId }),
  };
  return { callbacks, failures };
}

function makeManager(): { manager: IntegrationManager; failures: Array<{ platformId: PlatformId; userId: string }> } {
  const { callbacks, failures } = makeCallbacks();
  const manager = new IntegrationManager(makeStore(), callbacks);
  return { manager, failures };
}

function makeToken(overrides: Partial<OAuth_Token> = {}): OAuth_Token {
  return {
    platformId: 'GOOGLE_FIT',
    userId: 'user-1',
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-abc',
    expiresAt: new Date(Date.now() + 3600_000), // 1 hour from now
    ...overrides,
  };
}

const OAUTH_PLATFORMS: PlatformId[] = [
  'APPLE_HEALTH', 'GOOGLE_FIT', 'FITBIT',
  'GOOGLE_CALENDAR', 'APPLE_CALENDAR', 'OUTLOOK',
  'OURA', 'SLACK', 'TELEGRAM',
];

const API_KEY_PLATFORMS: PlatformId[] = ['GARMIN', 'WHATSAPP'];

// ---------------------------------------------------------------------------
// authorize / getStatus / revoke — unit tests
// ---------------------------------------------------------------------------

describe('IntegrationManager — authorize and status', () => {
  it('status is DISCONNECTED before authorization', () => {
    const { manager } = makeManager();
    expect(manager.getStatus('GOOGLE_FIT', 'user-1')).toBe('DISCONNECTED');
  });

  it('status is CONNECTED after authorize', async () => {
    const { manager } = makeManager();
    await manager.authorize('GOOGLE_FIT', 'user-1', makeToken());
    expect(manager.getStatus('GOOGLE_FIT', 'user-1')).toBe('CONNECTED');
  });

  it('status is DISCONNECTED after revoke', async () => {
    const { manager } = makeManager();
    await manager.authorize('GOOGLE_FIT', 'user-1', makeToken());
    await manager.revoke('GOOGLE_FIT', 'user-1');
    expect(manager.getStatus('GOOGLE_FIT', 'user-1')).toBe('DISCONNECTED');
  });

  it('getToken throws after revoke', async () => {
    const { manager } = makeManager();
    await manager.authorize('GOOGLE_FIT', 'user-1', makeToken());
    await manager.revoke('GOOGLE_FIT', 'user-1');
    await expect(manager.getToken('GOOGLE_FIT', 'user-1')).rejects.toThrow();
  });

  it('getToken throws when no token exists', async () => {
    const { manager } = makeManager();
    await expect(manager.getToken('GOOGLE_FIT', 'user-1')).rejects.toThrow();
  });
});

describe('IntegrationManager — getToken with valid token', () => {
  it('returns the access token when not expired', async () => {
    const { manager } = makeManager();
    const token = makeToken({ accessToken: 'my-access-token' });
    await manager.authorize('GOOGLE_FIT', 'user-1', token);
    const result = await manager.getToken('GOOGLE_FIT', 'user-1');
    expect(result).toBe('my-access-token');
  });
});

describe('IntegrationManager — token refresh', () => {
  it('refreshes token when within 60 seconds of expiry', async () => {
    const { manager } = makeManager();
    const token = makeToken({
      accessToken: 'old-token',
      refreshToken: 'refresh-abc',
      expiresAt: new Date(Date.now() + 30_000), // 30s — within refresh window
    });
    await manager.authorize('GOOGLE_FIT', 'user-1', token);
    const result = await manager.getToken('GOOGLE_FIT', 'user-1');
    expect(result).toContain('refreshed-');
  });

  it('sets status to UNAUTHORIZED and calls callback when refresh fails (no refresh token)', async () => {
    const { manager, failures } = makeManager();
    const token = makeToken({
      refreshToken: null,
      expiresAt: new Date(Date.now() + 30_000),
    });
    await manager.authorize('GOOGLE_FIT', 'user-1', token);
    await expect(manager.getToken('GOOGLE_FIT', 'user-1')).rejects.toThrow();
    expect(manager.getStatus('GOOGLE_FIT', 'user-1')).toBe('UNAUTHORIZED');
    expect(failures).toHaveLength(1);
    expect(failures[0].platformId).toBe('GOOGLE_FIT');
  });
});

// ---------------------------------------------------------------------------
// Platform coverage — all OAuth and API-key platforms can be authorized
// ---------------------------------------------------------------------------

describe('IntegrationManager — platform coverage', () => {
  it.each(OAUTH_PLATFORMS)('can authorize and revoke OAuth platform %s', async (platformId) => {
    const { manager } = makeManager();
    const token = makeToken({ platformId });
    await manager.authorize(platformId, 'user-1', token);
    expect(manager.getStatus(platformId, 'user-1')).toBe('CONNECTED');
    await manager.revoke(platformId, 'user-1');
    expect(manager.getStatus(platformId, 'user-1')).toBe('DISCONNECTED');
  });

  it.each(API_KEY_PLATFORMS)('can authorize and revoke API-key platform %s', async (platformId) => {
    const { manager } = makeManager();
    const token = makeToken({ platformId, refreshToken: null });
    await manager.authorize(platformId, 'user-1', token);
    expect(manager.getStatus(platformId, 'user-1')).toBe('CONNECTED');
    await manager.revoke(platformId, 'user-1');
    expect(manager.getStatus(platformId, 'user-1')).toBe('DISCONNECTED');
  });
});

// ---------------------------------------------------------------------------
// Property 36: OAuth token refresh idempotence (Task 22.2)
// Feature: wellflow-voice-wellness-assistant, Property 36: OAuth token refresh idempotence
// Validates: Requirements 13.2, 14.1
// ---------------------------------------------------------------------------

describe('IntegrationManager — Property 36: OAuth token refresh idempotence', () => {
  it('calling getToken multiple times on a valid token always returns the same access token', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        async (userId, accessToken) => {
          const { manager } = makeManager();
          const token = makeToken({
            userId,
            accessToken,
            expiresAt: new Date(Date.now() + 3600_000), // well within expiry
          });
          await manager.authorize('GOOGLE_FIT', userId, token);

          const result1 = await manager.getToken('GOOGLE_FIT', userId);
          const result2 = await manager.getToken('GOOGLE_FIT', userId);
          const result3 = await manager.getToken('GOOGLE_FIT', userId);

          expect(result1).toBe(accessToken);
          expect(result2).toBe(accessToken);
          expect(result3).toBe(accessToken);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('refreshing an expiring token is idempotent: subsequent calls return the same refreshed token', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        async (userId, accessToken) => {
          const { manager } = makeManager();
          const token = makeToken({
            userId,
            accessToken,
            refreshToken: 'refresh-token',
            expiresAt: new Date(Date.now() + 30_000), // triggers refresh
          });
          await manager.authorize('GOOGLE_FIT', userId, token);

          // First call triggers refresh
          const result1 = await manager.getToken('GOOGLE_FIT', userId);
          // Second call should return the already-refreshed token (no second refresh)
          const result2 = await manager.getToken('GOOGLE_FIT', userId);

          expect(result1).toBe(result2);
          expect(result1).toContain('refreshed-');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('revoke then re-authorize restores CONNECTED status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.constantFrom(...OAUTH_PLATFORMS),
        async (userId, platformId) => {
          const { manager } = makeManager();
          const token = makeToken({ userId, platformId });

          await manager.authorize(platformId, userId, token);
          expect(manager.getStatus(platformId, userId)).toBe('CONNECTED');

          await manager.revoke(platformId, userId);
          expect(manager.getStatus(platformId, userId)).toBe('DISCONNECTED');

          await manager.authorize(platformId, userId, token);
          expect(manager.getStatus(platformId, userId)).toBe('CONNECTED');
        },
      ),
      { numRuns: 100 },
    );
  });
});
