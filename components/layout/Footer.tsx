import React from 'react';

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Cookie Policy', href: '/cookie-policy' },
  { label: 'Contact', href: '/contact' },
  { label: 'FAQ', href: '/faq' },
];

function TwitterIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

const socialLinks = [
  {
    label: 'WellFlow on X (Twitter)',
    href: 'https://twitter.com/wellflowapp',
    icon: <TwitterIcon />,
  },
  {
    label: 'WellFlow on LinkedIn',
    href: 'https://linkedin.com/company/wellflowapp',
    icon: <LinkedInIcon />,
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Desktop: 3-column grid; Mobile: single column */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">

          {/* Column 1: Logo + tagline */}
          <div className="flex flex-col gap-3">
            <a
              href="/"
              className="text-2xl font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded w-fit"
              aria-label="WellFlow home"
            >
              WellFlow
            </a>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your voice-powered wellness companion
            </p>
          </div>

          {/* Column 2: Legal links */}
          <nav aria-label="Legal and secondary navigation">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
              Legal
            </h2>
            <ul className="flex flex-col gap-2 list-none m-0 p-0">
              {legalLinks.map(({ label, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-sm text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Column 3: Social links */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
              Follow Us
            </h2>
            <ul className="flex flex-row gap-4 list-none m-0 p-0">
              {socialLinks.map(({ label, href, icon }) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="inline-flex items-center justify-center text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded"
                  >
                    {icon}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-10 border-t border-gray-700 pt-6">
          <p className="text-xs text-gray-500 text-center">
            &copy; {year} WellFlow. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
