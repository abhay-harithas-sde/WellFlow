'use client';

import { useEffect, useState } from 'react';
import type { BreathingPhase } from '@/src/components/BreathingGuide';

interface BreathingCircleProps {
  phase: BreathingPhase | null;
  className?: string;
}

const PHASE_LABELS: Record<'inhale' | 'hold' | 'exhale', string> = {
  inhale: 'Inhale',
  hold: 'Hold',
  exhale: 'Exhale',
};

// Map each phase to a Tailwind scale class and animation duration
const PHASE_STYLES: Record<'inhale' | 'hold' | 'exhale', { scale: string; duration: string }> = {
  inhale: { scale: 'scale-150', duration: 'duration-[4000ms]' },
  hold:   { scale: 'scale-150', duration: 'duration-[200ms]' },
  exhale: { scale: 'scale-100', duration: 'duration-[4000ms]' },
};

export default function BreathingCircle({ phase, className = '' }: BreathingCircleProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const label = phase ? PHASE_LABELS[phase.label] : 'Ready';
  const phaseStyle = phase ? PHASE_STYLES[phase.label] : null;

  if (reducedMotion) {
    // Reduced motion: show phase label text only, no animation
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-brand-100 w-40 h-40 ${className}`}
        aria-live="polite"
        aria-label={`Breathing phase: ${label}`}
      >
        <span className="text-brand-700 text-xl font-semibold">{label}</span>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes breathing-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
      `}</style>
      <div
        className={`relative flex items-center justify-center ${className}`}
        aria-live="polite"
        aria-label={`Breathing phase: ${label}`}
      >
        {/* Outer glow ring */}
        <div
          className={`absolute rounded-full bg-brand-300 opacity-30 w-40 h-40 transition-transform ease-in-out ${
            phaseStyle ? `${phaseStyle.scale} ${phaseStyle.duration}` : 'scale-100 duration-300'
          }`}
          style={
            phase?.label === 'hold'
              ? { animation: 'breathing-pulse 2000ms ease-in-out infinite' }
              : undefined
          }
        />
        {/* Main circle */}
        <div
          className={`relative rounded-full bg-brand-500 w-32 h-32 flex items-center justify-center transition-transform ease-in-out ${
            phaseStyle ? `${phaseStyle.scale} ${phaseStyle.duration}` : 'scale-100 duration-300'
          }`}
        >
          <span className="text-white text-lg font-semibold select-none">{label}</span>
        </div>
      </div>
    </>
  );
}
