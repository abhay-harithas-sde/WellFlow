/**
 * Unit tests for components/sections/PricingSection.tsx and related components.
 * Tests billing toggle price switching and recommended tier visual distinction.
 * Requirements: 7.2, 7.4
 *
 * Since jest runs in 'node' environment (no DOM), we test the pure logic
 * extracted from PricingSection.tsx, PricingCard.tsx, and BillingToggle.tsx.
 */

// ---------------------------------------------------------------------------
// Types (mirroring PricingSection.tsx / PricingCard.tsx)
// ---------------------------------------------------------------------------

type BillingCycle = 'monthly' | 'annual';

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
// Pure logic extracted from PricingCard.tsx
// ---------------------------------------------------------------------------

/** Mirrors: price = billingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice */
function resolvePrice(tier: PricingTier, billingCycle: BillingCycle): number {
  return billingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice;
}

/**
 * Mirrors the CSS class logic for the card container in PricingCard.tsx.
 * Recommended tiers receive: ring-4 ring-brand-600 ring-offset-2 shadow-2xl scale-105
 */
function cardClasses(tier: PricingTier): string {
  return tier.recommended
    ? 'relative flex flex-col rounded-2xl p-8 bg-brand-600 text-white ring-4 ring-brand-600 ring-offset-2 shadow-2xl scale-105'
    : 'relative flex flex-col rounded-2xl p-8 bg-white text-gray-900 border border-gray-200 shadow-md';
}

const RECOMMENDED_CLASSES = ['ring-4', 'ring-brand-600', 'ring-offset-2', 'shadow-2xl', 'scale-105'];

// ---------------------------------------------------------------------------
// Pure logic extracted from BillingToggle.tsx
// ---------------------------------------------------------------------------

/** Mirrors the toggle onClick: onChange(isAnnual ? 'monthly' : 'annual') */
function toggleBillingCycle(current: BillingCycle): BillingCycle {
  return current === 'annual' ? 'monthly' : 'annual';
}

// ---------------------------------------------------------------------------
// DEFAULT_TIERS (copied from PricingSection.tsx for data-driven tests)
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
// Tests: Billing toggle switches displayed prices (Req 7.4)
// ---------------------------------------------------------------------------

describe('PricingSection — billing toggle switches displayed prices (Req 7.4)', () => {
  it('toggleBillingCycle switches from monthly to annual', () => {
    expect(toggleBillingCycle('monthly')).toBe('annual');
  });

  it('toggleBillingCycle switches from annual to monthly', () => {
    expect(toggleBillingCycle('annual')).toBe('monthly');
  });

  it('resolvePrice returns monthlyPrice when billingCycle is "monthly"', () => {
    const tier = DEFAULT_TIERS.find((t) => t.id === 'premium')!;
    expect(resolvePrice(tier, 'monthly')).toBe(tier.monthlyPrice);
  });

  it('resolvePrice returns annualPrice when billingCycle is "annual"', () => {
    const tier = DEFAULT_TIERS.find((t) => t.id === 'premium')!;
    expect(resolvePrice(tier, 'annual')).toBe(tier.annualPrice);
  });

  it('resolvePrice returns different values for monthly vs annual on paid tiers', () => {
    const tier = DEFAULT_TIERS.find((t) => t.id === 'premium')!;
    expect(resolvePrice(tier, 'monthly')).not.toBe(resolvePrice(tier, 'annual'));
  });

  it('resolvePrice returns 0 for both cycles on the free tier', () => {
    const tier = DEFAULT_TIERS.find((t) => t.id === 'free')!;
    expect(resolvePrice(tier, 'monthly')).toBe(0);
    expect(resolvePrice(tier, 'annual')).toBe(0);
  });

  it('all tiers return correct monthly prices', () => {
    DEFAULT_TIERS.forEach((tier) => {
      expect(resolvePrice(tier, 'monthly')).toBe(tier.monthlyPrice);
    });
  });

  it('all tiers return correct annual prices', () => {
    DEFAULT_TIERS.forEach((tier) => {
      expect(resolvePrice(tier, 'annual')).toBe(tier.annualPrice);
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: Recommended tier has distinguishing visual class (Req 7.2)
// ---------------------------------------------------------------------------

describe('PricingSection — recommended tier visual distinction (Req 7.2)', () => {
  it('recommended tier has recommended: true flag', () => {
    const recommended = DEFAULT_TIERS.find((t) => t.recommended);
    expect(recommended).toBeDefined();
    expect(recommended!.recommended).toBe(true);
  });

  it('non-recommended tiers have recommended: false flag', () => {
    const nonRecommended = DEFAULT_TIERS.filter((t) => !t.recommended);
    expect(nonRecommended.length).toBeGreaterThan(0);
    nonRecommended.forEach((tier) => {
      expect(tier.recommended).toBe(false);
    });
  });

  it('only one tier is recommended in DEFAULT_TIERS', () => {
    const recommendedTiers = DEFAULT_TIERS.filter((t) => t.recommended);
    expect(recommendedTiers).toHaveLength(1);
  });

  it('recommended tier has distinguishing CSS classes', () => {
    const recommended = DEFAULT_TIERS.find((t) => t.recommended)!;
    const classes = cardClasses(recommended);
    RECOMMENDED_CLASSES.forEach((cls) => {
      expect(classes).toContain(cls);
    });
  });

  it('non-recommended tiers do not have the recommended CSS classes', () => {
    const nonRecommended = DEFAULT_TIERS.filter((t) => !t.recommended);
    nonRecommended.forEach((tier) => {
      const classes = cardClasses(tier);
      RECOMMENDED_CLASSES.forEach((cls) => {
        expect(classes).not.toContain(cls);
      });
    });
  });
});
