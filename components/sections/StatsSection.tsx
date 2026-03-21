'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useWellFlowStats } from '@/hooks/useWellFlowStats';

interface StatItem {
  value: string;
  label: string;
}

/**
 * Parses a stat string like "50,000+", "2M+", "4.8", "120+" into a numeric value
 * and a suffix (e.g. "+", "M+", "").
 */
function parseStat(raw: string): { numeric: number; suffix: string } {
  // Remove commas for parsing
  const cleaned = raw.replace(/,/g, '');
  const match = cleaned.match(/^([\d.]+)([A-Za-z+]*)$/);
  if (!match) return { numeric: 0, suffix: '' };
  return { numeric: parseFloat(match[1]), suffix: match[2] };
}

/**
 * Formats a number back to a display string, preserving thousands commas when
 * the original value had them.
 */
function formatNumber(value: number, originalRaw: string): string {
  const hasComma = originalRaw.includes(',');
  if (hasComma) {
    return Math.round(value).toLocaleString('en-US');
  }
  // Preserve one decimal place if the original had it
  const hasDecimal = originalRaw.includes('.');
  if (hasDecimal) {
    return value.toFixed(1);
  }
  return Math.round(value).toString();
}

function AnimatedCounter({ value, label }: StatItem) {
  const { numeric, suffix } = parseStat(value);
  const [displayed, setDisplayed] = useState('0');
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1500;
          const start = performance.now();

          const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = eased * numeric;
            setDisplayed(formatNumber(current, value));
            if (progress < 1) {
              animationRef.current = requestAnimationFrame(tick);
            } else {
              setDisplayed(formatNumber(numeric, value));
            }
          };

          animationRef.current = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [numeric, value]);

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-2">
      <span className="text-4xl sm:text-5xl font-bold text-green-400" aria-live="polite">
        {displayed}{suffix}
      </span>
      <span className="text-sm sm:text-base text-gray-400 font-medium text-center">{label}</span>
    </div>
  );
}

export function StatsSection() {
  const t = useTranslations('stats');
  const stats = useWellFlowStats();

  const items: StatItem[] = [
    { value: stats.users,    label: t('usersLabel') },
    { value: stats.sessions, label: t('sessionsLabel') },
    { value: stats.rating,   label: t('ratingLabel') },
    { value: stats.countries, label: t('countriesLabel') },
  ];

  return (
    <section id="stats" aria-labelledby="stats-heading" className="py-16 bg-gray-900 border-y border-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="stats-heading" className="sr-only">WellFlow Platform Statistics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-12">
          {items.map((item) => (
            <AnimatedCounter key={item.label} value={item.value} label={item.label} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default StatsSection;
