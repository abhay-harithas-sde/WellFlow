'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

interface StepConfig {
  number: number;
  icon: string;
  badge?: { label: string; variant: 'murf' | 'wellflow' };
}

const STEP_CONFIGS: StepConfig[] = [
  { number: 1, icon: '📲' },
  { number: 2, icon: '🎙️', badge: { label: 'Murf AI', variant: 'murf' } },
  { number: 3, icon: '🧘', badge: { label: 'WellFlow Platform', variant: 'wellflow' } },
  { number: 4, icon: '📈' },
];

const BADGE_STYLES: Record<'murf' | 'wellflow', string> = {
  murf: 'bg-purple-100 text-purple-700 border border-purple-200',
  wellflow: 'bg-brand-50 text-brand-700 border border-brand-200',
};

export function HowItWorksSection() {
  const t = useTranslations('howItWorks');
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.4, ease: 'easeOut' },
    },
  };

  return (
    <section id="how-it-works" aria-labelledby="how-it-works-heading" className="py-20 bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 id="how-it-works-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t('title')}
          </h2>
        </div>
        <div className="relative">
          <div className="hidden lg:block absolute top-10 left-0 right-0 h-0.5 bg-gray-800" aria-hidden="true" />
          <motion.ol
            className="flex flex-col lg:flex-row lg:items-start gap-10 lg:gap-0"
            variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
          >
            {STEP_CONFIGS.map((config, index) => {
              const stepKey = index as 0 | 1 | 2 | 3;
              return (
                <motion.li key={config.number} variants={itemVariants} className="relative flex flex-col items-center text-center lg:flex-1 lg:px-6">
                  <div className="relative z-10 flex flex-col items-center gap-2 mb-4">
                    <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gray-900 border border-gray-700 text-4xl">
                      {config.icon}
                    </div>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold">
                      {config.number}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{t(`steps.${stepKey}.title`)}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed max-w-xs">{t(`steps.${stepKey}.desc`)}</p>
                  {config.badge && (
                    <span className="mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 border border-green-500/20 text-green-400">
                      {config.badge.label}
                    </span>
                  )}
                  {index < STEP_CONFIGS.length - 1 && (
                    <div className="lg:hidden mt-6 text-gray-600 text-2xl" aria-hidden="true">↓</div>
                  )}
                </motion.li>
              );
            })}
          </motion.ol>
        </div>
        <div className="mt-16 flex flex-col items-center">
          <a href="/raw" className="inline-flex items-center justify-center px-8 py-3 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-500 transition-colors">
            {t('cta')}
          </a>
        </div>
      </div>
    </section>
  );
}

export default HowItWorksSection;
