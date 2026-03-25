'use client';

import { useState, useEffect } from 'react';

const STICKY_THRESHOLD = 100;

/**
 * Returns `isSticky: true` once the user has scrolled past the hero section
 * (default threshold: 100px). Guards against SSR by checking for `window`.
 */
export function useStickyNav(threshold = STICKY_THRESHOLD): boolean {
  const [isSticky, setIsSticky] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.scrollY > threshold;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleScroll() {
      setIsSticky(window.scrollY > threshold);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return isSticky;
}

export default useStickyNav;
