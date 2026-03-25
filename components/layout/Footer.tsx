'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function TwitterIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

export default function Footer() {
  const t = useTranslations('footer');
  const year = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  function handleNewsletterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!EMAIL_PATTERN.test(email)) {
      setEmailError(t('newsletter.error'));
      return;
    }
    setEmailError('');
    setSubscribed(true);
  }

  const legalLinks = [
    { key: 'privacy' as const, href: '/privacy', label: t('legal.privacy') },
    { key: 'terms' as const, href: '/terms', label: t('legal.terms') },
    { key: 'cookie' as const, href: '/cookie-policy', label: t('legal.cookie') },
    { key: 'contact' as const, href: '/contact', label: t('legal.contact') },
    { key: 'faq' as const, href: '/faq', label: t('legal.faq') },
  ];

  const socialLinks = [
    { key: 'twitter', href: 'https://twitter.com/wellflowapp', label: t('social.twitter'), icon: <TwitterIcon /> },
    { key: 'instagram', href: 'https://instagram.com/wellflowapp', label: t('social.instagram'), icon: <InstagramIcon /> },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">

          {/* Logo + tagline + language switcher */}
          <div className="flex flex-col gap-3">
            <Link href="/" className="text-2xl font-bold text-white rounded w-fit" aria-label="WellFlow home">
              WellFlow
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">{t('tagline')}</p>
            <div className="mt-2">
              <LanguageSwitcher />
            </div>
          </div>

          {/* Legal links */}
          <nav aria-label="Legal and secondary navigation">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Legal</h2>
            <ul className="flex flex-col gap-2 list-none m-0 p-0">
              {legalLinks.map(({ key, href, label }) => (
                <li key={key}>
                  <Link href={href} className="text-sm text-gray-400 hover:text-white transition-colors rounded">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Social links */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Follow Us</h2>
            <ul className="flex flex-row gap-4 list-none m-0 p-0">
              {socialLinks.map(({ key, href, label, icon }) => (
                <li key={key}>
                  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                    className="inline-flex items-center justify-center text-gray-400 hover:text-white transition-colors rounded">
                    {icon}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter signup */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">{t('newsletter.label')}</h2>
            {subscribed ? (
              <p className="text-sm text-green-400" role="status">{t('newsletter.success')}</p>
            ) : (
              <form onSubmit={handleNewsletterSubmit} noValidate>
                <div className="flex flex-col gap-2">
                  <label htmlFor="footer-newsletter-email" className="sr-only">{t('newsletter.placeholder')}</label>
                  <input
                    id="footer-newsletter-email" type="email" value={email}
                    onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(''); }}
                    placeholder={t('newsletter.placeholder')}
                    aria-describedby={emailError ? 'footer-newsletter-error' : undefined}
                    aria-invalid={emailError ? 'true' : undefined}
                    className="w-full px-3 py-2 text-sm rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  />
                  {emailError && (
                    <p id="footer-newsletter-error" role="alert" className="text-xs text-red-400">{emailError}</p>
                  )}
                  <button type="submit"
                    className="px-4 py-2 text-sm font-semibold rounded bg-brand-600 text-white hover:bg-brand-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
                    {t('newsletter.submit')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="mt-10 border-t border-gray-700 pt-6">
          <p className="text-xs text-gray-500 text-center">{t('copyright', { year })}</p>
        </div>
      </div>
    </footer>
  );
}
