'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { Button } from '@/components/ui/Button';

const FEATURE_IDS = [
  'voice',
  'breathing',
  'mindfulness',
  'stress',
  'reminders',
  'healthSync',
  'wearable',
  'community',
] as const;

type FeatureId = (typeof FEATURE_IDS)[number];

const FEATURE_ICONS: Record<FeatureId, string> = {
  voice: '🎙️',
  breathing: '🌬️',
  mindfulness: '🧘',
  stress: '💆',
  reminders: '⏰',
  healthSync: '❤️',
  wearable: '⌚',
  community: '🤝',
};

// Maps feature id to the data-testid suffix used in FeaturesSection
const FEATURE_CARD_IDS: Record<FeatureId, string> = {
  voice: 'voice-interaction',
  breathing: 'breathing-exercises',
  mindfulness: 'mindfulness-sessions',
  stress: 'stress-relief',
  reminders: 'routine-reminders',
  healthSync: 'health-sync',
  wearable: 'wearable-integration',
  community: 'community',
};

const MURF_BADGE_IDS: FeatureId[] = ['voice'];
const WELLFLOW_BADGE_IDS: FeatureId[] = ['healthSync', 'community'];

export function FeaturesSection() {
  const t = useTranslations('features');

  return (
    <section id="features" aria-labelledby="features-heading" className="py-20 bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 id="features-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t('title')}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {FEATURE_IDS.map((featureId) => {
            const badge = MURF_BADGE_IDS.includes(featureId)
              ? 'Murf AI Powered'
              : WELLFLOW_BADGE_IDS.includes(featureId)
                ? 'WellFlow Platform'
                : undefined;
            return (
              <FeatureCard
                key={featureId}
                id={FEATURE_CARD_IDS[featureId]}
                icon={FEATURE_ICONS[featureId]}
                title={t(`items.${featureId}.title`)}
                description={t(`items.${featureId}.desc`)}
                badge={badge}
              />
            );
          })}
        </div>
        <div className="mt-14 flex flex-col items-center gap-4 text-center">
          <a
            href="/raw"
            className="inline-flex items-center justify-center px-8 py-3 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-500 transition-colors"
          >
            {t('cta')}
          </a>
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;
