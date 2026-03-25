// Feature: website-completion-murf-wellflow, Property 1: i18n rendering consistency

/**
 * Property-based test for i18n rendering consistency.
 * Property 1: For any locale in ['en', 'es'] and any i18n key defined in
 * messages/en.json, the value from messages/{locale}.json for that key is a
 * non-empty string (i.e., all keys have translations in both locales).
 *
 * Validates: Requirements 1.8, 2.1, 3.3, 4.5, 5.8, 6.9, 7.5, 8.5, 9.5,
 *            10.7, 11.6, 12.4, 13.8, 16.3, 18.5
 */

import * as fc from 'fast-check';
import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

type LocaleMessages = typeof enMessages;

// ---------------------------------------------------------------------------
// Helpers: extract all leaf string key paths from a JSON object
// ---------------------------------------------------------------------------

/**
 * Recursively collects all key paths that lead to a string leaf value.
 * Arrays are traversed by index (e.g. "faq.items.0.question").
 */
function collectStringPaths(obj: JsonValue, prefix = ''): string[] {
  if (typeof obj === 'string') {
    return [prefix];
  }
  if (Array.isArray(obj)) {
    const paths: string[] = [];
    obj.forEach((item, idx) => {
      const childPrefix = prefix ? `${prefix}.${idx}` : String(idx);
      paths.push(...collectStringPaths(item, childPrefix));
    });
    return paths;
  }
  if (obj !== null && typeof obj === 'object') {
    const paths: string[] = [];
    for (const key of Object.keys(obj)) {
      const childPrefix = prefix ? `${prefix}.${key}` : key;
      paths.push(...collectStringPaths((obj as JsonObject)[key], childPrefix));
    }
    return paths;
  }
  // numbers, booleans, null — not string leaves
  return [];
}

/**
 * Resolves a dot-separated key path against a JSON object.
 * Returns the value at that path, or undefined if not found.
 */
function resolvePath(obj: JsonValue, path: string): JsonValue | undefined {
  const parts = path.split('.');
  let current: JsonValue = obj;
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined;
    if (Array.isArray(current)) {
      const idx = Number(part);
      if (!Number.isInteger(idx) || idx < 0 || idx >= current.length) return undefined;
      current = current[idx];
    } else {
      if (!(part in (current as JsonObject))) return undefined;
      current = (current as JsonObject)[part];
    }
  }
  return current;
}

// ---------------------------------------------------------------------------
// Locale message map
// ---------------------------------------------------------------------------

const localeMessages: Record<string, JsonValue> = {
  en: enMessages as unknown as JsonValue,
  es: esMessages as unknown as JsonValue,
};

// ---------------------------------------------------------------------------
// Collect all string key paths from en.json
// ---------------------------------------------------------------------------

const allEnStringPaths = collectStringPaths(enMessages as unknown as JsonValue);

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const localeArb = fc.constantFrom('en', 'es');
const keyPathArb = fc.constantFrom(...allEnStringPaths);

// ---------------------------------------------------------------------------
// Property 1 tests
// ---------------------------------------------------------------------------

describe('I18nRendering — Property 1: i18n rendering consistency', () => {
  /**
   * P1a: For any locale in ['en', 'es'] and any string key path from en.json,
   * the value in that locale's messages is a non-empty string.
   * Validates: Requirements 1.8, 2.1, 3.3, 4.5, 5.8, 6.9, 7.5, 8.5, 9.5,
   *            10.7, 11.6, 12.4, 13.8, 16.3, 18.5
   */
  it('P1a: every string key in en.json resolves to a non-empty string in both locales', () => {
    fc.assert(
      fc.property(localeArb, keyPathArb, (locale, keyPath) => {
        const messages = localeMessages[locale];
        const value = resolvePath(messages, keyPath);
        expect(typeof value).toBe('string');
        expect((value as string).length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P1b: For any string key path from en.json, the es.json value is a non-empty string.
   * (Exhaustive check over all paths — ensures full coverage.)
   * Validates: Requirements 16.3
   */
  it('P1b: every string key in en.json has a non-empty string value in es.json', () => {
    for (const keyPath of allEnStringPaths) {
      const value = resolvePath(esMessages as unknown as JsonValue, keyPath);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    }
  });

  /**
   * P1c: For any string key path from en.json, the en.json value itself is a non-empty string.
   * (Sanity check — the source of truth is well-formed.)
   * Validates: Requirements 16.3
   */
  it('P1c: every string key in en.json has a non-empty string value in en.json', () => {
    for (const keyPath of allEnStringPaths) {
      const value = resolvePath(enMessages as unknown as JsonValue, keyPath);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    }
  });

  /**
   * P1d: The set of string key paths in es.json is a superset of those in en.json.
   * (No key present in en.json is missing from es.json.)
   * Validates: Requirements 16.2, 16.3
   */
  it('P1d: es.json contains all string key paths present in en.json', () => {
    fc.assert(
      fc.property(keyPathArb, (keyPath) => {
        const esValue = resolvePath(esMessages as unknown as JsonValue, keyPath);
        expect(esValue).not.toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });
});
