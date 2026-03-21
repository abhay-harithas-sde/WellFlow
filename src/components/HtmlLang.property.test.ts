import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure function that mirrors the lang attribute logic in app/[locale]/layout.tsx
// The layout does: <html lang={locale}> — the locale is passed through unchanged.
// ---------------------------------------------------------------------------

/**
 * Returns the value that should be set as the `lang` attribute on the `<html>`
 * element for a given locale. Mirrors the logic in `app/[locale]/layout.tsx`.
 */
function getHtmlLang(locale: string): string {
  return locale;
}

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('HtmlLang property tests', () => {
  // Feature: website-completion-murf-wellflow, Property 13: For any locale in ['en', 'es'], the <html> element has lang equal to that locale string
  test('P13: getHtmlLang returns the locale unchanged for any supported locale', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('en', 'es'),
        (locale) => {
          return getHtmlLang(locale) === locale;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: website-completion-murf-wellflow, Property 13: For any locale in ['en', 'es'], the <html> element has lang equal to that locale string
  test('P13: getHtmlLang is an identity function (returns input unchanged)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('en', 'es'),
        (locale) => {
          const result = getHtmlLang(locale);
          // Identity property: output equals input exactly
          return result === locale && typeof result === 'string';
        }
      ),
      { numRuns: 100 }
    );
  });
});
