'use client';

import { useCookieConsent } from '@/hooks/useCookieConsent';
import { AnalyticsLoader } from '@/lib/analytics';
import CookieConsentBanner from '@/components/ui/CookieConsentBanner';

/**
 * Client-side providers that require cookie consent state.
 * Must be a Client Component because it uses the useCookieConsent hook.
 * Renders the CookieConsentBanner and conditionally activates AnalyticsLoader.
 */
export default function ClientProviders() {
  const { decided, accepted, accept, decline } = useCookieConsent();

  return (
    <>
      <CookieConsentBanner decided={decided} accept={accept} decline={decline} />
      <AnalyticsLoader accepted={accepted} />
    </>
  );
}
