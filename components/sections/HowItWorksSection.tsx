import React from 'react';
import { Button } from '@/components/ui/Button';

interface Step {
  number: number;
  icon: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    number: 1,
    icon: '📲',
    title: 'Set Up the App',
    description:
      'Download WellFlow, create your profile, and connect your preferred health platforms in minutes.',
  },
  {
    number: 2,
    icon: '🎙️',
    title: 'Speak Your Intent',
    description:
      'Simply say what you need — "I need to de-stress" or "guide me through a breathing exercise" — and WellFlow listens.',
  },
  {
    number: 3,
    icon: '🧘',
    title: 'Receive a Guided Response',
    description:
      'WellFlow delivers a personalized, voice-led wellness session tailored to your mood, goals, and biometric data.',
  },
  {
    number: 4,
    icon: '📈',
    title: 'Track Your Progress',
    description:
      'Review your wellness journey with insights, streaks, and trends that keep you motivated and on track.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-heading" className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2
            id="how-it-works-heading"
            className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
          >
            How WellFlow Works
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            From first launch to daily habit — your wellness journey in four simple steps.
          </p>
        </div>

        {/* Steps: horizontal timeline on desktop, vertical stack on mobile */}
        <div className="relative">
          {/* Connector line — visible on desktop only */}
          <div
            className="hidden lg:block absolute top-10 left-0 right-0 h-0.5 bg-brand-200"
            aria-hidden="true"
          />

          <ol className="flex flex-col lg:flex-row lg:items-start gap-10 lg:gap-0">
            {STEPS.map((step, index) => (
              <li
                key={step.number}
                className="relative flex flex-col items-center text-center lg:flex-1 lg:px-6"
              >
                {/* Step number badge + icon */}
                <div className="relative z-10 flex flex-col items-center gap-2 mb-4">
                  <div className="flex items-center justify-center w-20 h-20 rounded-full bg-brand-50 border-2 border-brand-200 text-4xl">
                    {step.icon}
                  </div>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold">
                    {step.number}
                  </span>
                </div>

                {/* Step content */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed max-w-xs">{step.description}</p>

                {/* Arrow between steps — mobile only */}
                {index < STEPS.length - 1 && (
                  <div className="lg:hidden mt-6 text-brand-400 text-2xl" aria-hidden="true">
                    ↓
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>

        {/* Closing CTA */}
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <p className="text-gray-600 text-base">
            Ready to start your wellness journey?
          </p>
          <Button
            variant="primary"
            onClick={() => {
              window.location.href = '/signup';
            }}
          >
            Get started for free
          </Button>
        </div>
      </div>
    </section>
  );
}

export default HowItWorksSection;
