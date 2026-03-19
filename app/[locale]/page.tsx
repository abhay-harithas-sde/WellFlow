import { getTranslations } from 'next-intl/server';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/sections/HeroSection';
import { FeaturesSection } from '@/components/sections/FeaturesSection';
import { HowItWorksSection } from '@/components/sections/HowItWorksSection';
import IntegrationsSection from '@/components/sections/IntegrationsSection';
import TestimonialsSection from '@/components/sections/TestimonialsSection';
import PricingSection from '@/components/sections/PricingSection';

interface PageProps {
  params: { locale: string };
}

export default async function HomePage({ params: { locale } }: PageProps) {
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tHero = await getTranslations({ locale, namespace: 'hero' });

  const navLinks = [
    { label: tNav('features'), href: '#features' },
    { label: tNav('howItWorks'), href: '#how-it-works' },
    { label: tNav('integrations'), href: '#integrations' },
    { label: tNav('testimonials'), href: '#testimonials' },
    { label: tNav('pricing'), href: '#pricing' },
  ];

  const trustIndicators = [
    { label: tHero('trustUsers'), value: '50,000+' },
    { label: tHero('trustRating'), value: '4.8★' },
    { label: tHero('trustAward'), value: '🏆' },
  ];

  return (
    <>
      <Navigation
        links={navLinks}
        ctaLabel={tNav('cta')}
        ctaHref="#pricing"
      />
      <main id="main-content">
        <HeroSection
          headline={tHero('headline')}
          subheadline={tHero('subheadline')}
          ctaLabel={tHero('cta')}
          ctaHref="/signup"
          trustIndicators={trustIndicators}
          visualSrc="/images/hero-visual.png"
        />
        <FeaturesSection />
        <HowItWorksSection />
        <IntegrationsSection />
        <TestimonialsSection />
        <PricingSection />
      </main>
      <Footer />
    </>
  );
}
