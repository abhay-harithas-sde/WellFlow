import React from 'react';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { Button } from '@/components/ui/Button';

const FEATURES = [
  {
    id: 'voice-interaction',
    icon: '🎙️',
    title: 'Voice Interaction',
    description:
      'Speak naturally to WellFlow and receive guided wellness responses hands-free, anytime.',
  },
  {
    id: 'breathing-exercises',
    icon: '🌬️',
    title: 'Breathing Exercises',
    description:
      'Follow voice-led breathing techniques to calm your nervous system and reduce anxiety.',
  },
  {
    id: 'mindfulness-sessions',
    icon: '🧘',
    title: 'Mindfulness Sessions',
    description:
      'Access guided meditations and mindfulness practices tailored to your mood and schedule.',
  },
  {
    id: 'stress-relief',
    icon: '💆',
    title: 'Stress Relief',
    description:
      'Personalized stress-relief routines that adapt to your daily patterns and triggers.',
  },
  {
    id: 'routine-reminders',
    icon: '⏰',
    title: 'Routine Reminders',
    description:
      'Smart reminders keep your wellness habits consistent without feeling intrusive.',
  },
  {
    id: 'health-sync',
    icon: '❤️',
    title: 'Health Sync',
    description:
      'Sync with Apple Health and Google Fit to enrich your wellness insights with real data.',
  },
  {
    id: 'wearable-integration',
    icon: '⌚',
    title: 'Wearable Integration',
    description:
      'Connect your Apple Watch, Fitbit, or Garmin to track biometrics and trigger check-ins.',
  },
  {
    id: 'community',
    icon: '🤝',
    title: 'Community',
    description:
      'Join a supportive community of wellness seekers to share progress and stay motivated.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" aria-labelledby="features-heading" className="py-20 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2
            id="features-heading"
            className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
          >
            Everything you need to thrive
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            WellFlow brings together the tools that matter most for your mental and physical
            wellness — all in one voice-powered experience.
          </p>
        </div>

        {/* Responsive feature grid: 1 col → 2 col → 3 col → 4 col */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {FEATURES.map((feature) => (
            <FeatureCard
              key={feature.id}
              id={feature.id}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>

        {/* Secondary CTA */}
        <div className="mt-14 flex flex-col items-center gap-4 text-center">
          <p className="text-gray-600 text-base">
            Ready to experience all that WellFlow has to offer?
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="primary"
              onClick={() => {
                window.location.href = '/signup';
              }}
            >
              Start your free trial
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = '/features';
              }}
            >
              Explore all features
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;
