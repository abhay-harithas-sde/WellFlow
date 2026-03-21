import type { Metadata } from 'next';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description:
    'Find out how WellFlow uses cookies and similar technologies, what data they collect, and how you can manage your preferences.',
  alternates: {
    canonical: 'https://wellflow.app/en/cookie-policy',
  },
};

export default function CookiePolicyPage() {
  return (
    <>
      <Navigation />
      <main id="main-content" className="bg-gray-950 min-h-screen">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <header>
            <h1 className="text-4xl font-bold text-white mb-4">Cookie Policy</h1>
            <p className="text-gray-500 text-sm mb-8">Last updated: January 2025</p>
          </header>

          <p className="text-gray-400 leading-relaxed mb-8">
            This Cookie Policy explains what cookies are, how WellFlow uses them, and the choices you have regarding their use.
          </p>

          <section aria-labelledby="what-are-cookies">
            <h2 id="what-are-cookies" className="text-2xl font-semibold text-white mt-10 mb-4">1. What Are Cookies?</h2>
            <p className="text-gray-400 leading-relaxed mb-4">
              Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences and understand how you interact with their content.
            </p>
          </section>

          <section aria-labelledby="cookies-we-use">
            <h2 id="cookies-we-use" className="text-2xl font-semibold text-white mt-10 mb-4">2. Cookies We Use</h2>
            <h3 className="text-xl font-semibold text-gray-200 mt-6 mb-3">2.1 Essential Cookies</h3>
            <p className="text-gray-400 leading-relaxed mb-4">
              These cookies are necessary for the website to function and cannot be disabled. They include your cookie consent preference (<code className="bg-gray-800 text-green-400 px-1 rounded text-sm">wf_cookie_consent</code>) and language preference (<code className="bg-gray-800 text-green-400 px-1 rounded text-sm">wf_locale</code>).
            </p>
            <h3 className="text-xl font-semibold text-gray-200 mt-6 mb-3">2.2 Analytics Cookies</h3>
            <p className="text-gray-400 leading-relaxed mb-4">
              With your consent, we use Google Analytics 4 to understand how visitors use WellFlow. These cookies collect anonymized data such as pages visited and session duration. No analytics cookies are loaded without your explicit consent.
            </p>
          </section>

          <section aria-labelledby="managing-cookies">
            <h2 id="managing-cookies" className="text-2xl font-semibold text-white mt-10 mb-4">3. Managing Your Cookie Preferences</h2>
            <p className="text-gray-400 leading-relaxed mb-4">
              You can withdraw your consent at any time by clearing your browser&apos;s local storage or by using your browser&apos;s built-in cookie management tools. Declining analytics cookies will not affect your ability to use WellFlow.
            </p>
          </section>

          <section aria-labelledby="third-party-cookies">
            <h2 id="third-party-cookies" className="text-2xl font-semibold text-white mt-10 mb-4">4. Third-Party Cookies</h2>
            <p className="text-gray-400 leading-relaxed mb-4">
              We do not allow third-party advertising cookies on WellFlow. The only third-party cookies we use are Google Analytics, and only after you have given consent.
            </p>
          </section>

          <section aria-labelledby="contact-cookies">
            <h2 id="contact-cookies" className="text-2xl font-semibold text-white mt-10 mb-4">5. Contact Us</h2>
            <p className="text-gray-400 leading-relaxed">
              If you have questions about our use of cookies, contact us at{' '}
              <a href="mailto:privacy@wellflow.app" className="text-green-400 hover:text-green-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded">
                privacy@wellflow.app
              </a>.
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
