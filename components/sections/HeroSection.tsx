'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export interface HeroProps {
  visualSrc?: string;
}

export default function HeroSection({ visualSrc }: HeroProps) {
  const t = useTranslations('hero');
  const shouldReduceMotion = useReducedMotion();

  const fade = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 24 },
    visible: { opacity: 1, y: 0 },
  };

  const trustItems = [
    { value: t('trustUsers'), label: 'Active Users' },
    { value: t('trustRating'), label: 'App Store' },
    { value: t('trustAward'), label: 'Recognition' },
  ];

  return (
    <section id="hero" aria-label="Hero" className="relative overflow-hidden bg-gray-950 px-4 py-24 sm:py-32">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-green-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        <motion.div initial="hidden" animate="visible" variants={fade} transition={{ duration: 0.6, ease: 'easeOut' }}>
          {/* Badge */}
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Voice-Powered Wellness
          </span>

          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl leading-tight">
            {t('headline')}
          </h1>

          <p className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto sm:text-xl leading-relaxed">
            {t('subheadline')}
          </p>

          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <a
              href="/raw"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl text-base font-semibold bg-green-600 text-white hover:bg-green-500 transition-colors shadow-lg shadow-green-900/30"
            >
              {t('cta')}
            </a>
            <a
              href="#features"
              onClick={(e) => { e.preventDefault(); document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl text-base font-semibold border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
            >
              See Features
            </a>
          </div>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial="hidden" animate="visible" variants={fade}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto"
        >
          {trustItems.map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-900 border border-gray-800">
              <span className="text-lg font-bold text-green-400">{item.value}</span>
              <span className="text-xs text-gray-500">{item.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
