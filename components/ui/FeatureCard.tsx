import React from 'react';

export interface FeatureCardProps {
  id: string;
  icon: string;        // SVG component name, emoji, or text icon
  title: string;
  description: string;
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

export function FeatureCard({ id, icon, title, description, className = '' }: FeatureCardProps) {
  return (
    <MotionDiv
      data-testid={`feature-card-${id}`}
      className={[
        'group flex flex-col items-start gap-4 rounded-2xl border border-gray-100 bg-white p-6',
        'shadow-sm transition-shadow duration-200 hover:shadow-md hover:border-brand-200',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...hoverProps}
    >
      {/* Icon */}
      <div
        data-testid={`feature-card-icon-${id}`}
        className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl"
        aria-hidden="true"
      >
        {icon}
      </div>

      {/* Title */}
      <h3
        data-testid={`feature-card-title-${id}`}
        className="text-lg font-semibold text-gray-900"
      >
        {title}
      </h3>

      {/* Description */}
      <p
        data-testid={`feature-card-description-${id}`}
        className="text-sm leading-relaxed text-gray-600"
      >
        {description}
      </p>
    </MotionDiv>
  );
}

export default FeatureCard;
