'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { BillingToggle } from '../ui/BillingToggle';
import { PricingCard } from '../ui/PricingCard';

type BillingCycle = 'monthly' | 'annual';

export interface PricingTier {
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

// Annual prices are strictly less than monthlyPrice × 12 (Property 1)
function buildDefaultTiers(t: ReturnType<typeof useTranslations>): PricingTier[] {
  return [
    {
      id: 'free',
      name: t('tiers.free.name'),
      monthlyPrice: 0,
      annualPrice: 0,
      features: (t.raw('tiers.free.features') as string[]),
      recommended: false,
      ctaLabel: t('tiers.free.cta'),
      ctaHref: '/signup?plan=free',
    },
    {
      id: 'premium',
      name: t('tiers.premium.name'),
      monthlyPrice: 9.99,
      annualPrice: 79.99, // < 9.99 × 12 = 119.88
      features: (t.raw('tiers.premium.features') as string[]),
      recommended: true,
      ctaLabel: t('tiers.premium.cta'),
      ctaHref: '/signup?plan=premium',
      badge: t('tiers.premium.badge'),
    },
    {
      id: 'pro',
      name: t('tiers.pro.name'),
      monthlyPrice: 19.99,
      annualPrice: 159.99, // < 19.99 × 12 = 239.88
      features: (t.raw('tiers.pro.features') as string[]),
      recommended: false,
      ctaLabel: t('tiers.pro.cta'),
      ctaHref: '/signup?plan=pro',
    },
  ];
}

/** Compute annual savings percentage vs monthly billing */
export function computeSavingsPercent(monthlyPrice: number, annualPrice: number): number {
  if (monthlyPrice <= 0) return 0;
  return Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100);
}

interface PricingSectionProps {
  tiers?: PricingTier[];
}

export default function PricingSection({ tiers }: PricingSectionProps) {
  const t = useTranslations('pricing');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  const resolvedTiers = tiers ?? buildDefaultTiers(t);

  return (
    <section id="pricing" className="py-20 bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">{t('title')}</h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">{t('subtitle')}</p>
        </div>

        {/* Billing toggle — Req 10.4 */}
        <div className="flex justify-center mb-12">
          <BillingToggle value={billingCycle} onChange={setBillingCycle} />
        </div>

        {/* Tier cards — single row on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {resolvedTiers.map((tier) => {
            const savingsPercent =
              billingCycle === 'annual' && tier.monthlyPrice > 0
                ? computeSavingsPercent(tier.monthlyPrice, tier.annualPrice)
                : 0;
            const savingsBadge =
              savingsPercent > 0
                ? t('savingsBadge', { percent: savingsPercent })
                : undefined;

            return (
              <PricingCard
                key={tier.id}
                tier={tier}
                billingCycle={billingCycle}
                savingsBadge={savingsBadge}
              />
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="inline-flex items-center gap-2 text-sm text-gray-400">
            <svg className="h-5 w-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {t('guarantee')}
          </p>
        </div>
      </div>
    </section>
  );
}
