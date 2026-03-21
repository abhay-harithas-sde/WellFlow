'use client';

import { useEffect, useState } from 'react';

interface WaveformAnimationProps {
  playing: boolean;
  barCount?: number;
  className?: string;
}

export default function WaveformAnimation({
  playing,
  barCount = 20,
  className = '',
}: WaveformAnimationProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const animate = playing && !reducedMotion;

  // Bar heights cycle through a natural waveform pattern
  const baseHeights = [4, 8, 14, 20, 28, 32, 28, 20, 14, 8, 4, 8, 16, 24, 32, 24, 16, 8, 12, 6];
  const svgHeight = 40;
  const barWidth = 3;
  const gap = 2;
  const totalWidth = barCount * (barWidth + gap) - gap;

  return (
    <>
      <style>{`
        @keyframes waveform-pulse {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
      `}</style>
      <svg
        width={totalWidth}
        height={svgHeight}
        viewBox={`0 0 ${totalWidth} ${svgHeight}`}
        aria-hidden="true"
        className={className}
      >
        {Array.from({ length: barCount }, (_, i) => {
          const height = baseHeights[i % baseHeights.length];
          const x = i * (barWidth + gap);
          const y = (svgHeight - height) / 2;
          const delayMs = (i / barCount) * 600;

          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={height}
              rx={1}
              className="fill-brand-500"
              style={
                animate
                  ? {
                      transformOrigin: `${x + barWidth / 2}px ${svgHeight / 2}px`,
                      animation: `waveform-pulse 800ms ease-in-out ${delayMs}ms infinite`,
                    }
                  : undefined
              }
            />
          );
        })}
      </svg>
    </>
  );
}
