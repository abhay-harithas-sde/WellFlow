'use client';

import { useEffect } from 'react';

// Placeholder GA4 measurement ID — replace with real ID before going live
const GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX';

/**
 * Injects the GA4 gtag script into the DOM.
 * All DOM manipulation is wrapped in try/catch so ad-blocker failures
 * are silent and never affect the user experience.
 */
export function injectGA4Script(measurementId: string = GA4_MEASUREMENT_ID): void {
  try {
    if (document.getElementById('ga4-script')) return;

    const script = document.createElement('script');
    script.id = 'ga4-script';
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.async = true;
    document.head.appendChild(script);

    // Initialise the dataLayer and gtag function
    window.dataLayer = window.dataLayer ?? [];
    function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    }
    gtag('js', new Date());
    gtag('config', measurementId);
  } catch {
    // Ad-blocker or CSP blocked the script — fail silently
  }
}

/**
 * React component that injects GA4 after mount, only when the user
 * has accepted cookies. Renders nothing to the DOM.
 */
export function AnalyticsLoader({ accepted }: { accepted: boolean }): null {
  useEffect(() => {
    if (!accepted) return;
    injectGA4Script();
  }, [accepted]);

  return null;
}

// Extend Window to avoid TypeScript errors for dataLayer / gtag globals
declare global {
  interface Window {
    dataLayer: unknown[];
  }
}
