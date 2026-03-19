// Feature: wellflow-voice-wellness-assistant
// Tests for HealthSync — Requirements 13.3–13.6

import { HealthSync, BiometricFetcher, PlatformBiometricData } from './HealthSync';
import { IntegrationManager } from './IntegrationManager';
import { ProfileStore } from '../store/ProfileStore';
import { PlatformId, OAuth_Token } from '../types';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeToken(platformId: PlatformId): OAuth_Token {
  return {
    platformId,
    userId: 'user-1',
    accessToken: `token-${platformId}`,
    refreshToken: null,
    expiresAt: new Date(Date.now() + 3600_000),
  };
}

async function makeConnectedManager(userId: string, platforms: PlatformId[]): Promise<IntegrationManager> {
  const store = new ProfileStore();
  const mgr = new IntegrationManager(store);
  for (const p of platforms) {
    await mgr.authorize(p, userId, makeToken(p));
  }
  return mgr;
}

// ---------------------------------------------------------------------------
// Property 34: BiometricSnapshot source completeness (Task 23.3)
// Feature: wellflow-voice-wellness-assistant, Property 34: BiometricSnapshot source completeness
// Validates: Requirements 13.3
// ---------------------------------------------------------------------------

describe('HealthSync — Property 34: BiometricSnapshot source completeness', () => {
  it('sources array contains only platforms that responded successfully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.subarray(['APPLE_HEALTH', 'GOOGLE_FIT', 'FITBIT', 'GARMIN'] as PlatformId[], { minLength: 1 }),
        async (platforms) => {
          const mgr = await makeConnectedManager('user-1', platforms);
          const fetcher: BiometricFetcher = async (_pid, _token) => ({
            heartRateBpm: 70,
            updatedAt: new Date(),
          });
          const sync = new HealthSync(mgr, fetcher);
          const snapshot = await sync.fetchSnapshot('user-1');

          expect(snapshot.sources.length).toBe(platforms.length);
          for (const p of platforms) {
            expect(snapshot.sources).toContain(p);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 35: Health platform failure isolation (Task 23.4)
// Feature: wellflow-voice-wellness-assistant, Property 35: Health platform failure isolation
// Validates: Requirements 13.5
// ---------------------------------------------------------------------------

describe('HealthSync — Property 35: Health platform failure isolation', () => {
  it('when one platform fails, others still contribute to the snapshot', async () => {
    const platforms: PlatformId[] = ['APPLE_HEALTH', 'GOOGLE_FIT'];
    const mgr = await makeConnectedManager('user-1', platforms);

    const fetcher: BiometricFetcher = async (platformId, _token) => {
      if (platformId === 'APPLE_HEALTH') throw new Error('platform error');
      return { heartRateBpm: 72, updatedAt: new Date() };
    };

    const sync = new HealthSync(mgr, fetcher);
    const snapshot = await sync.fetchSnapshot('user-1');

    expect(snapshot.sources).toContain('GOOGLE_FIT');
    expect(snapshot.sources).not.toContain('APPLE_HEALTH');
    expect(snapshot.heartRateBpm).toBe(72);
  });

  it('when all platforms fail, returns snapshot with all null metrics', async () => {
    const platforms: PlatformId[] = ['APPLE_HEALTH', 'GOOGLE_FIT'];
    const mgr = await makeConnectedManager('user-1', platforms);

    const fetcher: BiometricFetcher = async () => { throw new Error('all fail'); };
    const sync = new HealthSync(mgr, fetcher);
    const snapshot = await sync.fetchSnapshot('user-1');

    expect(snapshot.sources).toHaveLength(0);
    expect(snapshot.heartRateBpm).toBeNull();
    expect(snapshot.sleepScore).toBeNull();
    expect(snapshot.stepCount).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('HealthSync — unit tests', () => {
  it('uses most recently updated value when multiple platforms provide same metric', async () => {
    const platforms: PlatformId[] = ['APPLE_HEALTH', 'GOOGLE_FIT'];
    const mgr = await makeConnectedManager('user-1', platforms);

    const older = new Date(Date.now() - 10_000);
    const newer = new Date();

    const fetcher: BiometricFetcher = async (platformId) => {
      if (platformId === 'APPLE_HEALTH') return { heartRateBpm: 60, updatedAt: older };
      return { heartRateBpm: 80, updatedAt: newer };
    };

    const sync = new HealthSync(mgr, fetcher);
    const snapshot = await sync.fetchSnapshot('user-1');

    expect(snapshot.heartRateBpm).toBe(80); // newer value wins
  });

  it('returns empty sources when no platforms are connected', async () => {
    const store = new ProfileStore();
    const mgr = new IntegrationManager(store);
    const fetcher: BiometricFetcher = async () => ({ updatedAt: new Date() });
    const sync = new HealthSync(mgr, fetcher);
    const snapshot = await sync.fetchSnapshot('user-1');

    expect(snapshot.sources).toHaveLength(0);
  });
});
