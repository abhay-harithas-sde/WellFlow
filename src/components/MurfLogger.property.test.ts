// Feature: murf-ai-voice-integration, Property 15: Log entries contain required fields and never contain the API key
// Validates: Requirements 13.1, 13.2, 13.3, 13.4

import * as fc from 'fast-check';
import { MurfLogger } from '../../lib/murf-logger';

describe('MurfLogger — Property 15: Log entries contain required fields and never contain the API key', () => {
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  /**
   * Generates a realistic API key: alphanumeric, at least 16 chars.
   * Long enough that it won't accidentally appear as a substring in the log template.
   */
  const apiKeyArb = fc
    .string({ minLength: 16, maxLength: 40 })
    .map((s) => s.replace(/[^a-zA-Z0-9]/g, 'x'))
    .filter((s) => s.length >= 16);

  it('logApiError: output contains all required fields and never the API key', () => {
    fc.assert(
      fc.property(
        apiKeyArb,
        fc.integer({ min: 100, max: 599 }),       // statusCode
        fc.constantFrom('TTS', 'CATALOGUE'),       // requestType
        fc.uuid(),                                 // sessionId — UUID won't contain the key
        fc.date().map((d) => d.toISOString()),     // timestamp
        (apiKey, statusCode, requestType, sessionId, timestamp) => {
          errorSpy.mockClear();
          const logger = new MurfLogger(apiKey);
          logger.logApiError(statusCode, requestType, sessionId, timestamp);

          expect(errorSpy).toHaveBeenCalledTimes(1);
          const logged = errorSpy.mock.calls[0][0] as string;

          // Required fields present
          expect(logged).toContain(String(statusCode));
          expect(logged).toContain(requestType);
          expect(logged).toContain(sessionId);
          expect(logged).toContain(timestamp);

          // API key must never appear
          expect(logged).not.toContain(apiKey);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('logWsError: output contains all required fields and never the API key', () => {
    fc.assert(
      fc.property(
        apiKeyArb,
        fc.integer({ min: 1000, max: 4999 }),     // error code
        fc.string({ minLength: 4, maxLength: 50 })
          .map((s) => s.replace(/[^a-zA-Z0-9 ]/g, 'x')), // reason — safe chars
        fc.uuid(),                                 // sessionId
        (apiKey, code, reason, sessionId) => {
          errorSpy.mockClear();
          const logger = new MurfLogger(apiKey);
          logger.logWsError(code, reason, sessionId);

          expect(errorSpy).toHaveBeenCalledTimes(1);
          const logged = errorSpy.mock.calls[0][0] as string;

          // Required fields present
          expect(logged).toContain(String(code));
          expect(logged).toContain(reason);
          expect(logged).toContain(sessionId);

          // API key must never appear
          expect(logged).not.toContain(apiKey);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('logFallback: output contains session ID and reason, never the API key', () => {
    fc.assert(
      fc.property(
        apiKeyArb,
        fc.uuid(),                                 // sessionId
        fc.constantFrom('API_ERROR', 'RATE_LIMIT_TIMEOUT', 'AUTH_ERROR_401', 'AUTH_ERROR_403'),
        (apiKey, sessionId, reason) => {
          warnSpy.mockClear();
          const logger = new MurfLogger(apiKey);
          logger.logFallback(sessionId, reason);

          expect(warnSpy).toHaveBeenCalledTimes(1);
          const logged = warnSpy.mock.calls[0][0] as string;

          // Required fields present
          expect(logged).toContain(sessionId);
          expect(logged).toContain(reason);

          // API key must never appear
          expect(logged).not.toContain(apiKey);
        }
      ),
      { numRuns: 100 }
    );
  });
});
