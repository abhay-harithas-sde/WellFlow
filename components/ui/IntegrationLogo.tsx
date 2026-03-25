import Image from 'next/image';

export interface IntegrationLogoProps {
  id: string;
  name: string;
  logoSrc: string;
  category: 'health-fitness' | 'calendar' | 'wearables' | 'messaging';
}

export function IntegrationLogo({ name, logoSrc, category }: IntegrationLogoProps) {
  const isEmoji = logoSrc.length <= 4 && /\p{Emoji}/u.test(logoSrc);

  return (
    <div
      className="group relative flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-default"
      aria-label={name}
      data-category={category}
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
      <div
        className="absolute -bottom-9 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10"
        role="tooltip"
      >
        {name}
        {/* Arrow */}
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
      </div>
    </div>
  );
}
