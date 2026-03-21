// Feature: wellflow-voice-wellness-assistant
// VoiceSelector: browse, filter, preview, and assign Murf AI voices (Requirements 12.1–12.11)

import { ActivityType, MurfVoice, VoiceFilter, VoiceProfile } from '../types';
import { ProfileStore } from '../store/ProfileStore';
import { WebSocketManager, TTSRequest } from './WebSocketManager';
import { RateLimiterInterface } from './RateLimiter';

export interface VoiceSelectorCallbacks {
  onPreviewError: (voiceId: string, message: string) => void;
}

export class VoiceSelector {
  private voiceProfile: VoiceProfile = {
    activityAssignments: {},
    fallbackVoiceId: null,
  };

  private availableVoices: MurfVoice[];
  private sessionLanguage: string = 'en';
  private initialised: boolean = false;

  constructor(
    private readonly profileStore: ProfileStore,
    private readonly wsManager: WebSocketManager,
    private readonly rateLimiter: RateLimiterInterface,
    private readonly callbacks: VoiceSelectorCallbacks,
    initialVoices: MurfVoice[] = [],
    private readonly fetchFn: typeof fetch = fetch,
  ) {
    this.availableVoices = initialVoices;
  }

  /**
   * Fetches the voice catalogue from /api/murf/voices and caches it in memory.
   * Idempotent — subsequent calls are no-ops.
   * Requirements: 5.1, 5.3, 5.4, 6.3
   */
  async initialise(language: string): Promise<void> {
    if (this.initialised) return;
    this.initialised = true;
    this.sessionLanguage = language;

    try {
      const response = await this.fetchFn('/api/murf/voices');
      if (!response.ok) {
        throw new Error(`Voice catalogue fetch failed with status ${response.status}`);
      }
      const voices: MurfVoice[] = await response.json();
      this.availableVoices = voices;
    } catch (err) {
      this.availableVoices = [];
      const message = err instanceof Error ? err.message : 'Failed to fetch voice catalogue';
      this.callbacks.onPreviewError('', `Voice catalogue unavailable: ${message}`);
    }
  }

  /**
   * Returns voices matching ALL supplied filter fields.
   * Requirement 12.1, 12.2.
   */
  async listVoices(filters?: VoiceFilter): Promise<MurfVoice[]> {
    if (!filters) return [...this.availableVoices];

    return this.availableVoices.filter((voice) => {
      if (filters.name !== undefined && !voice.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
      if (filters.accent !== undefined && voice.accent.toLowerCase() !== filters.accent.toLowerCase()) return false;
      if (filters.gender !== undefined && voice.gender !== filters.gender) return false;
      if (filters.style !== undefined && voice.style.toLowerCase() !== filters.style.toLowerCase()) return false;
      return true;
    });
  }

  /**
   * Plays a short audio sample via Murf Falcon TTS API.
   * Requirement 12.3: must start within 2 seconds.
   * Requirement 12.4: on error, emit notification and do not throw.
   */
  async previewVoice(voiceId: string): Promise<void> {
    await this.rateLimiter.acquire();
    try {
      const sessionId = `preview-${voiceId}`;
      if (!this.wsManager.isConnected(sessionId)) {
        await this.wsManager.connect(sessionId);
      }
      const payload: TTSRequest = {
        sessionId,
        text: 'Hello, this is a preview of this voice.',
        voiceId,
        language: this.sessionLanguage,
        speed: 'normal',
      };
      this.wsManager.send(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Preview unavailable';
      this.callbacks.onPreviewError(voiceId, message);
    } finally {
      this.rateLimiter.release();
    }
  }

  /**
   * Stores an activity-to-voice mapping in the in-memory VoiceProfile.
   * Requirement 12.5.
   */
  assignVoice(activityType: ActivityType, voiceId: string): void {
    this.voiceProfile.activityAssignments[activityType] = voiceId;
  }

  /**
   * Stores the fallback voice in the in-memory VoiceProfile.
   * Requirement 12.6.
   */
  setFallbackVoice(voiceId: string): void {
    this.voiceProfile.fallbackVoiceId = voiceId;
  }

  /**
   * Returns the assigned voiceId for the activity, or null if none set.
   * Requirement 12.7.
   */
  getVoiceForActivity(activityType: ActivityType): string | null {
    return this.voiceProfile.activityAssignments[activityType] ?? null;
  }

  /**
   * Reads the persisted VoiceProfile from the profile store and applies it.
   * Requirement 12.11.
   */
  async loadVoiceProfile(userId: string): Promise<void> {
    const profile = this.profileStore.getProfile(userId);
    if (profile?.voiceProfile) {
      this.voiceProfile = {
        activityAssignments: { ...profile.voiceProfile.activityAssignments },
        fallbackVoiceId: profile.voiceProfile.fallbackVoiceId,
      };
    }
  }

  /**
   * Persists the current in-memory VoiceProfile to the profile store.
   * Requirement 12.10.
   */
  async saveVoiceProfile(userId: string): Promise<void> {
    this.profileStore.upsertProfile(userId, {
      voiceProfile: {
        activityAssignments: { ...this.voiceProfile.activityAssignments },
        fallbackVoiceId: this.voiceProfile.fallbackVoiceId,
      },
    });
  }

  /** Returns the current in-memory VoiceProfile (for testing/inspection). */
  getCurrentProfile(): VoiceProfile {
    return { ...this.voiceProfile, activityAssignments: { ...this.voiceProfile.activityAssignments } };
  }
}
