import React from 'react';

export interface FeatureCardProps {
  id: string;
  icon: string;        // SVG component name, emoji, or text icon
  title: string;
  description: string;
  badge?: string;
  className?: string;
}

// Conditionally use Framer Motion if available; fall back to CSS transitions
let MotionDiv: React.ElementType;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { motion } = require('framer-motion');
  MotionDiv = motion.div;
} catch {
  MotionDiv = 'div';
}

const hoverProps =
  MotionDiv !== 'div'
    ? {
        whileHover: {
          scale: 1.03,
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        },
        transition: { type: 'spring', stiffness: 300, damping: 20 },
      }
    : {};

export function FeatureCard({ id, icon, title, description, badge, className = '' }: FeatureCardProps) {
  return (
    <MotionDiv
      data-testid={`feature-card-${id}`}
      tabIndex={0}
      className={[
        'group flex flex-col items-start gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-6',
        'shadow-sm transition-all duration-200 hover:shadow-lg hover:border-green-800/50 hover:bg-gray-800/80',
        'outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...hoverProps}
    >
      {/* Icon */}
      <div
        data-testid={`feature-card-icon-${id}`}
        className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-2xl"
        aria-hidden="true"
      >
        {icon}
      </div>

      {/* Title + Badge */}
      <div className="flex flex-wrap items-center gap-2">
        <h3 data-testid={`feature-card-title-${id}`} className="text-lg font-semibold text-white">
          {title}
        </h3>
        {badge && (
          <span data-testid={`feature-card-badge-${id}`} className="inline-flex items-center rounded-full bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 text-xs font-medium text-green-400">
            {badge}
          </span>
        )}
      </div>

      {/* Description */}
      <p data-testid={`feature-card-description-${id}`} className="text-sm leading-relaxed text-gray-400">
        {description}
      </p>
    </MotionDiv>
  );
}

export default FeatureCard;
