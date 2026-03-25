// Feature: murf-ai-voice-integration
// Unit tests for MurfLogger (Requirements 13.1, 13.2, 13.3, 13.4)

import { MurfLogger } from '../../lib/murf-logger';

const FAKE_API_KEY = 'test-secret-api-key-12345';

describe('MurfLogger', () => {
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

  // ------------------------------------------------------------------
  // logApiError (Req 13.1)
  // ------------------------------------------------------------------

  describe('logApiError', () => {
    it('logs the HTTP status code', () => {
      const logger = new MurfLogger();
      logger.logApiError(503, 'TTS', 'session-1', '2024-01-01T00:00:00.000Z');
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toContain('503');
    });

    it('logs the request type', () => {
      const logger = new MurfLogger();
      logger.logApiError(500, 'CATALOGUE', 'session-2', '2024-01-01T00:00:00.000Z');
      expect(errorSpy.mock.calls[0][0]).toContain('CATALOGUE');
    });

    it('logs the session ID', () => {
      const logger = new MurfLogger();
      logger.logApiError(500, 'TTS', 'my-session-abc', '2024-01-01T00:00:00.000Z');
      expect(errorSpy.mock.calls[0][0]).toContain('my-session-abc');
    });

    it('logs the timestamp', () => {
      const logger = new MurfLogger();
      const ts = '2024-06-15T12:34:56.789Z';
      logger.logApiError(500, 'TTS', 'session-3', ts);
      expect(errorSpy.mock.calls[0][0]).toContain(ts);
    });
  });

  // ------------------------------------------------------------------
  // logWsError (Req 13.2)
  // ------------------------------------------------------------------

  describe('logWsError', () => {
    it('logs the error code', () => {
      const logger = new MurfLogger();
      logger.logWsError(1006, 'Abnormal closure', 'session-ws-1');
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toContain('1006');
    });

    it('logs the reason', () => {
      const logger = new MurfLogger();
      logger.logWsError(1001, 'Going away', 'session-ws-2');
      expect(errorSpy.mock.calls[0][0]).toContain('Going away');
    });

    it('logs the session ID', () => {
      const logger = new MurfLogger();
      logger.logWsError(1001, 'reason', 'ws-session-xyz');
      expect(errorSpy.mock.calls[0][0]).toContain('ws-session-xyz');
    });
  });

  // ------------------------------------------------------------------
  // logFallback (Req 13.4)
  // ------------------------------------------------------------------

  describe('logFallback', () => {
    it('logs the session ID', () => {
      const logger = new MurfLogger();
      logger.logFallback('fallback-session-1', 'API_ERROR');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain('fallback-session-1');
    });

    it('logs the reason', () => {
      const logger = new MurfLogger();
      logger.logFallback('session-x', 'RATE_LIMIT_TIMEOUT');
      expect(warnSpy.mock.calls[0][0]).toContain('RATE_LIMIT_TIMEOUT');
    });
  });

  // ------------------------------------------------------------------
  // API key leakage prevention (Req 13.3)
  // ------------------------------------------------------------------

  describe('API key leakage prevention', () => {
    it('logApiError does not emit the API key value', () => {
      const logger = new MurfLogger(FAKE_API_KEY);
      logger.logApiError(500, 'TTS', 'session-1', '2024-01-01T00:00:00.000Z');
      const logged = errorSpy.mock.calls[0][0] as string;
      expect(logged).not.toContain(FAKE_API_KEY);
    });

    it('logWsError does not emit the API key value', () => {
      const logger = new MurfLogger(FAKE_API_KEY);
      logger.logWsError(1006, 'reason', 'session-2');
      const logged = errorSpy.mock.calls[0][0] as string;
      expect(logged).not.toContain(FAKE_API_KEY);
    });

    it('logFallback does not emit the API key value', () => {
      const logger = new MurfLogger(FAKE_API_KEY);
      logger.logFallback('session-3', 'API_ERROR');
      const logged = warnSpy.mock.calls[0][0] as string;
      expect(logged).not.toContain(FAKE_API_KEY);
    });

    it('throws if a log message would contain the API key', () => {
      const logger = new MurfLogger(FAKE_API_KEY);
      // Directly test the guard by passing the key as a field value
      // (e.g. if someone accidentally passes the key as a sessionId)
      expect(() => {
        logger.logFallback(FAKE_API_KEY, 'reason');
      }).toThrow('[MurfLogger] SECURITY');
    });
  });
});
