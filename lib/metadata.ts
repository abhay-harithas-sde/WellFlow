import type { Metadata } from 'next';

const metadataBase = new URL('https://wellflow.app');

export const homepageMetadata: Metadata = {
  metadataBase,
  title: 'WellFlow — Your Voice-Powered Wellness Companion',
  description:
    'WellFlow guides you through breathing exercises, mindfulness sessions, and daily wellness routines — all hands-free, just by speaking.',
  alternates: {
    canonical: 'https://wellflow.app/en',
  },
  openGraph: {
    type: 'website',
    url: 'https://wellflow.app',
    siteName: 'WellFlow',
    title: 'WellFlow — Your Voice-Powered Wellness Companion',
    description:
      'WellFlow guides you through breathing exercises, mindfulness sessions, and daily wellness routines — all hands-free, just by speaking.',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'WellFlow — Your Voice-Powered Wellness Companion',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WellFlow — Your Voice-Powered Wellness Companion',
    description:
      'WellFlow guides you through breathing exercises, mindfulness sessions, and daily wellness routines — all hands-free, just by speaking.',
    images: ['/images/og-image.png'],
  },
};

export const privacyMetadata: Metadata = {
  metadataBase,
  title: 'Privacy Policy | WellFlow',
  description:
    'Learn how WellFlow collects, uses, and protects your personal data. We are committed to your privacy and transparency.',
  alternates: {
    canonical: 'https://wellflow.app/en/privacy',
  },
};

export const termsMetadata: Metadata = {
  metadataBase,
  title: 'Terms of Service | WellFlow',
  description:
    'Read the WellFlow Terms of Service to understand your rights and responsibilities when using our voice-powered wellness platform.',
  alternates: {
    canonical: 'https://wellflow.app/en/terms',
  },
};

export const cookiePolicyMetadata: Metadata = {
  metadataBase,
  title: 'Cookie Policy | WellFlow',
  description:
    'Find out how WellFlow uses cookies and similar technologies, what data they collect, and how you can manage your preferences.',
  alternates: {
    canonical: 'https://wellflow.app/en/cookie-policy',
  },
};

export const contactMetadata: Metadata = {
  metadataBase,
  title: 'Contact Us | WellFlow',
  description:
    'Get in touch with the WellFlow team. We are here to help with support questions, partnership inquiries, and feedback.',
  alternates: {
    canonical: 'https://wellflow.app/en/contact',
  },
};

export const faqMetadata: Metadata = {
  metadataBase,
  title: 'FAQ | WellFlow',
  description:
    'Answers to the most common questions about WellFlow — pricing, supported devices, privacy, and getting started.',
  alternates: {
    canonical: 'https://wellflow.app/en/faq',
  },
};
