// Feature: wellflow-voice-wellness-assistant
// TTSEngine: submits text to Murf Falcon TTS API via RateLimiter and WebSocketManager,
// streams audio in real time, retries once on error, falls back to on-screen text.
// Requirements: 3.1, 3.2, 3.3, 3.6, 10.4, 11.3, 12.7, 12.8, 12.9

import { TTSOptions, ActivityType } from '../types';
import { RateLimiterInterface } from './RateLimiter';
import { WebSocketManager, TTSRequest } from './WebSocketManager';

// Supported languages — default to 'en' for anything outside this set (Req 10.4)
const SUPPORTED_LANGUAGES = new Set([
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh',
]);

export interface TTSEngineCallbacks {
  /** Called when the TTS API fails twice — display text on screen instead (Req 3.6) */
  onTextFallback: (text: string) => void;
  /** Called when the requested language is unsupported and we fall back to 'en' (Req 10.4) */
  onUnsupportedLanguage: (language: string) => void;
}

/** Minimal interface for voice resolution — avoids circular dependency with VoiceSelector */
export interface VoiceResolverInterface {
  getVoiceForActivity(activityType: ActivityType): string | null;
  getCurrentProfile(): { fallbackVoiceId: string | null };
}

const SYSTEM_DEFAULT_VOICE_ID = 'murf-default';

export class TTSEngine {
  private defaultSpeed: 'slow' | 'normal' | 'fast' = 'normal';

  constructor(
    private readonly rateLimiter: RateLimiterInterface,
    private readonly wsManager: WebSocketManager,
    private readonly callbacks: TTSEngineCallbacks,
    private readonly voiceResolver?: VoiceResolverInterface,
  ) {}

  /**
   * Adjusts the default TTS playback speed for all subsequent requests (Req 11.3).
   */
  setSpeed(speed: 'slow' | 'normal' | 'fast'): void {
    this.defaultSpeed = speed;
  }

  /**
   * Submits text to the Murf Falcon TTS API and streams audio in real time.
   * - Acquires a rate-limiter slot before sending (Req 3.4, 3.5)
   * - Sends via WebSocketManager without buffering full audio (Req 3.2)
   * - Retries once on API error; on second failure calls onTextFallback (Req 3.6)
   * - Applies language (defaulting to 'en' if unsupported) and speed (Req 3.3, 10.4, 11.3)
   * - Resolves voiceId via priority: activity assignment → fallback → system default (Req 12.7–12.9)
   */
  async speak(text: string, options: TTSOptions, activityType?: ActivityType): Promise<void> {
    // Resolve language — fall back to 'en' if unsupported (Req 10.4)
    let language = options.language;
    if (!SUPPORTED_LANGUAGES.has(language)) {
      this.callbacks.onUnsupportedLanguage(language);
      language = 'en';
    }

    // Apply default speed when the caller doesn't override it
    const speed = options.speed ?? this.defaultSpeed;

    // Resolve voiceId (Req 12.7, 12.8, 12.9)
    const voiceId = options.voiceId ?? this._resolveVoiceId(activityType);

    const payload: TTSRequest = {
      sessionId: options.sessionId,
      text,
      language,
      speed,
      voiceId,
    };

    // Attempt 1
    const firstAttemptSucceeded = await this._attemptSpeak(payload);
    if (firstAttemptSucceeded) return;

    // Retry once (Req 3.6)
    const secondAttemptSucceeded = await this._attemptSpeak(payload);
    if (secondAttemptSucceeded) return;

    // Both attempts failed — emit text to UI (Req 3.6)
    this.callbacks.onTextFallback(text);
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  /**
   * Resolves voiceId using priority:
   * 1. Activity_Voice_Assignment (if activityType provided)
   * 2. Fallback_Voice from VoiceProfile
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
   * Acquires a rate-limiter slot, ensures the WebSocket is connected,
   * sends the payload, then releases the slot.
   * Returns true on success, false on any error.
   */
  private async _attemptSpeak(payload: TTSRequest): Promise<boolean> {
    await this.rateLimiter.acquire();
    try {
      // Ensure connection is open before sending (Req 4.1)
      if (!this.wsManager.isConnected(payload.sessionId)) {
        await this.wsManager.connect(payload.sessionId);
      }
      // Send the TTS request — audio streams back via onAudioChunk (Req 3.1, 3.2)
      this.wsManager.send(payload);
      return true;
    } catch {
      return false;
    } finally {
      this.rateLimiter.release();
    }
  }
}
