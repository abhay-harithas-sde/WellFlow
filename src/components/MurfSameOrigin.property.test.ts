// Feature: murf-ai-voice-integration, Property 13: Same-origin check gates all proxy forwarding

/**
 * Property 13: Same-origin check gates all proxy forwarding
 *
 * For any request where the Origin header does not match the app's own origin,
 * the route must return HTTP 403 and must not make any outbound request to Murf API.
 *
 * Validates: Requirements 12.3, 12.4
 */

import * as fc from 'fast-check';
import { NextRequest } from 'next/server';

jest.mock('../../lib/murf-config', () => ({
  getMurfApiKey: jest.fn(() => 'prop-test-api-key'),
  ConfigurationError: class ConfigurationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ConfigurationError';
    }
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { GET as voicesGET } from '../../app/api/raw/murf/voices/route';
import { GET as ttsGET } from '../../app/api/raw/murf/tts/route';
import { getMurfApiKey } from '../../lib/murf-config';

const APP_HOST = 'localhost:3000';
const APP_ORIGIN = 'http://localhost:3000';

/** Build a NextRequest with the given origin (or no origin if null) */
function makeVoicesRequest(origin: string | null): NextRequest {
  const headers: Record<string, string> = { host: APP_HOST };
  if (origin !== null) headers['origin'] = origin;
  return new NextRequest(`${APP_ORIGIN}/api/murf/voices`, { method: 'GET', headers });
}

function makeTtsRequest(origin: string | null): NextRequest {
  const headers: Record<string, string> = { host: APP_HOST };
  if (origin !== null) headers['origin'] = origin;
  return new NextRequest(`${APP_ORIGIN}/api/murf/tts`, { method: 'GET', headers });
}

/** Arbitrary that generates strings that are NOT the app origin */
const nonMatchingOriginArb = fc
  .string({ minLength: 0, maxLength: 100 })
  .filter((s) => s !== APP_ORIGIN);

describe('Property 13: Same-origin check gates all proxy forwarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_APP_URL;
    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({ voices: [] }),
    });
  });

  it('P13a: /api/murf/voices returns 403 and makes no upstream call for any non-matching origin', async () => {
    await fc.assert(
      fc.asyncProperty(nonMatchingOriginArb, async (badOrigin) => {
        jest.clearAllMocks();
        const req = makeVoicesRequest(badOrigin);
        const res = await voicesGET(req);
        // Must return 403
        expect(res.status).toBe(403);
        // Must not call upstream fetch
        expect(mockFetch).not.toHaveBeenCalled();
        // Must not call getMurfApiKey (no key retrieval for rejected requests)
        expect(getMurfApiKey).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it('P13b: /api/murf/tts returns 403 and does not retrieve API key for any non-matching origin', async () => {
    await fc.assert(
      fc.asyncProperty(nonMatchingOriginArb, async (badOrigin) => {
        jest.clearAllMocks();
        const req = makeTtsRequest(badOrigin);
        const res = await ttsGET(req);
        // Must return 403
        expect(res.status).toBe(403);
        // Must not attempt to retrieve the API key
        expect(getMurfApiKey).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it('P13c: absent Origin header always returns 403 on both routes', async () => {
    // No origin at all — treated as cross-origin
    const voicesReq = makeVoicesRequest(null);
    const ttsReq = makeTtsRequest(null);

    const [voicesRes, ttsRes] = await Promise.all([voicesGET(voicesReq), ttsGET(ttsReq)]);

    expect(voicesRes.status).toBe(403);
    expect(ttsRes.status).toBe(403);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(getMurfApiKey).not.toHaveBeenCalled();
  });

  it('P13d: matching origin is NOT blocked (sanity check)', async () => {
    // Verify the same-origin case passes the gate (does not return 403)
    const req = makeVoicesRequest(APP_ORIGIN);
    const res = await voicesGET(req);
    expect(res.status).not.toBe(403);
  });
});

