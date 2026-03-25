import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Learn how WellFlow collects, uses, and protects your personal data. We are committed to your privacy and transparency.',
  alternates: {
    canonical: 'https://wellflow.app/en/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <article>
        <header>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-500 text-sm mb-8">Last updated: January 2025</p>
        </header>

        <p className="text-gray-700 leading-relaxed mb-8">
          At WellFlow, your privacy matters. This policy explains what data we collect, why we
          collect it, and how we keep it safe.
        </p>

        <section aria-labelledby="data-collection">
          <h2 id="data-collection" className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
            1. Data We Collect
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We collect information you provide directly (such as your name and email address when
            you sign up) and data generated automatically when you use WellFlow (such as usage
            patterns and device information).
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">
            1.1 Account Information
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            When you create an account, we collect your email address and any profile details you
            choose to provide.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">
            1.2 Usage Data
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            We collect anonymized data about how you interact with WellFlow — such as which
            wellness sessions you complete — to improve the product.
          </p>
        </section>

        <section aria-labelledby="data-use">
          <h2 id="data-use" className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
            2. How We Use Your Data
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We use your data to provide and improve WellFlow, send you important service updates,
            and (with your consent) personalize your wellness experience.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            We never sell your personal data to third parties.
          </p>
        </section>

        <section aria-labelledby="data-sharing">
          <h2 id="data-sharing" className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
            3. Data Sharing
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We share data only with trusted service providers who help us operate WellFlow (such as
            cloud hosting and analytics), and only to the extent necessary. All partners are bound
            by strict data processing agreements.
          </p>
        </section>

        <section aria-labelledby="your-rights">
          <h2 id="your-rights" className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
            4. Your Rights
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Depending on your location, you may have the right to access, correct, or delete your
            personal data. To exercise any of these rights, contact us at{' '}
            <a
              href="mailto:privacy@wellflow.app"
              className="text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              privacy@wellflow.app
            </a>
            .
          </p>
        </section>

        <section aria-labelledby="contact-privacy">
          <h2 id="contact-privacy" className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
            5. Contact Us
          </h2>
          <p className="text-gray-700 leading-relaxed">
            If you have questions about this policy, reach out to our privacy team at{' '}
            <a
              href="mailto:privacy@wellflow.app"
              className="text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              privacy@wellflow.app
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
