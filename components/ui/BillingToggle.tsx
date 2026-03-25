import React from 'react';

type BillingCycle = 'monthly' | 'annual';

interface BillingToggleProps {
  value: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}

export function BillingToggle({ value, onChange }: BillingToggleProps) {
  const isAnnual = value === 'annual';

  return (
    <div className="flex items-center gap-3" role="group" aria-label="Billing cycle">
      <span
        className={`text-sm font-medium ${!isAnnual ? 'text-gray-900' : 'text-gray-500'}`}
        id="billing-monthly-label"
      >
        Monthly
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={isAnnual}
        aria-labelledby="billing-monthly-label billing-annual-label"
        onClick={() => onChange(isAnnual ? 'monthly' : 'annual')}
        className={
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ' +
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 ' +
          (isAnnual ? 'bg-brand-600' : 'bg-gray-300')
        }
      >
        <span className="sr-only">Toggle annual billing</span>
        <span
          className={
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ' +
            (isAnnual ? 'translate-x-6' : 'translate-x-1')
          }
        />
      </button>

      <span
        className={`text-sm font-medium ${isAnnual ? 'text-gray-900' : 'text-gray-500'}`}
        id="billing-annual-label"
      >
        Annual
        <span className="ml-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
          Save 20%
        </span>
      </span>
    </div>
  );
}

export default BillingToggle;
