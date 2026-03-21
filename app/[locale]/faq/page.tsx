import type { Metadata } from 'next';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import FAQSection from '@/components/sections/FAQSection';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Answers to the most common questions about WellFlow — pricing, supported devices, privacy, and getting started.',
  alternates: {
    canonical: 'https://wellflow.app/en/faq',
  },
};

export default function FAQPage() {
  return (
    <>
      <Navigation />
      <main id="main-content">
        <header className="bg-gray-950 border-b border-gray-800 py-16 px-4 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Everything you need to know about WellFlow — pricing, devices, privacy, and getting
            started.
          </p>
        </header>

        <section aria-labelledby="faq-interactive" className="py-8">
          <h2 id="faq-interactive" className="sr-only">
            Interactive FAQ
          </h2>
          <FAQSection />
        </section>

        <section
          aria-labelledby="faq-quick-answers"
          className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-gray-950"
        >
          <h2
            id="faq-quick-answers"
            className="text-2xl font-semibold text-white mb-8"
          >
            Quick Answers
          </h2>

          <dl className="space-y-6">
            <div>
              <dt>
                <h3 className="text-lg font-medium text-white">
                  Is WellFlow free to try?
                </h3>
              </dt>
              <dd className="mt-2 text-gray-400">
                Yes — WellFlow offers a free tier with core breathing and mindfulness features. No
                credit card required.
              </dd>
            </div>

            <div>
              <dt>
                <h3 className="text-lg font-medium text-white">
                  Which devices does WellFlow support?
                </h3>
              </dt>
              <dd className="mt-2 text-gray-400">
                WellFlow works on iOS, Android, and all modern web browsers. Wearable integrations
                are available on Premium and Pro plans.
              </dd>
            </div>

            <div>
              <dt>
                <h3 className="text-lg font-medium text-white">
                  How does Murf AI voice work?
                </h3>
              </dt>
              <dd className="mt-2 text-gray-400">
                WellFlow uses Murf AI to generate natural-sounding voice guidance for breathing
                exercises and mindfulness sessions. You can choose from multiple voices and
                languages.
              </dd>
            </div>

            <div>
              <dt>
                <h3 className="text-lg font-medium text-white">
                  Can I cancel my subscription at any time?
                </h3>
              </dt>
              <dd className="mt-2 text-gray-400">
                Absolutely. You can cancel your subscription at any time from your account
                settings. You will retain access until the end of your billing period.
              </dd>
            </div>
          </dl>
        </section>
      </main>
      <Footer />
    </>
  );
}
