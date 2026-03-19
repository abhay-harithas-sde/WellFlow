// Feature: wellflow-voice-wellness-assistant
// ProfileStore: in-memory store for UserProfile data

import { UserProfile, SessionSummary, PersonalizationProfile, WellnessGroup, SharedChallenge, CommunityFeedEvent } from '../types';

export class ProfileStore {
  private profiles: Map<string, UserProfile> = new Map();
  private personalizationProfiles: Map<string, PersonalizationProfile> = new Map();

  // Community data
  private groups: Map<string, WellnessGroup> = new Map();
  private challenges: Map<string, SharedChallenge> = new Map();
  private feedEvents: CommunityFeedEvent[] = [];
  private anonymizedNames: Map<string, string> = new Map(); // userId → anonymized name
  private userGroups: Map<string, Set<string>> = new Map(); // userId → groupIds

  getProfile(userId: string): UserProfile | null {
    return this.profiles.get(userId) ?? null;
  }

  saveProfile(profile: UserProfile): void {
    this.profiles.set(profile.userId, { ...profile });
  }

  upsertProfile(userId: string, update: Partial<UserProfile>): UserProfile {
    const existing = this.profiles.get(userId);
    const base: UserProfile = existing ?? {
      userId,
      name: '',
      preferredLanguage: 'en',
      ttsSpeed: 'normal',
      sessionHistory: [],
      voiceProfile: { activityAssignments: {}, fallbackVoiceId: null },
    };
    const updated: UserProfile = { ...base, ...update, userId };
    this.profiles.set(userId, updated);
    return updated;
  }

  appendSessionSummary(userId: string, summary: SessionSummary): void {
    const profile = this.upsertProfile(userId, {});
    profile.sessionHistory = [...profile.sessionHistory, summary];
    this.profiles.set(userId, profile);
  }

  /** Returns all session summaries for a user, sorted by startTime ascending */
  getSessionHistory(userId: string): SessionSummary[] {
    const profile = this.profiles.get(userId);
    if (!profile) return [];
    return [...profile.sessionHistory].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );
  }

  /** Persists a PersonalizationProfile for a user */
  savePersonalizationProfile(profile: PersonalizationProfile): void {
    this.personalizationProfiles.set(profile.userId, { ...profile });
  }

  /** Retrieves the persisted PersonalizationProfile for a user, or null if not found */
  getPersonalizationProfile(userId: string): PersonalizationProfile | null {
    return this.personalizationProfiles.get(userId) ?? null;
  }

  // ------------------------------------------------------------------
  // Community data persistence
  // ------------------------------------------------------------------

  saveGroup(group: WellnessGroup): void {
    this.groups.set(group.groupId, { ...group, memberIds: [...group.memberIds] });
  }

  getGroup(groupId: string): WellnessGroup | null {
    return this.groups.get(groupId) ?? null;
  }

  getAllGroups(): WellnessGroup[] {
    return Array.from(this.groups.values());
  }

  saveChallenge(challenge: SharedChallenge): void {
    this.challenges.set(challenge.challengeId, {
      ...challenge,
      optedInMemberIds: [...challenge.optedInMemberIds],
      completionLog: { ...challenge.completionLog },
    });
  }

  getChallenge(challengeId: string): SharedChallenge | null {
    return this.challenges.get(challengeId) ?? null;
  }

  appendFeedEvent(event: CommunityFeedEvent): void {
    this.feedEvents.push({ ...event });
  }

  getFeedEvents(): CommunityFeedEvent[] {
    return [...this.feedEvents];
  }

  saveAnonymizedName(userId: string, name: string): void {
    this.anonymizedNames.set(userId, name);
  }

  getAnonymizedName(userId: string): string | null {
    return this.anonymizedNames.get(userId) ?? null;
  }

  saveUserGroups(userId: string, groupIds: Set<string>): void {
    this.userGroups.set(userId, new Set(groupIds));
  }

  getUserGroups(userId: string): Set<string> {
    return new Set(this.userGroups.get(userId) ?? []);
  }

  clear(): void {
    this.profiles.clear();
    this.personalizationProfiles.clear();
    this.groups.clear();
    this.challenges.clear();
    this.feedEvents = [];
    this.anonymizedNames.clear();
    this.userGroups.clear();
  }
}
