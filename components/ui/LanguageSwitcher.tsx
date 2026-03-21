'use client';

import { useLocale as useNextIntlLocale } from 'next-intl';
import { useRouter, usePathname } from '@/lib/navigation';
import { useLocale } from '@/hooks/useLocale';
import { locales, type Locale } from '@/lib/i18n';

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'EN',
  es: 'ES',
};

const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
};

export function LanguageSwitcher() {
  const currentLocale = useNextIntlLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { setLocale } = useLocale();

  function handleLocaleChange(locale: Locale) {
    if (locale === currentLocale) return;
    // Persist preference
    setLocale(locale);
    // Navigate to same path under new locale (no full page reload in App Router)
    router.replace(pathname, { locale });
  }

  return (
    <div
      role="group"
      aria-label="Language switcher"
      className="flex items-center gap-1"
    >
      {locales.map((locale) => {
        const isActive = locale === currentLocale;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => handleLocaleChange(locale)}
            aria-label={`Switch to ${LOCALE_NAMES[locale]}`}
            aria-pressed={isActive}
            lang={locale}
            className={[
              'px-2 py-1 text-xs font-semibold rounded transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2',
              isActive
                ? 'bg-green-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700',
            ].join(' ')}
          >
            {LOCALE_LABELS[locale]}
          </button>
        );
      })}
    </div>
  );
}

export default LanguageSwitcher;
