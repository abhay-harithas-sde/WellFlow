// Feature: murf-ai-voice-integration
// MurfLogger: server-side observability for Murf AI integration errors and fallback events.
// Requirements: 13.1, 13.2, 13.3, 13.4

import { TTSLogger } from '../src/components/TTSEngine';
import { WsLogger } from '../src/components/WebSocketManager';

/**
 * MurfLogger wraps console.error / console.warn and exposes typed log methods.
 * Each method asserts that the log output does not contain the MURF_API_KEY value (Req 13.3).
 *
 * Implements both TTSLogger and WsLogger so a single instance can be injected into
 * TTSEngine and WebSocketManager.
 */
export class MurfLogger implements TTSLogger, WsLogger {
  /**
   * @param apiKey - The Murf API key value. Used only to assert it never appears in logs.
   *                 Pass an empty string if the key is unavailable (e.g. in tests).
   */
  constructor(private readonly apiKey: string = '') {}

  /**
   * Logs a Murf API HTTP error (Req 13.1).
   * Output: console.error with status code, request type, session ID, and timestamp.
   */
  logApiError(statusCode: number, requestType: string, sessionId: string, timestamp: string): void {
    const message = `[MurfLogger] API error: status=${statusCode} type=${requestType} session=${sessionId} timestamp=${timestamp}`;
    this._assertNoKeyLeak(message);
    console.error(message);
  }

  /**
   * Logs a WebSocket connection error (Req 13.2).
   * Output: console.error with error code, reason, and session ID.
   */
  logWsError(code: number, reason: string, sessionId: string): void {
    const message = `[MurfLogger] WebSocket error: code=${code} reason=${reason} session=${sessionId}`;
    this._assertNoKeyLeak(message);
    console.error(message);
  }

  /**
   * Logs a text-fallback event (Req 13.4).
   * Output: console.warn with session ID and reason.
   */
  logFallback(sessionId: string, reason: string): void {
    const message = `[MurfLogger] Fallback: session=${sessionId} reason=${reason}`;
    this._assertNoKeyLeak(message);
    console.warn(message);
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  /**
   * Throws if the message contains the API key value (Req 13.3).
   * This is a defensive assertion — the log methods must never emit the key.
   */
  private _assertNoKeyLeak(message: string): void {
    if (this.apiKey && message.includes(this.apiKey)) {
      throw new Error(
        '[MurfLogger] SECURITY: attempted to log a message containing the API key. Logging suppressed.'
      );
    }
  }
}
