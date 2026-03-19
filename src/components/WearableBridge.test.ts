// Feature: wellflow-voice-wellness-assistant
// Tests for WearableBridge — Requirements 15.1–15.6

import { WearableBridge, WearableStreamAdapter } from './WearableBridge';
import { IntegrationManager } from './IntegrationManager';
import { ProfileStore } from '../store/ProfileStore';
import { PlatformId, OAuth_Token, WearableReading } from '../types';
import * as fc from 'fast-check';

jest.useFakeTimers();

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

function makeSampleReading(platformId: PlatformId): WearableReading {
  return {
    platformId,
    timestamp: new Date(),
    heartRateBpm: 72,
    hrvMs: 45,
    stressScore: 30,
  };
}

// ---------------------------------------------------------------------------
// Property 39: Wearable reading freshness (Task 25.3)
// Feature: wellflow-voice-wellness-assistant, Property 39: Wearable reading freshness
// Validates: Requirements 15.2
// ---------------------------------------------------------------------------

describe('WearableBridge — Property 39: Wearable reading freshness', () => {
  it('getLatestReading returns the most recently delivered reading', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 60, max: 120 }), { minLength: 1, maxLength: 5 }),
        async (heartRates) => {
          const mgr = await makeConnectedManager('user-1', ['APPLE_WATCH']);
          let capturedOnReading: ((r: WearableReading) => void) = () => {};

          const adapter: WearableStreamAdapter = (_pid, _token, onReading) => {
            capturedOnReading = onReading;
            return { stop: jest.fn() };
          };

          const bridge = new WearableBridge(mgr, adapter);
          await bridge.startStream('user-1', 'session-1');

          for (const hr of heartRates) {
            capturedOnReading({
              platformId: 'APPLE_WATCH',
              timestamp: new Date(),
              heartRateBpm: hr,
              hrvMs: null,
              stressScore: null,
            });
          }

          const latest = bridge.getLatestReading('session-1');
          expect(latest?.heartRateBpm).toBe(heartRates[heartRates.length - 1]);

          bridge.stopStream('session-1');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 40: Wearable disconnection session continuity (Task 25.4)
// Feature: wellflow-voice-wellness-assistant, Property 40: Wearable disconnection session continuity
// Validates: Requirements 15.4
// ---------------------------------------------------------------------------

describe('WearableBridge — Property 40: Wearable disconnection session continuity', () => {
  it('onDisconnect is called when platform disconnects and session continues', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const mgr = await makeConnectedManager('user-1', ['APPLE_WATCH']);
          let capturedOnDisconnect: () => void = () => {};

          const adapter: WearableStreamAdapter = (_pid, _token, _onReading, onDisconnect) => {
            capturedOnDisconnect = onDisconnect;
            return { stop: jest.fn() };
          };

          const disconnects: PlatformId[] = [];
          const bridge = new WearableBridge(mgr, adapter);
          bridge.onDisconnect = (p) => disconnects.push(p);

          await bridge.startStream('user-1', 'session-1');
          capturedOnDisconnect();

          expect(disconnects).toContain('APPLE_WATCH');
          // Session continues — bridge still exists and getLatestReading doesn't throw
          expect(() => bridge.getLatestReading('session-1')).not.toThrow();

          bridge.stopStream('session-1');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('WearableBridge — unit tests', () => {
  it('delivers readings via onReading callback', async () => {
    const mgr = await makeConnectedManager('user-1', ['APPLE_WATCH']);
    let capturedOnReading: (r: WearableReading) => void = () => {};

    const adapter: WearableStreamAdapter = (_pid, _token, onReading) => {
      capturedOnReading = onReading;
      return { stop: jest.fn() };
    };

    const readings: WearableReading[] = [];
    const bridge = new WearableBridge(mgr, adapter);
    bridge.onReading = (r) => readings.push(r);

    await bridge.startStream('user-1', 'session-1');
    capturedOnReading(makeSampleReading('APPLE_WATCH'));

    expect(readings).toHaveLength(1);
    expect(readings[0].heartRateBpm).toBe(72);

    bridge.stopStream('session-1');
  });

  it('returns null for getLatestReading when no readings received', async () => {
    const store = new ProfileStore();
    const mgr = new IntegrationManager(store);
    const adapter: WearableStreamAdapter = () => ({ stop: jest.fn() });
    const bridge = new WearableBridge(mgr, adapter);

    expect(bridge.getLatestReading('session-x')).toBeNull();
  });

  it('does not start streams when no wearable platforms are connected', async () => {
    const store = new ProfileStore();
    const mgr = new IntegrationManager(store);
    const adapter = jest.fn() as unknown as WearableStreamAdapter;
    const bridge = new WearableBridge(mgr, adapter);

    await bridge.startStream('user-1', 'session-1');
    expect(adapter).not.toHaveBeenCalled();
  });
});
