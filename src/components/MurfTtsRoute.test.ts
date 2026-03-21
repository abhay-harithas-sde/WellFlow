/**
 * Unit tests for /api/murf/tts route handler
 * Requirements: 12.3, 12.4
 */

import { NextRequest } from 'next/server';

jest.mock('../../lib/murf-config', () => ({
  getMurfApiKey: jest.fn(() => 'test-api-key-tts-99'),
  ConfigurationError: class ConfigurationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ConfigurationError';
    }
  },
}));

import { GET } from '../../app/api/raw/murf/tts/route';
import { getMurfApiKey } from '../../lib/murf-config';

const APP_ORIGIN = 'http://localhost:3000';

function makeRequest(options: {
  origin?: string | null;
  host?: string;
  upgrade?: string;
}): NextRequest {
  const url = `${APP_ORIGIN}/api/murf/tts`;
  const headers: Record<string, string> = {
    host: options.host ?? 'localhost:3000',
  };
  if (options.origin !== null) {
    headers['origin'] = options.origin ?? APP_ORIGIN;
  }
  if (options.upgrade) {
    headers['upgrade'] = options.upgrade;
    headers['connection'] = 'Upgrade';
  }
  return new NextRequest(url, {
    method: 'GET',
    headers,
  });
}

describe('/api/murf/tts route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  describe('same-origin validation', () => {
    it('returns 403 when Origin header is absent', async () => {
      const req = makeRequest({ origin: null });
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it('returns 403 when Origin header does not match app origin', async () => {
      const req = makeRequest({ origin: 'https://attacker.example.com' });
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it('returns 403 for a different port', async () => {
      const req = makeRequest({ origin: 'http://localhost:9999' });
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it('does not call getMurfApiKey when origin check fails', async () => {
      const req = makeRequest({ origin: 'https://evil.com' });
      await GET(req);
      expect(getMurfApiKey).not.toHaveBeenCalled();
    });
  });

  describe('non-WebSocket requests', () => {
    it('returns 426 Upgrade Required for a plain GET without Upgrade header', async () => {
      const req = makeRequest({ origin: APP_ORIGIN });
      const res = await GET(req);
      expect(res.status).toBe(426);
    });

    it('returns 426 for a non-websocket Upgrade value', async () => {
      const req = makeRequest({ origin: APP_ORIGIN, upgrade: 'h2c' });
      const res = await GET(req);
      expect(res.status).toBe(426);
    });
  });

  describe('WebSocket upgrade requests', () => {
    it('returns 426 with X-Murf-Auth header containing Bearer token for valid WS upgrade', async () => {
      const req = makeRequest({ origin: APP_ORIGIN, upgrade: 'websocket' });
      const res = await GET(req);
      // The route returns 426 with auth header because actual WS proxying is runtime-handled
      expect(res.status).toBe(426);
      expect(res.headers.get('X-Murf-Auth')).toBe('Bearer test-api-key-tts-99');
    });

    it('calls getMurfApiKey() for a valid same-origin WebSocket upgrade', async () => {
      const req = makeRequest({ origin: APP_ORIGIN, upgrade: 'websocket' });
      await GET(req);
      expect(getMurfApiKey).toHaveBeenCalled();
    });

    it('injects the API key as Authorization Bearer in the auth header', async () => {
      const req = makeRequest({ origin: APP_ORIGIN, upgrade: 'websocket' });
      const res = await GET(req);
      const authHeader = res.headers.get('X-Murf-Auth');
      expect(authHeader).toMatch(/^Bearer /);
      expect(authHeader).toBe('Bearer test-api-key-tts-99');
    });

    it('uses NEXT_PUBLIC_APP_URL for origin check when set', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://prod.example.com';
      const req = makeRequest({
        origin: 'https://prod.example.com',
        host: 'prod.example.com',
        upgrade: 'websocket',
      });
      const res = await GET(req);
      // Should pass origin check and reach the WS handling path
      expect(res.status).not.toBe(403);
    });
  });

  describe('configuration error handling', () => {
    it('returns 500 when getMurfApiKey throws ConfigurationError on WS upgrade', async () => {
      const { ConfigurationError } = jest.requireMock('../../lib/murf-config') as {
        ConfigurationError: new (msg: string) => Error;
      };
      (getMurfApiKey as jest.Mock).mockImplementationOnce(() => {
        throw new ConfigurationError('MURF_API_KEY missing');
      });

      const req = makeRequest({ origin: APP_ORIGIN, upgrade: 'websocket' });
      const res = await GET(req);
      expect(res.status).toBe(500);
    });
  });
});

