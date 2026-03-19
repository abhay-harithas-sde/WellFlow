// Feature: wellflow-voice-wellness-assistant
// PersonalizationEngine: generates proactive activity suggestions (Requirements 18.1–18.8)

import {
  ActivitySuggestion,
  SuggestionFeedback,
  PersonalizationContext,
  PersonalizationProfile,
  ActivityWeight,
  SuggestionActivityType,
  WearableReading,
  BiometricSnapshot,
} from '../types';
import { ProfileStore } from '../store/ProfileStore';

const DEFAULT_MIN_CONFIDENCE = 0.3;
const COLD_START_THRESHOLD = 3;
const STRESS_SPIKE_THRESHOLD = 0.2; // 20% above baseline

const ACTIVITY_TYPES: SuggestionActivityType[] = [
  'BREATHING_EXERCISE',
  'MINDFULNESS_SESSION',
  'STRESS_RELIEF',
];

export class PersonalizationEngine {
  private profiles: Map<string, PersonalizationProfile> = new Map();

  constructor(private readonly profileStore: ProfileStore) {}

  /**
   * Suggests an activity based on session history, biometrics, and context.
   * Falls back to time-of-day defaults when fewer than 3 sessions exist.
   * Requirements: 18.1, 18.3, 18.4, 18.5, 18.7
   */
  async suggestActivity(context: PersonalizationContext): Promise<ActivitySuggestion | null> {
    const history = this.profileStore.getSessionHistory(context.userId);

    if (history.length < COLD_START_THRESHOLD) {
      return this._coldStartSuggestion(context.currentHour);
    }

    const profile = this._getOrCreateProfile(context.userId);
    const scores = this._computeScores(profile, context.currentHour);

    const best = scores.reduce((a, b) => (a.score > b.score ? a : b));
    const minThreshold = profile.minConfidenceThreshold;

    if (best.score < minThreshold) return null; // Req 18.5

    return {
      activityType: best.activityType,
      confidence: Math.min(best.score, 1.0),
      rationale: `You often do ${best.activityType.toLowerCase().replace(/_/g, ' ')} at this hour.`,
      triggeredBy: 'SESSION_OPEN',
    };
  }

  /**
   * Detects a stress spike from wearable readings and suggests an activity.
   * Requirement 18.2
   */
  async detectStressSpike(reading: WearableReading, userId: string): Promise<ActivitySuggestion | null> {
    const history = this.profileStore.getSessionHistory(userId);
    if (history.length === 0) return null;

    // Compute baseline from last 5 sessions' biometric data (simplified: use stress ratings)
    const recentRatings = history
      .slice(-5)
      .map((s) => s.averageStressRating)
      .filter((r): r is number => r !== null);

    if (recentRatings.length === 0) return null;

    const baseline = recentRatings.reduce((s, r) => s + r, 0) / recentRatings.length;

    // Normalize stress score (0-100) to 1-5 scale for comparison
    const normalizedStress = reading.stressScore !== null ? (reading.stressScore / 100) * 5 : null;
    const normalizedHr = reading.heartRateBpm !== null ? reading.heartRateBpm / 20 : null; // rough normalization

    const stressSpiked = normalizedStress !== null && normalizedStress > baseline * (1 + STRESS_SPIKE_THRESHOLD);
    const hrSpiked = normalizedHr !== null && normalizedHr > baseline * (1 + STRESS_SPIKE_THRESHOLD);

    if (!stressSpiked && !hrSpiked) return null;

    const activityType: SuggestionActivityType = stressSpiked ? 'STRESS_RELIEF' : 'BREATHING_EXERCISE';

    return {
      activityType,
      confidence: 0.8,
      rationale: 'Your stress indicators are elevated. A wellness activity may help.',
      triggeredBy: 'STRESS_SPIKE',
    };
  }

  /**
   * Records user feedback and adjusts activity weights.
   * Requirement 18.6
   */
  async recordFeedback(feedback: SuggestionFeedback): Promise<void> {
    const profile = this._getOrCreateProfile(feedback.userId);
    profile.feedbackHistory.push(feedback);

    const weight = profile.activityWeights.find((w) => w.activityType === feedback.activityType);
    if (weight) {
      weight.feedbackScore += feedback.signal === 'ACCEPTED' ? 1 : -1;
    }

    profile.lastUpdated = new Date();
    this.profiles.set(feedback.userId, profile);
  }

