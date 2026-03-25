import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['en', 'es'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export function isValidLocale(locale: string): locale is Locale {
  return (locales as readonly string[]).includes(locale);
}

export async function getMessages(locale: string) {
  if (!isValidLocale(locale)) notFound();
  return (await import(`../messages/${locale}.json`)).default;
}

export default getRequestConfig(async ({ locale }) => {
  if (!isValidLocale(locale)) notFound();
  return {
    messages: await getMessages(locale),
  };
});
