import dynamic from 'next/dynamic';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/sections/HeroSection';

const StatsSection = dynamic(
  () => import('@/components/sections/StatsSection'),
  { loading: () => <div className="h-32 animate-pulse bg-gray-800" /> }
);

const FeaturesSection = dynamic(
  () => import('@/components/sections/FeaturesSection').then((m) => ({ default: m.FeaturesSection })),
  { loading: () => <div className="h-32 animate-pulse bg-gray-800" /> }
);

const VoiceDemoSection = dynamic(
  () => import('@/components/sections/VoiceDemoSection'),
  { loading: () => <div className="h-32 animate-pulse bg-gray-800" /> }
);

const HowItWorksSection = dynamic(
  () => import('@/components/sections/HowItWorksSection').then((m) => ({ default: m.HowItWorksSection })),
  { loading: () => <div className="h-32 animate-pulse bg-gray-800" /> }
);

const DemoSection = dynamic(
  () => import('@/components/sections/DemoSection'),
  { loading: () => <div className="h-32 animate-pulse bg-gray-800" /> }
);

const IntegrationsSection = dynamic(
  () => import('@/components/sections/IntegrationsSection'),
  { loading: () => <div className="h-32 animate-pulse bg-gray-800" /> }
);

const TestimonialsSection = dynamic(
  () => import('@/components/sections/TestimonialsSection'),
  { loading: () => <div className="h-32 animate-pulse bg-gray-800" /> }
);

const PricingSection = dynamic(
  () => import('@/components/sections/PricingSection'),
  { loading: () => <div className="h-32 animate-pulse bg-gray-800" /> }
);

const FAQSection = dynamic(
  () => import('@/components/sections/FAQSection'),
  { loading: () => <div className="h-32 animate-pulse bg-gray-800" /> }
);

const CTASection = dynamic(
  () => import('@/components/sections/CTASection'),
  { loading: () => <div className="h-32 animate-pulse bg-gray-800" /> }
);

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: PageProps) {
  await params;

  return (
    <>
      <Navigation />
      <main id="main-content">
        <HeroSection visualSrc="/images/hero-visual.png" />
        <StatsSection />
        <FeaturesSection />
        <VoiceDemoSection />
        <HowItWorksSection />
        <DemoSection />
        <IntegrationsSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
