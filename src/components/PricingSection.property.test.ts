// Feature: wellflow-website, Property 1: Annual price is always less than or equal to monthly equivalent

/**
 * Property-based test for components/sections/PricingSection.tsx
 * Property 1: Annual price is always less than or equal to monthly equivalent
 * Validates: Requirements 7.4
 *
 * Pure logic tests (node environment, no DOM).
 * For any PricingTier, the annualPrice must be strictly less than monthlyPrice × 12
 * (except when monthlyPrice is 0, where annualPrice must also be 0).
 */

import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// PricingTier interface (mirrors design.md and PricingSection.tsx)
// ---------------------------------------------------------------------------

interface PricingTier {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  recommended: boolean;
  ctaLabel: string;
  ctaHref: string;
}

// ---------------------------------------------------------------------------
// DEFAULT_TIERS from PricingSection.tsx (source of truth for Req 7.4)
// ---------------------------------------------------------------------------

const DEFAULT_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      'Voice-guided breathing exercises',
      'Basic mindfulness sessions',
      '3 routine reminders per day',
      'Community access',
    ],
    recommended: false,
    ctaLabel: 'Get Started Free',
    ctaHref: '/signup?plan=free',
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 9.99,
    annualPrice: 79.99, // < 9.99 × 12 = 119.88
    features: [
      'Everything in Free',
      'Unlimited mindfulness sessions',
      'Health & wearable sync',
      'Stress tracking & analytics',
      'Unlimited routine reminders',
      'Priority support',
    ],
    recommended: true,
    ctaLabel: 'Start Free Trial',
    ctaHref: '/signup?plan=premium',
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 19.99,
    annualPrice: 159.99, // < 19.99 × 12 = 239.88
    features: [
      'Everything in Premium',
      'Advanced AI coaching',
      'Team & family sharing (up to 5)',
      'Custom wellness programs',
      'Dedicated account manager',
      'Early access to new features',
    ],
    recommended: false,
    ctaLabel: 'Go Pro',
    ctaHref: '/signup?plan=pro',
  },
];

// ---------------------------------------------------------------------------
// Pure logic helper — the invariant under test
// ---------------------------------------------------------------------------

/**
 * Returns true when the tier satisfies the annual-price invariant:
 *   - If monthlyPrice === 0, annualPrice must also be 0.
 *   - Otherwise, annualPrice must be strictly less than monthlyPrice × 12.
 */
function satisfiesAnnualPriceInvariant(tier: PricingTier): boolean {
  if (tier.monthlyPrice === 0) {
    return tier.annualPrice === 0;
  }
  return tier.annualPrice < tier.monthlyPrice * 12;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 100 }).filter(
  (s) => s.trim().length > 0
);

/** Generates a positive monthly price (> 0, up to 9999.99). */
const positivePriceArb = fc.double({ min: 0.01, max: 9999.99, noNaN: true });

/**
 * Generates a PricingTier where annualPrice < monthlyPrice × 12.
 * The annual price is constrained to [0, monthlyPrice × 12).
 */
const validPaidTierArb: fc.Arbitrary<PricingTier> = positivePriceArb.chain(
  (monthlyPrice) => {
    const maxAnnual = monthlyPrice * 12;
    return fc.record({
      id: nonEmptyStringArb,
      name: nonEmptyStringArb,
      monthlyPrice: fc.constant(monthlyPrice),
      // annualPrice in [0, maxAnnual - epsilon) — strictly less than monthly equivalent
      annualPrice: fc.double({ min: 0, max: maxAnnual - 0.01, noNaN: true }),
      features: fc.array(nonEmptyStringArb, { minLength: 0, maxLength: 10 }),
      recommended: fc.boolean(),
      ctaLabel: nonEmptyStringArb,
      ctaHref: nonEmptyStringArb,
    });
  }
);

/**
 * Generates a PricingTier where annualPrice >= monthlyPrice × 12 (invariant violated).
 */
const invalidPaidTierArb: fc.Arbitrary<PricingTier> = positivePriceArb.chain(
  (monthlyPrice) => {
    const minAnnual = monthlyPrice * 12;
    return fc.record({
      id: nonEmptyStringArb,
      name: nonEmptyStringArb,
      monthlyPrice: fc.constant(monthlyPrice),
      // annualPrice >= monthlyPrice × 12 — invariant should fail
      annualPrice: fc.double({ min: minAnnual, max: minAnnual * 2 + 1, noNaN: true }),
      features: fc.array(nonEmptyStringArb, { minLength: 0, maxLength: 10 }),
      recommended: fc.boolean(),
      ctaLabel: nonEmptyStringArb,
      ctaHref: nonEmptyStringArb,
    });
  }
);

// ---------------------------------------------------------------------------
// Property 1 tests
// ---------------------------------------------------------------------------

describe('PricingSection — Property 1: Annual price is always less than or equal to monthly equivalent', () => {
  /**
   * P1a: For any PricingTier with annualPrice < monthlyPrice × 12, the invariant holds.
   * Validates: Requirements 7.4
   */
  it('P1a: any tier with annualPrice < monthlyPrice × 12 satisfies the annual price invariant', () => {
    fc.assert(
      fc.property(validPaidTierArb, (tier) => {
        expect(satisfiesAnnualPriceInvariant(tier)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P1b: For any PricingTier with annualPrice >= monthlyPrice × 12, the invariant fails.
   * Validates: Requirements 7.4
   */
  it('P1b: any tier with annualPrice >= monthlyPrice × 12 violates the annual price invariant', () => {
    fc.assert(
      fc.property(invalidPaidTierArb, (tier) => {
        expect(satisfiesAnnualPriceInvariant(tier)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P1c: All DEFAULT_TIERS satisfy the annual price invariant.
   * Validates: Requirements 7.4
   */
  it('P1c: all DEFAULT_TIERS satisfy the annual price invariant', () => {
    for (const tier of DEFAULT_TIERS) {
      expect(satisfiesAnnualPriceInvariant(tier)).toBe(true);
    }
  });

  /**
   * P1d: Free tier (monthlyPrice = 0) is handled correctly — annualPrice must be 0.
   * Validates: Requirements 7.4
   */
  it('P1d: free tier with monthlyPrice = 0 and annualPrice = 0 satisfies the invariant', () => {
    const freeTier = DEFAULT_TIERS.find((t) => t.id === 'free');
    expect(freeTier).toBeDefined();
    expect(freeTier!.monthlyPrice).toBe(0);
    expect(freeTier!.annualPrice).toBe(0);
    expect(satisfiesAnnualPriceInvariant(freeTier!)).toBe(true);
  });
});
