'use client';

import Image from 'next/image';
import { useState } from 'react';

export interface IntegrationLogoProps {
  id: string;
  name: string;
  logoSrc: string;
  category: 'health-fitness' | 'calendar' | 'wearables' | 'messaging' | 'voice-ai' | 'wellness-platform';
  categoryLabel?: string;
  description?: string;
}

export function IntegrationLogo({ name, logoSrc, category, categoryLabel, description }: IntegrationLogoProps) {
  const isEmoji = logoSrc.length <= 4 && /\p{Emoji}/u.test(logoSrc);
  const [hovered, setHovered] = useState(false);

  const tooltipContent = description
    ? `${name} — ${description}`
    : categoryLabel
    ? `${name} · ${categoryLabel}`
    : name;

  return (
    <div
      className="group relative flex flex-col items-center justify-center p-4 rounded-xl bg-gray-900 border border-gray-800 shadow-sm hover:shadow-md hover:border-gray-700 transition-all duration-200 cursor-default"
      aria-label={name}
      data-category={category}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      tabIndex={0}
    >
      {/* Logo */}
      <div className="w-12 h-12 flex items-center justify-center">
        {isEmoji ? (
          <span className="text-3xl" role="img" aria-hidden="true">
            {logoSrc}
          </span>
        ) : (
          <Image
            src={logoSrc}
            alt={name}
            width={48}
            height={48}
            className="object-contain"
            loading="lazy"
          />
        )}
      </div>

      {/* Tooltip */}
      {hovered && (
        <div
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-gray-900 text-white text-xs whitespace-nowrap pointer-events-none z-10 max-w-[180px] text-center"
          role="tooltip"
        >
          {tooltipContent}
          {/* Arrow */}
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      )}
    </div>
  );
}
