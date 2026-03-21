// Feature: murf-ai-voice-integration
// TTSEngine: submits text to Murf AI TTS API via RateLimiter and WebSocketManager,
// streams audio in real time, retries once on non-auth errors, falls back to on-screen text.
// Requirements: 2.3, 2.4, 3.3, 3.4, 3.5, 3.6, 9.1, 9.2, 9.3, 10.4, 11.3, 12.7, 12.8, 12.9, 13.1, 13.4

import { TTSOptions, ActivityType } from '../types';
import { RateLimiterInterface } from './RateLimiter';
import { WebSocketManager, TTSRequest } from './WebSocketManager';

// Supported languages — only en and es (Req 9.1, 9.2, 9.3)
const SUPPORTED_LANGUAGES = new Set(['en', 'es']);

// Language mapping: locale → Murf API language code (Req 3.3, 9.1, 9.2)
const LANGUAGE_MAP: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
};

// Sentinel error type for auth failures (HTTP 401/403) — non-retryable (Req 2.3, 2.4)
export class AuthError extends Error {
  constructor(public readonly statusCode: number) {
    super(`Auth error: HTTP ${statusCode}`);
    this.name = 'AuthError';
  }
}

/** Logger interface injected into TTSEngine for server-side observability (Req 13.1, 13.4) */
export interface TTSLogger {
  logApiError(statusCode: number, requestType: string, sessionId: string, timestamp: string): void;
  logFallback(sessionId: string, reason: string): void;
}

export interface TTSEngineCallbacks {
  /** Called when the TTS API fails twice — display text on screen instead (Req 3.6) */
  onTextFallback: (text: string) => void;
  /** Called when the requested language is unsupported and we fall back to 'en-US' (Req 9.3) */
  onUnsupportedLanguage: (language: string) => void;
  /** Called when Murf API returns HTTP 401 or 403 (Req 2.3) */
  onAuthError?: (statusCode: number) => void;
}

/** Minimal interface for voice resolution — avoids circular dependency with VoiceSelector */
export interface VoiceResolverInterface {
  getVoiceForActivity(activityType: ActivityType): string | null;
  getCurrentProfile(): { fallbackVoiceId: string | null };
}

const SYSTEM_DEFAULT_VOICE_ID = 'murf-default';
const RATE_LIMITER_TIMEOUT_MS = 10_000;

export class TTSEngine {
  private defaultSpeed: 'slow' | 'normal' | 'fast' = 'normal';

  constructor(
    private readonly rateLimiter: RateLimiterInterface,
    private readonly wsManager: WebSocketManager,
    private readonly callbacks: TTSEngineCallbacks,
    private readonly voiceResolver?: VoiceResolverInterface,
    private readonly logger?: TTSLogger,
  ) {}

  /**
   * Adjusts the default TTS playback speed for all subsequent requests (Req 11.3).
   */
  setSpeed(speed: 'slow' | 'normal' | 'fast'): void {
    this.defaultSpeed = speed;
  }

