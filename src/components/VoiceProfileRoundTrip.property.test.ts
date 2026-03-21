// Feature: murf-ai-voice-integration, Property 14: VoiceProfile JSON round-trip is lossless
// Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5

import * as fc from 'fast-check';
import { ActivityType, VoiceProfile } from '../types';

const ACTIVITY_TYPES: ActivityType[] = [
  'BREATHING_EXERCISE',
  'MINDFULNESS_SESSION',
  'STRESS_RELIEF',
  'ROUTINE_REMINDER',
];

/**
 * Property 14: VoiceProfile JSON round-trip is lossless
 *
 * For any VoiceProfile value (including all combinations of activity assignments
 * and fallback voice IDs), serialising to JSON and deserialising back must produce
 * a value that is deeply equal to the original.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */
describe('Property 14: VoiceProfile JSON round-trip is lossless', () => {
  it('JSON.stringify then JSON.parse produces a deeply equal VoiceProfile', () => {
    // Arbitrary for activityAssignments: a partial record of ActivityType → voiceId string
    const activityAssignmentsArb = fc.record(
      Object.fromEntries(
        ACTIVITY_TYPES.map((at) => [at, fc.option(fc.string({ minLength: 1 }), { nil: undefined })])
      ) as Record<ActivityType, fc.Arbitrary<string | undefined>>,
    ).map((rec) => {
      // Remove undefined entries to produce a Partial<Record<ActivityType, string>>
      const result: Partial<Record<ActivityType, string>> = {};
      for (const [key, value] of Object.entries(rec)) {
        if (value !== undefined) {
          result[key as ActivityType] = value as string;
        }
      }
      return result;
    });

    const voiceProfileArb: fc.Arbitrary<VoiceProfile> = fc.record({
      activityAssignments: activityAssignmentsArb,
      fallbackVoiceId: fc.option(fc.string({ minLength: 1 }), { nil: null }),
    });

    fc.assert(
      fc.property(voiceProfileArb, (profile) => {
        const serialised = JSON.stringify(profile);
        const deserialised: VoiceProfile = JSON.parse(serialised);

        // fallbackVoiceId must survive the round-trip
        expect(deserialised.fallbackVoiceId).toStrictEqual(profile.fallbackVoiceId);

        // activityAssignments keys and values must survive the round-trip
        const originalKeys = Object.keys(profile.activityAssignments).sort();
        const deserialisedKeys = Object.keys(deserialised.activityAssignments).sort();
        expect(deserialisedKeys).toEqual(originalKeys);

        for (const key of originalKeys) {
          expect(deserialised.activityAssignments[key as ActivityType]).toBe(
            profile.activityAssignments[key as ActivityType],
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  it('round-trip preserves an empty activityAssignments object', () => {
    const profile: VoiceProfile = { activityAssignments: {}, fallbackVoiceId: null };
    const deserialised: VoiceProfile = JSON.parse(JSON.stringify(profile));
    expect(deserialised).toStrictEqual(profile);
  });

  it('round-trip preserves all four activity assignments simultaneously', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.option(fc.string({ minLength: 1 }), { nil: null }),
        (breathing, mindfulness, stress, reminder, fallback) => {
          const profile: VoiceProfile = {
            activityAssignments: {
              BREATHING_EXERCISE: breathing,
              MINDFULNESS_SESSION: mindfulness,
              STRESS_RELIEF: stress,
              ROUTINE_REMINDER: reminder,
            },
            fallbackVoiceId: fallback,
          };
          const deserialised: VoiceProfile = JSON.parse(JSON.stringify(profile));
          expect(deserialised).toStrictEqual(profile);
        },
      ),
      { numRuns: 100 },
    );
  });
});
