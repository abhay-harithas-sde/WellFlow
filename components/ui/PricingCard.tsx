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
}

interface PricingCardProps {
  tier: PricingTier;
  billingCycle: BillingCycle;
}

export function PricingCard({ tier, billingCycle }: PricingCardProps) {
  const price = billingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice;
  const isAnnual = billingCycle === 'annual';

  return (
    <div
      className={
        'relative flex flex-col rounded-2xl p-8 ' +
        (tier.recommended
          ? 'bg-brand-600 text-white ring-4 ring-brand-600 ring-offset-2 shadow-2xl scale-105'
          : 'bg-white text-gray-900 border border-gray-200 shadow-md')
      }
    >
      {/* Recommended badge */}
      {tier.recommended && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-amber-400 px-4 py-1 text-xs font-bold uppercase tracking-wide text-amber-900 shadow">
            Recommended
          </span>
        </div>
      )}

      {/* Tier name */}
      <h3
        className={`text-xl font-bold ${tier.recommended ? 'text-white' : 'text-gray-900'}`}
      >
        {tier.name}
      </h3>

      {/* Price */}
      <div className="mt-4 flex items-end gap-1">
        <span className={`text-4xl font-extrabold ${tier.recommended ? 'text-white' : 'text-gray-900'}`}>
          ${price}
        </span>
        <span className={`mb-1 text-sm ${tier.recommended ? 'text-brand-100' : 'text-gray-500'}`}>
          /{isAnnual ? 'yr' : 'mo'}
        </span>
      </div>

      {/* Features list */}
      <ul className="mt-6 flex-1 space-y-3" aria-label={`${tier.name} features`}>
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <svg
              className={`mt-0.5 h-5 w-5 flex-shrink-0 ${tier.recommended ? 'text-brand-200' : 'text-brand-600'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className={`text-sm ${tier.recommended ? 'text-brand-100' : 'text-gray-600'}`}>
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
              ? 'border-white text-white hover:bg-white hover:text-brand-600'
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
