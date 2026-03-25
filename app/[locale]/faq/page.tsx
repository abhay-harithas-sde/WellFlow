import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Answers to the most common questions about WellFlow — pricing, supported devices, privacy, and getting started.',
  alternates: {
    canonical: 'https://wellflow.app/en/faq',
  },
};

const faqs = [
  {
    id: 'what-is-wellflow',
    question: 'What is WellFlow?',
    answer:
      'WellFlow is a voice-powered wellness companion that guides you through breathing exercises, mindfulness sessions, and daily wellness routines — all hands-free, just by speaking.',
  },
  {
    id: 'how-does-voice-work',
    question: 'How does the voice interaction work?',
    answer:
      'Simply speak your wellness intent — for example, "I need a 5-minute breathing exercise" — and WellFlow responds with a guided session tailored to your request. No tapping or typing required.',
  },
  {
    id: 'supported-devices',
    question: 'Which devices and platforms does WellFlow support?',
    answer:
      'WellFlow integrates with Apple Health, Google Fit, Fitbit, Garmin, Apple Watch, Wear OS, Oura, and more. It also connects with Google Calendar, Apple Calendar, and Outlook for routine reminders.',
  },
  {
    id: 'free-plan',
    question: 'Is there a free plan?',
    answer:
      'Yes. WellFlow offers a free tier with access to core breathing and mindfulness sessions. Premium plans unlock advanced features, unlimited sessions, and deeper health integrations.',
  },
  {
    id: 'cancel-subscription',
    question: 'Can I cancel my subscription at any time?',
    answer:
      'Absolutely. You can cancel your subscription at any time from your account settings. You will retain access to premium features until the end of your current billing period.',
  },
  {
    id: 'data-privacy',
    question: 'How does WellFlow handle my health data?',
    answer:
      'Your health data is encrypted in transit and at rest. We never sell your personal data to third parties. You can review our full Privacy Policy for details on how we collect and use your information.',
  },
  {
    id: 'languages',
    question: 'What languages does WellFlow support?',
    answer:
      'WellFlow currently supports English and Spanish, with more languages planned. The app automatically detects your browser language and applies it on first load.',
  },
  {
    id: 'offline',
    question: 'Does WellFlow work offline?',
    answer:
      'Some core sessions are available offline once downloaded. Features that require real-time voice processing or calendar sync need an internet connection.',
  },
];

const categories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    ids: ['what-is-wellflow', 'how-does-voice-work'],
  },
  {
    id: 'features-integrations',
    title: 'Features & Integrations',
    ids: ['supported-devices', 'offline'],
  },
  {
    id: 'pricing-billing',
    title: 'Pricing & Billing',
    ids: ['free-plan', 'cancel-subscription'],
  },
  {
    id: 'privacy-security',
    title: 'Privacy & Security',
    ids: ['data-privacy', 'languages'],
  },
];

export default function FAQPage() {
  const faqMap = Object.fromEntries(faqs.map((f) => [f.id, f]));

  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <header>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h1>
        <p className="text-gray-600 text-lg mb-10">
          Can&apos;t find what you&apos;re looking for?{' '}
          <a
            href="/contact"
            className="text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            Contact our support team
          </a>
          .
        </p>
      </header>

      {categories.map((category) => (
        <section key={category.id} aria-labelledby={`cat-${category.id}`} className="mb-12">
          <h2
            id={`cat-${category.id}`}
            className="text-2xl font-semibold text-gray-900 mb-6 pb-2 border-b border-gray-200"
          >
            {category.title}
          </h2>

          <dl className="space-y-6">
            {category.ids.map((id) => {
              const faq = faqMap[id];
              if (!faq) return null;
              return (
                <article key={faq.id}>
                  <dt>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{faq.question}</h3>
                  </dt>
                  <dd className="text-gray-600 leading-relaxed">{faq.answer}</dd>
                </article>
              );
            })}
          </dl>
        </section>
      ))}
    </main>
  );
}
