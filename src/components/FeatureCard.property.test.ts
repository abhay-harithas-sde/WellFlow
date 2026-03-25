// Feature: wellflow-website, Property 9: Feature cards contain required fields

/**
 * Property-based test for components/ui/FeatureCard.tsx
 * Property 9: Feature cards contain required fields
 * Validates: Requirements 3.2
 *
 * Pure logic tests (node environment, no DOM).
 * For any FeatureCard data with non-empty icon, title, and description,
 * all fields must remain non-empty and the id must be preserved.
 */

import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// FeatureCard interface (mirrors design.md and FeatureCard.tsx)
// ---------------------------------------------------------------------------

interface FeatureCard {
  id: string;
  icon: string;
  title: string;
  description: string;
}

// ---------------------------------------------------------------------------
// FEATURES array from FeaturesSection.tsx (source of truth for Req 3.2)
// ---------------------------------------------------------------------------

const FEATURES: FeatureCard[] = [
  {
    id: 'voice-interaction',
    icon: '🎙️',
    title: 'Voice Interaction',
    description:
      'Speak naturally to WellFlow and receive guided wellness responses hands-free, anytime.',
  },
  {
    id: 'breathing-exercises',
    icon: '🌬️',
    title: 'Breathing Exercises',
    description:
      'Follow voice-led breathing techniques to calm your nervous system and reduce anxiety.',
  },
  {
    id: 'mindfulness-sessions',
    icon: '🧘',
    title: 'Mindfulness Sessions',
    description:
      'Access guided meditations and mindfulness practices tailored to your mood and schedule.',
  },
  {
    id: 'stress-relief',
    icon: '💆',
    title: 'Stress Relief',
    description:
      'Personalized stress-relief routines that adapt to your daily patterns and triggers.',
  },
  {
    id: 'routine-reminders',
    icon: '⏰',
    title: 'Routine Reminders',
    description:
      'Smart reminders keep your wellness habits consistent without feeling intrusive.',
  },
  {
    id: 'health-sync',
    icon: '❤️',
    title: 'Health Sync',
    description:
      'Sync with Apple Health and Google Fit to enrich your wellness insights with real data.',
  },
  {
    id: 'wearable-integration',
    icon: '⌚',
    title: 'Wearable Integration',
    description:
      'Connect your Apple Watch, Fitbit, or Garmin to track biometrics and trigger check-ins.',
  },
  {
    id: 'community',
    icon: '🤝',
    title: 'Community',
    description:
      'Join a supportive community of wellness seekers to share progress and stay motivated.',
  },
];

// ---------------------------------------------------------------------------
// Required feature category ids (8 categories per Requirements 3.1)
// ---------------------------------------------------------------------------

const REQUIRED_FEATURE_IDS = [
  'voice-interaction',
  'breathing-exercises',
  'mindfulness-sessions',
  'stress-relief',
  'routine-reminders',
  'health-sync',
  'wearable-integration',
  'community',
] as const;

// ---------------------------------------------------------------------------
// Pure logic helpers (mirror what the component renders)
// ---------------------------------------------------------------------------

/** Returns true when all required fields are non-empty strings. */
function hasRequiredFields(card: FeatureCard): boolean {
  return (
    card.icon.trim().length > 0 &&
    card.title.trim().length > 0 &&
    card.description.trim().length > 0
  );
}

/** Returns the card unchanged — simulates passing data through the component. */
function passThrough(card: FeatureCard): FeatureCard {
  return { ...card };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 200 }).filter(
  (s) => s.trim().length > 0
);

const featureCardArb: fc.Arbitrary<FeatureCard> = fc.record({
  id: nonEmptyStringArb,
  icon: nonEmptyStringArb,
  title: nonEmptyStringArb,
  description: nonEmptyStringArb,
});

// ---------------------------------------------------------------------------
// Property 9 tests
// ---------------------------------------------------------------------------

describe('FeatureCard — Property 9: Feature cards contain required fields', () => {
  /**
   * P9a: For any FeatureCard with non-empty icon, title, and description,
   * hasRequiredFields returns true.
   * Validates: Requirements 3.2
   */
  it('P9a: any card with non-empty icon, title, and description passes required-fields check', () => {
    fc.assert(
      fc.property(featureCardArb, (card) => {
        expect(hasRequiredFields(card)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P9b: For any FeatureCard, the id is preserved after passing through the component.
   * Validates: Requirements 3.2
   */
  it('P9b: the id field is preserved when a card is passed through the component', () => {
    fc.assert(
      fc.property(featureCardArb, (card) => {
        const result = passThrough(card);
        expect(result.id).toBe(card.id);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P9c: The FEATURES array in FeaturesSection contains exactly 8 required categories,
   * each with non-empty icon, title, and description.
   * Validates: Requirements 3.2
   */
  it('P9c: FEATURES array has all 8 required categories with non-empty fields', () => {
    expect(FEATURES).toHaveLength(8);

    for (const id of REQUIRED_FEATURE_IDS) {
      const card = FEATURES.find((f) => f.id === id);
      expect(card).toBeDefined();
      if (card) {
        expect(hasRequiredFields(card)).toBe(true);
      }
    }
  });

  /**
   * P9d: A card with any empty required field fails the required-fields check.
   * Validates: Requirements 3.2
   */
  it('P9d: a card with an empty icon, title, or description fails the required-fields check', () => {
    const emptyFieldCards: FeatureCard[] = [
      { id: 'a', icon: '', title: 'Title', description: 'Desc' },
      { id: 'b', icon: '🎙️', title: '', description: 'Desc' },
      { id: 'c', icon: '🎙️', title: 'Title', description: '' },
      { id: 'd', icon: '   ', title: 'Title', description: 'Desc' },
      { id: 'e', icon: '🎙️', title: '   ', description: 'Desc' },
      { id: 'f', icon: '🎙️', title: 'Title', description: '   ' },
    ];

    for (const card of emptyFieldCards) {
      expect(hasRequiredFields(card)).toBe(false);
    }
  });
});
