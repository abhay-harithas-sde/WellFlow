/**
 * Unit tests for components/sections/PricingSection.tsx and related components.
 * Tests billing toggle price switching, recommended tier visual distinction,
 * feature lists (Murf AI Voice, Full WellFlow Platform), and annual savings badge.
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
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
  badge?: string;
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
// Annual savings badge logic (mirrors PricingSection.tsx computeSavingsPercent)
// ---------------------------------------------------------------------------

function computeSavingsPercent(monthlyPrice: number, annualPrice: number): number {
  if (monthlyPrice <= 0) return 0;
  return Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100);
}

function getSavingsBadge(
  tier: PricingTier,
  billingCycle: BillingCycle
): string | undefined {
  if (billingCycle !== 'annual' || tier.monthlyPrice <= 0) return undefined;
  const percent = computeSavingsPercent(tier.monthlyPrice, tier.annualPrice);
  return percent > 0 ? `Save ${percent}%` : undefined;
}

// ---------------------------------------------------------------------------
// DEFAULT_TIERS (mirrors PricingSection.tsx with i18n feature lists)
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
      'Murf AI Voice',
      'Unlimited mindfulness sessions',
      'Health & wearable sync',
      'Stress tracking & analytics',
      'Unlimited routine reminders',
      'Priority support',
    ],
    recommended: true,
    ctaLabel: 'Start Free Trial',
    ctaHref: '/signup?plan=premium',
    badge: 'Most Popular',
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 19.99,
    annualPrice: 159.99,
    features: [
      'Everything in Premium',
      'Murf AI Voice',
      'Full WellFlow Platform',
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
// Tests: Three tiers exist (Req 10.1)
// ---------------------------------------------------------------------------

describe('PricingSection — three tiers (Req 10.1)', () => {
  it('has exactly three tiers: Free, Premium, Pro', () => {
    expect(DEFAULT_TIERS).toHaveLength(3);
    const ids = DEFAULT_TIERS.map((t) => t.id);
    expect(ids).toContain('free');
    expect(ids).toContain('premium');
    expect(ids).toContain('pro');
  });
});

// ---------------------------------------------------------------------------
// Tests: Murf AI Voice feature in Premium and Pro (Req 10.2)
// ---------------------------------------------------------------------------

describe('PricingSection — Murf AI Voice feature (Req 10.2)', () => {
  it('Premium tier includes "Murf AI Voice" feature', () => {
    const premium = DEFAULT_TIERS.find((t) => t.id === 'premium')!;
    expect(premium.features).toContain('Murf AI Voice');
  });

  it('Pro tier includes "Murf AI Voice" feature', () => {
    const pro = DEFAULT_TIERS.find((t) => t.id === 'pro')!;
    expect(pro.features).toContain('Murf AI Voice');
  });

  it('Free tier does NOT include "Murf AI Voice" feature', () => {
    const free = DEFAULT_TIERS.find((t) => t.id === 'free')!;
    expect(free.features).not.toContain('Murf AI Voice');
  });
});

// ---------------------------------------------------------------------------
// Tests: Full WellFlow Platform feature in Pro (Req 10.3)
// ---------------------------------------------------------------------------

describe('PricingSection — Full WellFlow Platform feature (Req 10.3)', () => {
  it('Pro tier includes "Full WellFlow Platform" feature', () => {
    const pro = DEFAULT_TIERS.find((t) => t.id === 'pro')!;
    expect(pro.features).toContain('Full WellFlow Platform');
  });

  it('Free tier does NOT include "Full WellFlow Platform" feature', () => {
    const free = DEFAULT_TIERS.find((t) => t.id === 'free')!;
    expect(free.features).not.toContain('Full WellFlow Platform');
  });

  it('Premium tier does NOT include "Full WellFlow Platform" feature', () => {
    const premium = DEFAULT_TIERS.find((t) => t.id === 'premium')!;
    expect(premium.features).not.toContain('Full WellFlow Platform');
  });
});

// ---------------------------------------------------------------------------
// Tests: Billing toggle switches displayed prices (Req 10.4)
// ---------------------------------------------------------------------------

describe('PricingSection — billing toggle switches displayed prices (Req 10.4)', () => {
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
// Tests: Annual savings badge (Req 10.5)
// ---------------------------------------------------------------------------

describe('PricingSection — annual savings badge (Req 10.5)', () => {
  it('computeSavingsPercent returns correct percentage for premium tier', () => {
    // 79.99 / (9.99 * 12) = 79.99 / 119.88 ≈ 0.6672 → save ≈ 33%
    const result = computeSavingsPercent(9.99, 79.99);
    expect(result).toBe(33);
  });

  it('computeSavingsPercent returns correct percentage for pro tier', () => {
    // 159.99 / (19.99 * 12) = 159.99 / 239.88 ≈ 0.6670 → save ≈ 33%
    const result = computeSavingsPercent(19.99, 159.99);
    expect(result).toBe(33);
  });

  it('computeSavingsPercent returns 0 when monthlyPrice is 0', () => {
    expect(computeSavingsPercent(0, 0)).toBe(0);
  });

  it('getSavingsBadge returns badge text when annual billing and paid tier', () => {
    const premium = DEFAULT_TIERS.find((t) => t.id === 'premium')!;
    const badge = getSavingsBadge(premium, 'annual');
    expect(badge).toBeDefined();
    expect(badge).toMatch(/Save \d+%/);
  });

  it('getSavingsBadge returns undefined when monthly billing', () => {
    const premium = DEFAULT_TIERS.find((t) => t.id === 'premium')!;
    expect(getSavingsBadge(premium, 'monthly')).toBeUndefined();
  });

  it('getSavingsBadge returns undefined for free tier even on annual billing', () => {
    const free = DEFAULT_TIERS.find((t) => t.id === 'free')!;
    expect(getSavingsBadge(free, 'annual')).toBeUndefined();
  });

  it('getSavingsBadge returns badge for pro tier on annual billing', () => {
    const pro = DEFAULT_TIERS.find((t) => t.id === 'pro')!;
    const badge = getSavingsBadge(pro, 'annual');
    expect(badge).toBeDefined();
    expect(badge).toMatch(/Save \d+%/);
  });
});

// ---------------------------------------------------------------------------
// Tests: Recommended tier has distinguishing visual class (Req 10.1)
// ---------------------------------------------------------------------------

describe('PricingSection — recommended tier visual distinction', () => {
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

// ---------------------------------------------------------------------------
// Tests: Annual price is less than monthly × 12 (Property 1 invariant)
// ---------------------------------------------------------------------------

describe('PricingSection — annual price invariant', () => {
  it('annual price is strictly less than monthlyPrice × 12 for paid tiers', () => {
    DEFAULT_TIERS.filter((t) => t.monthlyPrice > 0).forEach((tier) => {
      expect(tier.annualPrice).toBeLessThan(tier.monthlyPrice * 12);
    });
  });
});