  /**
   * Submits text to the Murf AI TTS API and streams audio in real time.
   * - Acquires a rate-limiter slot (with 10s timeout) before sending (Req 10.4)
   * - Maps language locale to Murf API code (Req 3.3, 9.1, 9.2, 9.3)
   * - Retries once on non-auth errors; on second failure calls onTextFallback (Req 3.6)
   * - Auth errors (401/403) are non-retryable: fires onAuthError + onTextFallback (Req 2.3, 2.4)
   * - Rate-limit timeout fires onTextFallback (Req 10.4)
   */
  async speak(text: string, options: TTSOptions, activityType?: ActivityType): Promise<void> {
    // Resolve language — fall back to 'en-US' if unsupported (Req 9.3)
    let mappedLanguage: string;
    if (!SUPPORTED_LANGUAGES.has(options.language)) {
      this.callbacks.onUnsupportedLanguage(options.language);
      mappedLanguage = 'en-US';
    } else {
      mappedLanguage = LANGUAGE_MAP[options.language];
    }

    // Apply default speed when the caller doesn't override it
    const speed = options.speed ?? this.defaultSpeed;

    // Resolve voiceId (Req 12.7, 12.8, 12.9)
    const voiceId = options.voiceId ?? this._resolveVoiceId(activityType);

    const payload: TTSRequest = {
      sessionId: options.sessionId,
      text,
      language: mappedLanguage,
      speed,
      voiceId,
    };

    // Attempt 1 — handle rate-limit timeout separately (Req 10.4)
    let firstResult: 'success' | 'auth-error' | 'error';
    try {
      firstResult = await this._attemptSpeak(payload);
    } catch (err) {
      if (err instanceof Error && err.message === 'Rate limiter timeout') {
        // Rate-limit timeout — log and fall back immediately (Req 10.4, 13.4)
        this.logger?.logFallback(options.sessionId, 'RATE_LIMIT_TIMEOUT');
        this.callbacks.onTextFallback(text);
        return;
      }
      firstResult = 'error';
    }

    if (firstResult === 'success') return;

    if (firstResult === 'auth-error') {
      // Non-retryable — already handled inside _attemptSpeak
      return;
    }

    // Retry once (Req 3.6) — also handle rate-limit timeout on retry
    let secondResult: 'success' | 'auth-error' | 'error';
    try {
      secondResult = await this._attemptSpeak(payload);
    } catch (err) {
      if (err instanceof Error && err.message === 'Rate limiter timeout') {
        this.logger?.logFallback(options.sessionId, 'RATE_LIMIT_TIMEOUT');
        this.callbacks.onTextFallback(text);
        return;
      }
      secondResult = 'error';
    }

    if (secondResult === 'success') return;
    if (secondResult === 'auth-error') return;

    // Both attempts failed — emit text to UI (Req 3.6, 13.4)
    this.logger?.logFallback(options.sessionId, 'API_ERROR');
    this.callbacks.onTextFallback(text);
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  /**
   * Resolves voiceId using priority:
   * 1. Activity voice assignment (if activityType provided)
   * 2. Fallback voice from VoiceProfile
   * 3. System default voice ID
   * Requirements: 12.7, 12.8, 12.9
   */
  private _resolveVoiceId(activityType?: ActivityType): string | undefined {
    if (!this.voiceResolver) return undefined;

    if (activityType) {
      const assigned = this.voiceResolver.getVoiceForActivity(activityType);
      if (assigned) return assigned;
    }

    const fallback = this.voiceResolver.getCurrentProfile().fallbackVoiceId;
    if (fallback) return fallback;

    return SYSTEM_DEFAULT_VOICE_ID;
  }

  /**
   * Acquires a rate-limiter slot (with 10s timeout), ensures the WebSocket is connected,
   * sends the payload, then releases the slot.
   * Returns 'success', 'auth-error', or 'error'.
   * Throws if the rate limiter times out (caller handles this).
   */
  private async _attemptSpeak(payload: TTSRequest): Promise<'success' | 'auth-error' | 'error'> {
    // acquire() throws 'Rate limiter timeout' if it times out — propagate to caller
    await this.rateLimiter.acquire(RATE_LIMITER_TIMEOUT_MS);
    try {
      // Ensure connection is open before sending (Req 4.1)
      if (!this.wsManager.isConnected(payload.sessionId)) {
        await this.wsManager.connect(payload.sessionId);
      }
      // Send the TTS request — audio streams back via onAudioChunk (Req 3.1, 3.2)
      this.wsManager.send(payload);
      return 'success';
    } catch (err) {
      if (err instanceof AuthError) {
        // Non-retryable auth failure (Req 2.3, 2.4, 13.1)
        this.logger?.logApiError(err.statusCode, 'TTS', payload.sessionId, new Date().toISOString());
        this.callbacks.onAuthError?.(err.statusCode);
        this.logger?.logFallback(payload.sessionId, `AUTH_ERROR_${err.statusCode}`);
        this.callbacks.onTextFallback(payload.text);
        return 'auth-error';
      }
      return 'error';
    } finally {
      this.rateLimiter.release();
    }
  }
}
