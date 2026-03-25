'use client';

import { useState, useEffect } from 'react';
import { locales, defaultLocale } from '@/lib/i18n';

export type LocaleRecord = string; // BCP 47 locale code, e.g. "en" | "es"

const STORAGE_KEY = 'wf_locale';

function readFromStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeToStorage(locale: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage unavailable (private browsing, quota exceeded) — in-memory state is used
  }
}

function detectBrowserLocale(): string {
  try {
    const browserLang = navigator.language?.split('-')[0];
    if (browserLang && (locales as readonly string[]).includes(browserLang)) {
      return browserLang;
    }
  } catch {
    // navigator not available (SSR or restricted environment)
  }
  return defaultLocale;
}

export function useLocale(): {
  locale: LocaleRecord;
  setLocale: (locale: string) => void;
} {
  const [locale, setLocaleState] = useState<LocaleRecord>(defaultLocale);

  useEffect(() => {
    const stored = readFromStorage();
    if (stored && (locales as readonly string[]).includes(stored)) {
      setLocaleState(stored);
    } else {
      setLocaleState(detectBrowserLocale());
    }
  }, []);

  const setLocale = (newLocale: string) => {
    writeToStorage(newLocale);
    setLocaleState(newLocale);
  };

  return { locale, setLocale };
}
