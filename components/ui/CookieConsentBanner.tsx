'use client';

import Link from 'next/link';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { Button } from '@/components/ui/Button';

export default function CookieConsentBanner() {
  const { decided, accept, decline } = useCookieConsent();

  if (decided) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg p-4 sm:p-6"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="flex-1 text-sm text-gray-700">
          We use cookies to improve your experience and analyse site usage.{' '}
          <Link
            href="/cookie-policy"
            className="underline text-brand-600 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 rounded"
          >
            Cookie Policy
          </Link>
        </p>
        <div className="flex gap-3 shrink-0">
          <Button variant="secondary" onClick={decline}>
            Decline
          </Button>
          <Button variant="primary" onClick={accept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
