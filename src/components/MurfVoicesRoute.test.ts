/**
 * Unit tests for /api/murf/voices route handler
 * Requirements: 12.3, 12.4
 */

// We test the route logic directly by importing the handler and constructing
// mock NextRequest objects.

import { NextRequest } from 'next/server';

// Mock lib/murf-config before importing the route
jest.mock('../../lib/murf-config', () => ({
  getMurfApiKey: jest.fn(() => 'test-api-key-12345'),
  ConfigurationError: class ConfigurationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ConfigurationError';
    }
  },
}));

// Mock global fetch used by the route
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { GET } from '../../app/api/raw/murf/voices/route';
import { getMurfApiKey } from '../../lib/murf-config';

const APP_ORIGIN = 'http://localhost:3000';

function makeRequest(options: {
  origin?: string | null;
  host?: string;
  method?: string;
}): NextRequest {
  const url = `${APP_ORIGIN}/api/murf/voices`;
  const headers: Record<string, string> = {
    host: options.host ?? 'localhost:3000',
  };
  if (options.origin !== null) {
    headers['origin'] = options.origin ?? APP_ORIGIN;
  }
  return new NextRequest(url, {
    method: options.method ?? 'GET',
    headers,
  });
}

describe('/api/murf/voices route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_APP_URL;
    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({ voices: [] }),
    });
  });

  describe('same-origin validation', () => {
    it('returns 403 when Origin header is absent', async () => {
      const req = makeRequest({ origin: null });
      const res = await GET(req);
      expect(res.status).toBe(403);
      // Must not have called upstream
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns 403 when Origin header does not match app origin', async () => {
      const req = makeRequest({ origin: 'https://evil.example.com' });
      const res = await GET(req);
      expect(res.status).toBe(403);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns 403 for a different subdomain', async () => {
      const req = makeRequest({ origin: 'http://sub.localhost:3000' });
      const res = await GET(req);
      expect(res.status).toBe(403);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns 403 for same host but different port', async () => {
      const req = makeRequest({ origin: 'http://localhost:4000' });
      const res = await GET(req);
      expect(res.status).toBe(403);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('successful same-origin request', () => {
    it('forwards request to Murf API when Origin matches Host-derived origin', async () => {
      const req = makeRequest({ origin: APP_ORIGIN });
      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('uses NEXT_PUBLIC_APP_URL when set', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
      const req = makeRequest({
        origin: 'https://app.example.com',
        host: 'app.example.com',
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('injects Authorization: Bearer header on upstream request', async () => {
      const req = makeRequest({ origin: APP_ORIGIN });
      await GET(req);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.murf.ai/v1/speech/voices',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key-12345',
          }),
        })
      );
    });

    it('calls getMurfApiKey() to retrieve the API key', async () => {
      const req = makeRequest({ origin: APP_ORIGIN });
      await GET(req);
      expect(getMurfApiKey).toHaveBeenCalled();
    });

    it('returns the JSON body from the upstream response', async () => {
      const voiceData = { voices: [{ voiceId: 'v1', name: 'Alice' }] };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => voiceData,
      });

      const req = makeRequest({ origin: APP_ORIGIN });
      const res = await GET(req);
      const body = await res.json();
      expect(body).toEqual(voiceData);
    });
  });

  describe('configuration error handling', () => {
    it('returns 500 when getMurfApiKey throws ConfigurationError', async () => {
      const { ConfigurationError } = jest.requireMock('../../lib/murf-config') as {
        ConfigurationError: new (msg: string) => Error;
      };
      (getMurfApiKey as jest.Mock).mockImplementationOnce(() => {
        throw new ConfigurationError('MURF_API_KEY is absent');
      });

      const req = makeRequest({ origin: APP_ORIGIN });
      const res = await GET(req);
      expect(res.status).toBe(500);
      // Must not have called upstream
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});

