import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Read the WellFlow Terms of Service to understand your rights and responsibilities when using our voice-powered wellness platform.',
  alternates: {
    canonical: 'https://wellflow.app/en/terms',
  },
};

export default function TermsPage() {
  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <article>
        <header>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-500 text-sm mb-8">Last updated: January 2025</p>
        </header>

        <p className="text-gray-700 leading-relaxed mb-8">
          By using WellFlow, you agree to these Terms of Service. Please read them carefully before
          creating an account or using any part of our platform.
        </p>

        <section aria-labelledby="acceptance">
          <h2 id="acceptance" className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
            1. Acceptance of Terms
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            These terms form a binding agreement between you and WellFlow. If you do not agree,
            please do not use our services.
          </p>
        </section>

        <section aria-labelledby="use-of-service">
          <h2 id="use-of-service" className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
            2. Use of the Service
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            WellFlow is a wellness companion app. You agree to use it only for lawful, personal
            wellness purposes and not to misuse or attempt to disrupt the service.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">
            2.1 Eligibility
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            You must be at least 13 years old to use WellFlow. If you are under 18, you must have
            parental or guardian consent.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">
            2.2 Account Responsibility
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            You are responsible for maintaining the security of your account credentials and for all
            activity that occurs under your account.
          </p>
        </section>

        <section aria-labelledby="intellectual-property">
          <h2 id="intellectual-property" className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
            3. Intellectual Property
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            All content, branding, and software within WellFlow are owned by WellFlow or its
            licensors. You may not copy, modify, or distribute any part of the service without
            written permission.
          </p>
        </section>

        <section aria-labelledby="disclaimers">
          <h2 id="disclaimers" className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
            4. Health Disclaimer
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            WellFlow provides general wellness guidance and is not a substitute for professional
            medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider
            for medical concerns.
          </p>
        </section>

        <section aria-labelledby="termination">
          <h2 id="termination" className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
            5. Termination
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We reserve the right to suspend or terminate your account if you violate these terms.
            You may also delete your account at any time from your account settings.
          </p>
        </section>

        <section aria-labelledby="contact-terms">
          <h2 id="contact-terms" className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
            6. Contact
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Questions about these terms? Email us at{' '}
            <a
              href="mailto:legal@wellflow.app"
              className="text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              legal@wellflow.app
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
