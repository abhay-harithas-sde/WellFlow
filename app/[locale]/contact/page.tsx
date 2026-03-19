import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with the WellFlow team. We are here to help with support questions, partnership inquiries, and feedback.',
  alternates: {
    canonical: 'https://wellflow.app/en/contact',
  },
};

export default function ContactPage() {
  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <header>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
        <p className="text-gray-600 text-lg mb-10">
          We&apos;d love to hear from you. Choose the channel that works best for you.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">

        <section aria-labelledby="support-heading" className="bg-gray-50 rounded-2xl p-6">
          <h2 id="support-heading" className="text-xl font-semibold text-gray-900 mb-2">
            Support
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            Having trouble with the app or your account? Our support team typically responds within
            one business day.
          </p>
          <a
            href="mailto:support@wellflow.app"
            className="text-blue-600 font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            support@wellflow.app
          </a>
        </section>

        <section aria-labelledby="partnerships-heading" className="bg-gray-50 rounded-2xl p-6">
          <h2 id="partnerships-heading" className="text-xl font-semibold text-gray-900 mb-2">
            Partnerships
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            Interested in integrating WellFlow into your platform or exploring a business
            partnership?
          </p>
          <a
            href="mailto:partnerships@wellflow.app"
            className="text-blue-600 font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            partnerships@wellflow.app
          </a>
        </section>

        <section aria-labelledby="press-heading" className="bg-gray-50 rounded-2xl p-6">
          <h2 id="press-heading" className="text-xl font-semibold text-gray-900 mb-2">
            Press &amp; Media
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            Journalists and content creators can reach our communications team for press kits,
            interviews, and media assets.
          </p>
          <a
            href="mailto:press@wellflow.app"
            className="text-blue-600 font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            press@wellflow.app
          </a>
        </section>

        <section aria-labelledby="privacy-contact-heading" className="bg-gray-50 rounded-2xl p-6">
          <h2 id="privacy-contact-heading" className="text-xl font-semibold text-gray-900 mb-2">
            Privacy Inquiries
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            For data access requests, deletion requests, or any privacy-related questions, contact
            our privacy team.
          </p>
          <a
            href="mailto:privacy@wellflow.app"
            className="text-blue-600 font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            privacy@wellflow.app
          </a>
        </section>
      </div>

      <section aria-labelledby="social-heading" className="mt-12">
        <h2 id="social-heading" className="text-2xl font-semibold text-gray-900 mb-4">
          Find Us Online
        </h2>
        <p className="text-gray-600 mb-4">
          Follow WellFlow for product updates, wellness tips, and community highlights.
        </p>
        <ul className="flex flex-col sm:flex-row gap-4 list-none p-0 m-0">
          <li>
            <a
              href="https://twitter.com/wellflowapp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              X (Twitter)
            </a>
          </li>
          <li>
            <a
              href="https://linkedin.com/company/wellflowapp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              LinkedIn
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
