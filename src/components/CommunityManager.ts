// Feature: wellflow-voice-wellness-assistant
// CommunityManager: manages wellness groups, shared challenges, and community feeds (Requirements 20.1–20.10)

import {
  WellnessGroup,
  SharedChallenge,
  CommunityFeedEvent,
} from '../types';
import { ProfileStore } from '../store';

const MAX_MEMBERS_PER_GROUP = 20;
const MAX_GROUPS_PER_USER = 5;

export interface CommunityManagerCallbacks {
  onMemberJoined: (groupId: string, userId: string) => void;
  onChallengeFinalized: (challenge: SharedChallenge, completionRate: number) => void;
  onNamePromptRequired: (userId: string) => void;
  /** Called to deliver a TTS announcement to a specific user (Req 20.6) */
  onAnnouncement?: (userId: string, text: string) => void;
}

export class CommunityManager {
  // In-memory working state — kept in sync with ProfileStore
  private groups: Map<string, WellnessGroup> = new Map();
  private challenges: Map<string, SharedChallenge> = new Map();
  private feedEvents: CommunityFeedEvent[] = [];
  private anonymizedNames: Map<string, string> = new Map();
  private userGroups: Map<string, Set<string>> = new Map();

  constructor(
    private readonly callbacks?: CommunityManagerCallbacks,
    private readonly store?: ProfileStore,
  ) {
    if (store) {
      this._loadFromStore();
    }
  }

  /**
   * Creates a new WellnessGroup.
   * Requirement 20.1
   */
  async createGroup(userId: string, name: string): Promise<WellnessGroup> {
    this._enforceGroupCap(userId);

    const groupId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const groupCode = Math.random().toString(36).slice(2, 8).toUpperCase();

    const group: WellnessGroup = {
      groupId,
      groupCode,
      name,
      memberIds: [userId],
      createdAt: new Date(),
    };

    this.groups.set(groupId, group);
    this._addUserToGroup(userId, groupId);
    this.store?.saveGroup(group);
    this.store?.saveUserGroups(userId, this.userGroups.get(userId)!);
    return group;
  }

  /**
   * Joins a group by group code.
   * Requirement 20.1, 20.9
   */
  async joinGroup(userId: string, groupCode: string): Promise<WellnessGroup> {
    const group = Array.from(this.groups.values()).find((g) => g.groupCode === groupCode);
    if (!group) throw new Error(`Group with code ${groupCode} not found`);

    if (group.memberIds.includes(userId)) return group;

    if (group.memberIds.length >= MAX_MEMBERS_PER_GROUP) {
      throw new Error(`Group ${group.name} is at capacity (${MAX_MEMBERS_PER_GROUP} members)`);
    }

    this._enforceGroupCap(userId);

    group.memberIds.push(userId);
    this._addUserToGroup(userId, group.groupId);
    this.store?.saveGroup(group);
    this.store?.saveUserGroups(userId, this.userGroups.get(userId)!);
    this.callbacks?.onMemberJoined(group.groupId, userId);
    return group;
  }

  /**
   * Removes a user from a group.
   * Requirement 20.8
   */
  async leaveGroup(userId: string, groupId: string): Promise<void> {
    const group = this.groups.get(groupId);
    if (!group) return;

    group.memberIds = group.memberIds.filter((id) => id !== userId);
    this.userGroups.get(userId)?.delete(groupId);
    this.store?.saveGroup(group);
    this.store?.saveUserGroups(userId, this.userGroups.get(userId) ?? new Set());
  }

