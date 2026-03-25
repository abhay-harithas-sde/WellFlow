'use client';

import React, { useState } from 'react';
import { BillingToggle } from '../ui/BillingToggle';
import { PricingCard } from '../ui/PricingCard';

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

// Annual prices are strictly less than monthlyPrice × 12 (Property 1)
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

interface PricingSectionProps {
  tiers?: PricingTier[];
}

export default function PricingSection({ tiers = DEFAULT_TIERS }: PricingSectionProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose the plan that fits your wellness journey. Upgrade or downgrade at any time.
          </p>
        </div>

        {/* Billing toggle — Req 7.4 */}
        <div className="flex justify-center mb-12">
          <BillingToggle value={billingCycle} onChange={setBillingCycle} />
        </div>

        {/* Tier cards — single row on desktop, stacked on mobile — Req 7.6 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {tiers.map((tier) => (
            <PricingCard key={tier.id} tier={tier} billingCycle={billingCycle} />
          ))}
        </div>

        {/* Money-back guarantee notice — Req 7.5 */}
        <div className="mt-12 text-center">
          <p className="inline-flex items-center gap-2 text-sm text-gray-600">
            <svg
              className="h-5 w-5 text-green-500 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            30-day money-back guarantee on all paid plans. No questions asked.
          </p>
        </div>
      </div>
    </section>
  );
}