  /**
   * Recomputes activityWeights from the user's session history.
   * For each SuggestionActivityType, computes:
   *   - stressReductionScore: mean of averageStressRating across sessions of that type (proxy for reduction)
   *   - timeOfDayScores: 24-element array counting sessions started at each hour
   *   - feedbackScore: sum of +1 for ACCEPTED, -1 for DISMISSED from feedbackHistory
   * Requirements: 18.3, 18.4
   */
  async recomputeActivityWeights(userId: string): Promise<void> {
    const history = this.profileStore.getSessionHistory(userId);
    const profile = this._getOrCreateProfile(userId);

    // Map from SuggestionActivityType to the ActivityRecord activityType prefix
    const activityTypeMap: Record<SuggestionActivityType, string> = {
      BREATHING_EXERCISE: 'BREATHING',
      MINDFULNESS_SESSION: 'MINDFULNESS',
      STRESS_RELIEF: 'STRESS_RELIEF',
    };

    for (const suggestionType of ACTIVITY_TYPES) {
      const activityKey = activityTypeMap[suggestionType];

      // Collect sessions that include this activity type
      const matchingSessions = history.filter((s) =>
        s.activitiesCompleted.some((a) => a.activityType === activityKey),
      );

      // stressReductionScore: mean of averageStressRating (proxy; higher rating = more stress reduced)
      const ratingsWithValues = matchingSessions
        .map((s) => s.averageStressRating)
        .filter((r): r is number => r !== null);
      const stressReductionScore =
        ratingsWithValues.length > 0
          ? ratingsWithValues.reduce((sum, r) => sum + r, 0) / ratingsWithValues.length
          : 0;

      // timeOfDayScores: 24-element array counting sessions started at each hour
      const timeOfDayScores = new Array<number>(24).fill(0);
      for (const s of matchingSessions) {
        const hour = s.startTime.getHours();
        timeOfDayScores[hour]++;
      }

      // feedbackScore: sum of +1 ACCEPTED / -1 DISMISSED from feedbackHistory for this type
      const feedbackScore = profile.feedbackHistory
        .filter((f) => f.activityType === suggestionType)
        .reduce((sum, f) => sum + (f.signal === 'ACCEPTED' ? 1 : -1), 0);

      const weight = profile.activityWeights.find((w) => w.activityType === suggestionType);
      if (weight) {
        weight.stressReductionScore = stressReductionScore;
        weight.timeOfDayScores = timeOfDayScores;
        weight.feedbackScore = feedbackScore;
      }
    }

    profile.lastUpdated = new Date();
    this.profiles.set(userId, profile);
    this.profileStore.savePersonalizationProfile(profile);
  }

  /**
   * Returns the minimum confidence threshold for the user.
   * Requirement 18.5
   */
  getMinConfidenceThreshold(userId: string): number {
    return this._getOrCreateProfile(userId).minConfidenceThreshold;
  }

  /**
   * Sets the minimum confidence threshold for the user.
   * Requirement 18.5
   */
  async setMinConfidenceThreshold(userId: string, threshold: number): Promise<void> {
    const profile = this._getOrCreateProfile(userId);
    profile.minConfidenceThreshold = threshold;
    this.profiles.set(userId, profile);
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  private _coldStartSuggestion(currentHour: number): ActivitySuggestion {
    let activityType: SuggestionActivityType;
    if (currentHour >= 5 && currentHour <= 11) {
      activityType = 'BREATHING_EXERCISE';
    } else if (currentHour >= 18 && currentHour <= 23) {
      activityType = 'MINDFULNESS_SESSION';
    } else {
      activityType = 'STRESS_RELIEF';
    }

    return {
      activityType,
      confidence: 0.5,
      rationale: `A ${activityType.toLowerCase().replace(/_/g, ' ')} is recommended for this time of day.`,
      triggeredBy: 'SESSION_OPEN',
    };
  }

  private _computeScores(
    profile: PersonalizationProfile,
    currentHour: number,
  ): Array<{ activityType: SuggestionActivityType; score: number }> {
    return ACTIVITY_TYPES.map((activityType) => {
      const weight = profile.activityWeights.find((w) => w.activityType === activityType);
      if (!weight) return { activityType, score: 0 };

      const stressScore = Math.max(0, weight.stressReductionScore) / 5; // normalize to 0-1
      const timeScore = (weight.timeOfDayScores[currentHour] ?? 0) / 10; // normalize
      const feedbackScore = Math.max(0, weight.feedbackScore) / 10; // normalize

      const combined = (stressScore * 0.4 + timeScore * 0.4 + feedbackScore * 0.2);
      return { activityType, score: Math.min(combined, 1.0) };
    });
  }

  private _getOrCreateProfile(userId: string): PersonalizationProfile {
    if (!this.profiles.has(userId)) {
      // Try to load from the persistent store first
      const persisted = this.profileStore.getPersonalizationProfile(userId);
      if (persisted) {
        this.profiles.set(userId, persisted);
      } else {
        this.profiles.set(userId, {
          userId,
          activityWeights: ACTIVITY_TYPES.map((activityType) => ({
            activityType,
            stressReductionScore: 0,
            timeOfDayScores: new Array(24).fill(0),
            feedbackScore: 0,
          })),
          feedbackHistory: [],
          minConfidenceThreshold: DEFAULT_MIN_CONFIDENCE,
          lastUpdated: new Date(),
        });
      }
    }
    return this.profiles.get(userId)!;
  }
}
