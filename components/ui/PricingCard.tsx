'use client';

import React from 'react';
import { Button } from './Button';

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

interface PricingCardProps {
  tier: PricingTier;
  billingCycle: BillingCycle;
  /** Annual savings badge text, e.g. "Save 33%" — only shown when annual billing is active */
  savingsBadge?: string;
}

export function PricingCard({ tier, billingCycle, savingsBadge }: PricingCardProps) {
  const price = billingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice;
  const isAnnual = billingCycle === 'annual';

  return (
    <div
      className={
        'relative flex flex-col rounded-2xl p-8 ' +
        (tier.recommended
          ? 'bg-green-600 text-white ring-4 ring-green-500 ring-offset-2 ring-offset-gray-950 shadow-2xl scale-105'
          : 'bg-gray-900 text-white border border-gray-700 shadow-md')
      }
    >
      {/* Recommended badge */}
      {tier.recommended && tier.badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-amber-400 px-4 py-1 text-xs font-bold uppercase tracking-wide text-amber-900 shadow">
            {tier.badge}
          </span>
        </div>
      )}

      {/* Tier name */}
      <h3 className="text-xl font-bold text-white">
        {tier.name}
      </h3>

      {/* Price */}
      <div className="mt-4 flex items-end gap-1 flex-wrap">
        <span className="text-4xl font-extrabold text-white">
          ${price}
        </span>
        <span className={`mb-1 text-sm ${tier.recommended ? 'text-green-100' : 'text-gray-400'}`}>
          /{isAnnual ? 'yr' : 'mo'}
        </span>
        {savingsBadge && (
          <span
            className="mb-1 ml-2 rounded-full bg-green-500/20 border border-green-500/30 px-2 py-0.5 text-xs font-semibold text-green-400"
            aria-label={savingsBadge}
          >
            {savingsBadge}
          </span>
        )}
      </div>

      {/* Features list */}
      <ul className="mt-6 flex-1 space-y-3" aria-label={`${tier.name} features`}>
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <svg
              className={`mt-0.5 h-5 w-5 flex-shrink-0 ${tier.recommended ? 'text-green-200' : 'text-green-500'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className={`text-sm ${tier.recommended ? 'text-green-100' : 'text-gray-300'}`}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-8">
        <Button
          variant={tier.recommended ? 'secondary' : 'primary'}
          className={
            'w-full justify-center ' +
            (tier.recommended
              ? 'border-white text-white hover:bg-white hover:text-green-700'
              : '')
          }
          onClick={() => {
            window.location.href = tier.ctaHref;
          }}
          aria-label={`${tier.ctaLabel} — ${tier.name} plan`}
        >
          {tier.ctaLabel}
        </Button>
      </div>
    </div>
  );
}

export default PricingCard;
