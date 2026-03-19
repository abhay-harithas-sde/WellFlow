import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface TrustIndicator {
  label: string;
  value: string;
}

export interface HeroProps {
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaHref: string;
  trustIndicators: TrustIndicator[];
  visualSrc: string;
}

export default function HeroSection({
  headline,
  subheadline,
  ctaLabel,
  ctaHref,
  trustIndicators,
  visualSrc,
}: HeroProps) {
  return (
    <section
      id="hero"
      aria-label="Hero"
      className="relative overflow-hidden bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
          {/* Text content */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left lg:flex-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              {headline}
            </h1>

            <p className="mt-4 max-w-xl text-lg text-gray-600 sm:text-xl">
              {subheadline}
            </p>

            {/* Primary CTA */}
            <div className="mt-8">
              <Link href={ctaHref} passHref legacyBehavior>
                <Button
                  variant="primary"
                  className="px-8 py-3 text-base"
                  aria-label={ctaLabel}
                >
                  {ctaLabel}
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            {trustIndicators.length > 0 && (
              <ul
                aria-label="Trust indicators"
                className="mt-8 flex flex-wrap justify-center gap-6 lg:justify-start"
              >
                {trustIndicators.map((indicator) => (
                  <li key={indicator.label} className="flex flex-col items-center lg:items-start">
                    <span className="text-2xl font-bold text-brand-600">
                      {indicator.value}
                    </span>
                    <span className="text-sm text-gray-500">{indicator.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Visual element — priority loaded for LCP */}
          <div className="relative w-full max-w-sm sm:max-w-md lg:flex-1 lg:max-w-none">
            <Image
              src={visualSrc}
              alt="WellFlow voice-powered wellness experience"
              width={600}
              height={500}
              priority
              className="h-auto w-full rounded-2xl object-cover shadow-xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
