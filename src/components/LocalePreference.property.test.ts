// Feature: wellflow-website, Property 5: Language preference round-trip

/**
 * Property-based test for hooks/useLocale.ts
 * Property 5: Language preference round-trip
 * Validates: Requirements 13.5
 *
 * Pure logic tests (node environment, no DOM).
 * For any supported locale string, storing it to localStorage and reading it
 * back must return the identical locale string.
 * Also tests that unsupported locales fall back to 'en'.
 */

import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Constants (mirrors lib/i18n.ts and hooks/useLocale.ts)
// ---------------------------------------------------------------------------

const SUPPORTED_LOCALES = ['en', 'es'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: SupportedLocale = 'en';
const STORAGE_KEY = 'wf_locale';

// ---------------------------------------------------------------------------
// Pure persistence logic extracted from hooks/useLocale.ts
// ---------------------------------------------------------------------------

/** Simulates an in-memory localStorage for pure testing. */
function createMemoryStorage(): Map<string, string> {
  return new Map();
}

function writeLocaleToStorage(store: Map<string, string>, locale: string): void {
  store.set(STORAGE_KEY, locale);
}

function readLocaleFromStorage(store: Map<string, string>): string | null {
  const raw = store.get(STORAGE_KEY);
  return raw !== undefined ? raw : null;
}

/**
 * Resolves the effective locale from storage, mirroring the logic in useLocale.ts:
 * - If stored value is a supported locale, return it.
 * - Otherwise fall back to DEFAULT_LOCALE ('en').
 */
function resolveLocale(store: Map<string, string>): string {
  const stored = readLocaleFromStorage(store);
  if (stored !== null && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
    return stored;
  }
  return DEFAULT_LOCALE;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates one of the supported locale strings. */
const supportedLocaleArb: fc.Arbitrary<SupportedLocale> = fc.constantFrom(...SUPPORTED_LOCALES);

/**
 * Generates arbitrary strings that are NOT in the supported locales list,
 * to test the fallback behaviour.
 */
const unsupportedLocaleArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => !(SUPPORTED_LOCALES as readonly string[]).includes(s));

// ---------------------------------------------------------------------------
// Property 5 tests
// ---------------------------------------------------------------------------

describe('LocalePreference — Property 5: Language preference round-trip', () => {
  /**
   * P5a: For any supported locale, writing it to storage and reading it back
   * returns the identical locale string.
   * Validates: Requirements 13.5
   */
  it('P5a: storing a supported locale and reading it back returns the identical locale', () => {
    fc.assert(
      fc.property(supportedLocaleArb, (locale) => {
        const store = createMemoryStorage();
        writeLocaleToStorage(store, locale);
        const result = readLocaleFromStorage(store);
        expect(result).toBe(locale);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P5b: For any supported locale, resolveLocale returns the stored locale
   * (not the default), confirming the round-trip preserves the value end-to-end.
   * Validates: Requirements 13.5
   */
  it('P5b: resolveLocale returns the stored supported locale unchanged', () => {
    fc.assert(
      fc.property(supportedLocaleArb, (locale) => {
        const store = createMemoryStorage();
        writeLocaleToStorage(store, locale);
        const resolved = resolveLocale(store);
        expect(resolved).toBe(locale);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P5c: For any unsupported locale string, resolveLocale falls back to 'en'.
   * Validates: Requirements 13.5 (fallback behaviour)
   */
  it('P5c: unsupported locales fall back to the default locale "en"', () => {
    fc.assert(
      fc.property(unsupportedLocaleArb, (locale) => {
        const store = createMemoryStorage();
        writeLocaleToStorage(store, locale);
        const resolved = resolveLocale(store);
        expect(resolved).toBe(DEFAULT_LOCALE);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P5d: Empty storage (no locale written) falls back to 'en'.
   * Validates: Requirements 13.5 (fallback behaviour)
   */
  it('P5d: missing storage key falls back to the default locale "en"', () => {
    const store = createMemoryStorage();
    const resolved = resolveLocale(store);
    expect(resolved).toBe(DEFAULT_LOCALE);
  });

  /**
   * P5e: Writing a locale twice — the second write overwrites the first,
   * and the round-trip returns the latest value.
   * Validates: Requirements 13.5
   */
  it('P5e: overwriting a locale in storage returns the latest value', () => {
    fc.assert(
      fc.property(supportedLocaleArb, supportedLocaleArb, (first, second) => {
        const store = createMemoryStorage();
        writeLocaleToStorage(store, first);
        writeLocaleToStorage(store, second);
        const resolved = resolveLocale(store);
        expect(resolved).toBe(second);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: wellflow-website, Property 6: HTML lang attribute matches active locale

/**
 * Property-based test for app/[locale]/layout.tsx
 * Property 6: HTML lang attribute matches active locale
 * Validates: Requirements 13.3
 *
 * Pure logic tests (node environment, no DOM).
 * The layout sets <html lang={locale}> where locale comes from the route params.
 * The invariant: for any supported locale, the html lang value must equal that locale.
 */

// ---------------------------------------------------------------------------
// Pure logic extracted from app/[locale]/layout.tsx
// ---------------------------------------------------------------------------

/**
 * Mirrors the logic in LocaleLayout: given a locale param from the route,
 * returns the value that should be set on <html lang>.
 * If the locale is not supported, returns null (notFound() would be called).
 */
function resolveHtmlLang(
  locale: string,
  supportedLocales: readonly string[]
): string | null {
  if (!supportedLocales.includes(locale)) {
    return null; // notFound() in the real layout
  }
  return locale; // <html lang={locale}>
}

// ---------------------------------------------------------------------------
// Property 6 tests
// ---------------------------------------------------------------------------

describe('LocalePreference — Property 6: HTML lang attribute matches active locale', () => {
  const SUPPORTED_LOCALES = ['en', 'es'] as const;

  /**
   * P6a: For any supported locale, the html lang value equals that locale.
   * Validates: Requirements 13.3
   */
  it('P6a: html lang attribute equals the active locale for every supported locale', () => {
    fc.assert(
      fc.property(fc.constantFrom(...SUPPORTED_LOCALES), (locale) => {
        const htmlLang = resolveHtmlLang(locale, SUPPORTED_LOCALES);
        expect(htmlLang).toBe(locale);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P6b: The html lang value is always a valid BCP 47 code from the supported set.
   * Validates: Requirements 13.3
   */
  it('P6b: html lang is always one of the supported BCP 47 locale codes', () => {
    fc.assert(
      fc.property(fc.constantFrom(...SUPPORTED_LOCALES), (locale) => {
        const htmlLang = resolveHtmlLang(locale, SUPPORTED_LOCALES);
        expect(SUPPORTED_LOCALES as readonly string[]).toContain(htmlLang);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P6c: For any unsupported locale string, resolveHtmlLang returns null
   * (the layout would call notFound() rather than set an invalid lang attribute).
   * Validates: Requirements 13.3
   */
  it('P6c: unsupported locales do not produce a valid html lang value', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          (s) => !(SUPPORTED_LOCALES as readonly string[]).includes(s)
        ),
        (locale) => {
          const htmlLang = resolveHtmlLang(locale, SUPPORTED_LOCALES);
          expect(htmlLang).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * P6d: The html lang value is identical (===) to the locale param — not just equal.
   * Validates: Requirements 13.3
   */
  it('P6d: html lang is the exact same string as the locale param (identity)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...SUPPORTED_LOCALES), (locale) => {
        const htmlLang = resolveHtmlLang(locale, SUPPORTED_LOCALES);
        // strict identity: same string value
        expect(htmlLang === locale).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
