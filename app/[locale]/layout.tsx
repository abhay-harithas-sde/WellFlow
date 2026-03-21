import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, getMessages, type Locale } from '@/lib/i18n';
import SkipLink from '@/components/layout/SkipLink';
import ClientProviders from '@/components/layout/ClientProviders';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'WellFlow — Your Voice-Powered Wellness Companion',
    template: '%s | WellFlow',
  },
  description:
    'WellFlow guides you through breathing exercises, mindfulness sessions, and daily wellness routines — all hands-free, just by speaking.',
  metadataBase: new URL('https://wellflow.app'),
  alternates: {
    canonical: 'https://wellflow.app/en',
  },
  openGraph: {
    type: 'website',
    siteName: 'WellFlow',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  if (!(locales as readonly string[]).includes(locale)) {
    notFound();
  }

  const messages = await getMessages(locale as Locale);
  const t = await getTranslations({ locale: locale as Locale, namespace: 'a11y' });

  return (
    <html lang={locale} className="bg-gray-950">
      <body className="bg-gray-950 text-white antialiased">
        <SkipLink label={t('skipToMain')} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <ClientProviders />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