  /**
   * Publishes an anonymized activity event to all groups the user belongs to.
   * Requirement 20.3, 20.7, 20.10
   */
  async publishActivityEvent(
    userId: string,
    activityType: CommunityFeedEvent['activityType'],
  ): Promise<void> {
    const anonymizedName = this.anonymizedNames.get(userId);
    if (!anonymizedName) {
      // Req 20.10: prompt user to set name before publishing
      this.callbacks?.onNamePromptRequired(userId);
      return;
    }

    const userGroupIds = this.userGroups.get(userId) ?? new Set();
    for (const groupId of userGroupIds) {
      const event: CommunityFeedEvent = {
        eventId: `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        groupId,
        anonymizedName,
        activityType,
        occurredAt: new Date(),
      };
      this.feedEvents.push(event);
      this.store?.appendFeedEvent(event);
    }
  }

  /**
   * Returns the most recent feed events from all groups the user belongs to.
   * Requirement 20.4
   */
  async getFeed(userId: string, limit: number): Promise<CommunityFeedEvent[]> {
    const userGroupIds = this.userGroups.get(userId) ?? new Set();
    return this.feedEvents
      .filter((e) => userGroupIds.has(e.groupId))
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, limit);
  }

  /**
   * Creates a SharedChallenge for a group.
   * Requirement 20.5
   */
  async createChallenge(
    userId: string,
    groupId: string,
    activityType: SharedChallenge['activityType'],
    durationDays: number,
  ): Promise<SharedChallenge> {
    const group = this.groups.get(groupId);
    if (!group || !group.memberIds.includes(userId)) {
      throw new Error('User is not a member of this group');
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 86_400_000);

    const challenge: SharedChallenge = {
      challengeId: `challenge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      groupId,
      activityType,
      durationDays,
      startDate,
      endDate,
      status: 'ACTIVE',
      optedInMemberIds: [],
      completionLog: {},
    };

    this.challenges.set(challenge.challengeId, challenge);
    this.store?.saveChallenge(challenge);
    return challenge;
  }

  /**
   * Opts a user into a challenge.
   * Requirement 20.5
   */
  async optInToChallenge(userId: string, challengeId: string): Promise<void> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) throw new Error('Challenge not found');
    if (!challenge.optedInMemberIds.includes(userId)) {
      challenge.optedInMemberIds.push(userId);
      this.store?.saveChallenge(challenge);
    }
  }

  /**
   * Records a daily completion for a user in a challenge.
   * Requirement 20.5
   */
  async recordChallengeCompletion(userId: string, challengeId: string): Promise<void> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge || !challenge.optedInMemberIds.includes(userId)) return;

    const anonymizedName = this.anonymizedNames.get(userId) ?? userId;
    if (!challenge.completionLog[anonymizedName]) {
      challenge.completionLog[anonymizedName] = [];
    }
    challenge.completionLog[anonymizedName].push(new Date());
    this.store?.saveChallenge(challenge);
  }

  /**
   * Finalizes a challenge, computes completion rates, and triggers TTS announcements.
   * Requirement 20.6
   */
  async finalizeChallenge(challengeId: string): Promise<SharedChallenge> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) throw new Error('Challenge not found');

    challenge.status = 'COMPLETED';

    const totalOptedIn = challenge.optedInMemberIds.length;
    const completedCount = Object.keys(challenge.completionLog).length;
    const completionRate = totalOptedIn > 0 ? completedCount / totalOptedIn : 0;

    // Build announcement text (Req 20.6)
    const completedNames = Object.keys(challenge.completionLog);
    const completedPct = Math.round(completionRate * 100);
    const announcementText =
      `Challenge complete! ${completedNames.length} out of ${totalOptedIn} members finished. ` +
      `Group completion rate: ${completedPct}%.` +
      (completedNames.length > 0
        ? ` Congratulations to: ${completedNames.join(', ')}.`
        : '');

    // Trigger TTS announcement to all opted-in members (Req 20.6)
    if (this.callbacks?.onAnnouncement) {
      for (const memberId of challenge.optedInMemberIds) {
        this.callbacks.onAnnouncement(memberId, announcementText);
      }
    }

    this.store?.saveChallenge(challenge);
    this.callbacks?.onChallengeFinalized(challenge, completionRate);
    return challenge;
  }

  /**
   * Returns the anonymized name for a user.
   * Requirement 20.7
   */
  getAnonymizedName(userId: string): string | null {
    return this.anonymizedNames.get(userId) ?? null;
  }

  /**
   * Sets the anonymized name for a user.
   * Requirement 20.10
   */
  async setAnonymizedName(userId: string, name: string): Promise<void> {
    this.anonymizedNames.set(userId, name);
    this.store?.saveAnonymizedName(userId, name);
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  private _enforceGroupCap(userId: string): void {
    const count = this.userGroups.get(userId)?.size ?? 0;
    if (count >= MAX_GROUPS_PER_USER) {
      throw new Error(`User has reached the maximum of ${MAX_GROUPS_PER_USER} groups`);
    }
  }

  private _addUserToGroup(userId: string, groupId: string): void {
    if (!this.userGroups.has(userId)) {
      this.userGroups.set(userId, new Set());
    }
    this.userGroups.get(userId)!.add(groupId);
  }

  /** Load persisted community data from the store on construction */
  private _loadFromStore(): void {
    if (!this.store) return;

    for (const group of this.store.getAllGroups()) {
      this.groups.set(group.groupId, { ...group, memberIds: [...group.memberIds] });
      for (const memberId of group.memberIds) {
        this._addUserToGroup(memberId, group.groupId);
      }
    }

    for (const event of this.store.getFeedEvents()) {
      this.feedEvents.push({ ...event });
    }
  }
}
