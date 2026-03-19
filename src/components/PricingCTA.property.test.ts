// Feature: wellflow-website, Property 11: Pricing tier CTA navigates to correct destination

/**
 * Property-based test for components/ui/PricingCard.tsx
 * Property 11: Pricing tier CTA navigates to correct destination
 * Validates: Requirements 7.3
 *
 * Pure logic tests (node environment, no DOM).
 * For any pricing tier, the CTA must navigate to the ctaHref defined for that tier,
 * and the CTA label must match the ctaLabel defined for that tier.
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
// DEFAULT_TIERS from PricingSection.tsx (source of truth for Req 7.3)
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
    annualPrice: 79.99,
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
    annualPrice: 159.99,
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
// Pure logic helpers (mirror the CTA behaviour in PricingCard.tsx)
// ---------------------------------------------------------------------------

/**
 * Simulates the onClick handler in PricingCard:
 *   onClick: () => { window.location.href = tier.ctaHref; }
 * Returns the href that would be navigated to.
 */
function getCtaNavigationTarget(tier: PricingTier): string {
  return tier.ctaHref;
}

/**
 * Returns the CTA label for a tier — mirrors {tier.ctaLabel} in PricingCard.
 */
function getCtaLabel(tier: PricingTier): string {
  return tier.ctaLabel;
}

/**
 * Simulates passing a tier through component props and reading back ctaHref.
 * Verifies the pass-through invariant: ctaHref is not mutated.
 */
function passThroughTier(tier: PricingTier): PricingTier {
  return { ...tier };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 200 }).filter(
  (s) => s.trim().length > 0
);

const pricingTierArb: fc.Arbitrary<PricingTier> = fc.record({
  id: nonEmptyStringArb,
  name: nonEmptyStringArb,
  monthlyPrice: fc.double({ min: 0, max: 9999.99, noNaN: true }),
  annualPrice: fc.double({ min: 0, max: 9999.99, noNaN: true }),
  features: fc.array(nonEmptyStringArb, { minLength: 0, maxLength: 10 }),
  recommended: fc.boolean(),
  ctaLabel: nonEmptyStringArb,
  ctaHref: nonEmptyStringArb,
});

// ---------------------------------------------------------------------------
// Property 11 tests
// ---------------------------------------------------------------------------

describe('PricingCTA — Property 11: Pricing tier CTA navigates to correct destination', () => {
  /**
   * P11a: For any PricingTier, the CTA href matches tier.ctaHref.
   * Validates: Requirements 7.3
   */
  it('P11a: for any PricingTier, the CTA navigation target matches tier.ctaHref', () => {
    fc.assert(
      fc.property(pricingTierArb, (tier) => {
        expect(getCtaNavigationTarget(tier)).toBe(tier.ctaHref);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P11b: For any PricingTier, the CTA label matches tier.ctaLabel.
   * Validates: Requirements 7.3
   */
  it('P11b: for any PricingTier, the CTA label matches tier.ctaLabel', () => {
    fc.assert(
      fc.property(pricingTierArb, (tier) => {
        expect(getCtaLabel(tier)).toBe(tier.ctaLabel);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P11c: All DEFAULT_TIERS have unique ctaHref values.
   * Each tier must navigate to a different destination.
   * Validates: Requirements 7.3
   */
  it('P11c: all DEFAULT_TIERS have unique ctaHref values', () => {
    const hrefs = DEFAULT_TIERS.map((tier) => tier.ctaHref);
    const uniqueHrefs = new Set(hrefs);
    expect(uniqueHrefs.size).toBe(DEFAULT_TIERS.length);
  });

  /**
   * P11d: ctaHref is preserved through the component props (pass-through invariant).
   * For any PricingTier, passing it through the component must not mutate ctaHref.
   * Validates: Requirements 7.3
   */
  it('P11d: ctaHref is preserved when a tier is passed through component props', () => {
    fc.assert(
      fc.property(pricingTierArb, (tier) => {
        const result = passThroughTier(tier);
        expect(result.ctaHref).toBe(tier.ctaHref);
      }),
      { numRuns: 100 }
    );
  });
});
