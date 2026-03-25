// Feature: wellflow-voice-wellness-assistant
// Tests for MessagingGateway — Requirements 16.1–16.7

import { MessagingGateway, MessagingPlatformAdapter } from './MessagingGateway';
import { IntegrationManager } from './IntegrationManager';
import { ProfileStore } from '../store/ProfileStore';
import { MessagingPlatformId, OAuth_Token, OutboundMessage } from '../types';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeToken(platformId: MessagingPlatformId): OAuth_Token {
  return {
    platformId,
    userId: 'user-1',
    accessToken: `token-${platformId}`,
    refreshToken: null,
    expiresAt: new Date(Date.now() + 3600_000),
  };
}

async function makeConnectedManager(userId: string, platforms: MessagingPlatformId[]): Promise<IntegrationManager> {
  const store = new ProfileStore();
  const mgr = new IntegrationManager(store);
  for (const p of platforms) {
    await mgr.authorize(p, userId, makeToken(p));
  }
  return mgr;
}

function makeAdapter(): jest.Mocked<MessagingPlatformAdapter> {
  return { send: jest.fn().mockResolvedValue(undefined) };
}

function makeMessage(overrides: Partial<OutboundMessage> = {}): OutboundMessage {
  return {
    userId: 'user-1',
    platforms: ['SLACK'],
    text: 'Test notification',
    eventId: 'event-1',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Property 41: Messaging deduplication (Task 26.5)
// Feature: wellflow-voice-wellness-assistant, Property 41: Messaging deduplication
// Validates: Requirements 16.6
// ---------------------------------------------------------------------------

describe('MessagingGateway — Property 41: Messaging deduplication', () => {
  it('sending the same eventId twice within 60 seconds only delivers once', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.integer({ min: 2, max: 5 }),
        async (eventId, sendCount) => {
          const mgr = await makeConnectedManager('user-1', ['SLACK']);
          const adapter = makeAdapter();
          const gw = new MessagingGateway(mgr, { SLACK: adapter });

          for (let i = 0; i < sendCount; i++) {
            await gw.sendNotification(makeMessage({ eventId }));
          }

          expect(adapter.send).toHaveBeenCalledTimes(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 42: Messaging platform failure isolation (Task 26.6)
// Feature: wellflow-voice-wellness-assistant, Property 42: Messaging platform failure isolation
// Validates: Requirements 16.5
// ---------------------------------------------------------------------------

describe('MessagingGateway — Property 42: Messaging platform failure isolation', () => {
  it('when one platform fails, others still receive the notification', async () => {
    const mgr = await makeConnectedManager('user-1', ['SLACK', 'TELEGRAM']);
    const slackAdapter = makeAdapter();
    slackAdapter.send.mockRejectedValue(new Error('Slack error'));
    const telegramAdapter = makeAdapter();

    const gw = new MessagingGateway(mgr, { SLACK: slackAdapter, TELEGRAM: telegramAdapter });

    await gw.sendNotification(makeMessage({ platforms: ['SLACK', 'TELEGRAM'] }));

    expect(telegramAdapter.send).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('MessagingGateway — unit tests', () => {
  it('sends notification to all specified connected platforms', async () => {
    const mgr = await makeConnectedManager('user-1', ['SLACK', 'TELEGRAM']);
    const slackAdapter = makeAdapter();
    const telegramAdapter = makeAdapter();
    const gw = new MessagingGateway(mgr, { SLACK: slackAdapter, TELEGRAM: telegramAdapter });

    await gw.sendNotification(makeMessage({ platforms: ['SLACK', 'TELEGRAM'] }));

    expect(slackAdapter.send).toHaveBeenCalledTimes(1);
    expect(telegramAdapter.send).toHaveBeenCalledTimes(1);
  });

  it('does not send to disconnected platforms', async () => {
    const store = new ProfileStore();
    const mgr = new IntegrationManager(store);
    const adapter = makeAdapter();
    const gw = new MessagingGateway(mgr, { SLACK: adapter });

    await gw.sendNotification(makeMessage({ platforms: ['SLACK'] }));

    expect(adapter.send).not.toHaveBeenCalled();
  });

  it('parses START_BREATHING command', () => {
    const store = new ProfileStore();
    const mgr = new IntegrationManager(store);
    const gw = new MessagingGateway(mgr, {});

    const commands: ReturnType<typeof gw.receiveCommand>[] = [];
    gw.onInboundCommand = (cmd) => commands.push(cmd as never);

    gw.receiveCommand('SLACK', 'user-1', 'start breathing');
    expect((commands[0] as unknown as { parsedAction: string }).parsedAction).toBe('START_BREATHING');
  });

  it('parses UNKNOWN for unrecognized commands', () => {
    const store = new ProfileStore();
    const mgr = new IntegrationManager(store);
    const gw = new MessagingGateway(mgr, {});

    const commands: unknown[] = [];
    gw.onInboundCommand = (cmd) => commands.push(cmd);

    gw.receiveCommand('SLACK', 'user-1', 'hello there');
    expect((commands[0] as { parsedAction: string }).parsedAction).toBe('UNKNOWN');
  });

  it('getConnectedPlatforms returns only connected platforms', async () => {
    const mgr = await makeConnectedManager('user-1', ['SLACK']);
    const gw = new MessagingGateway(mgr, {});

    const platforms = gw.getConnectedPlatforms('user-1');
    expect(platforms).toContain('SLACK');
    expect(platforms).not.toContain('TELEGRAM');
  });
});
