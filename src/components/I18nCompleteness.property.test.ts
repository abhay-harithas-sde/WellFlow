import fc from 'fast-check';
import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';

// ---------------------------------------------------------------------------
// Helpers: enumerate all leaf key paths in a nested JSON object
// ---------------------------------------------------------------------------

/**
 * Recursively collects all leaf key paths from a nested object.
 * A "leaf" is any value that is NOT a plain object (i.e., string, number,
 * boolean, array, or null).
 *
 * Arrays are treated as leaves because i18n arrays (e.g. faq.items) contain
 * structured objects whose individual fields are not independently keyed in
 * the translation files — they are accessed by index.
 *
 * Returns paths like ["nav.features", "hero.headline", "stats.users", ...]
 */
function collectLeafPaths(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    // This node is a leaf
    return prefix ? [prefix] : [];
  }

  const record = obj as Record<string, unknown>;
  const paths: string[] = [];

  for (const key of Object.keys(record)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const child = record[key];

    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      // Recurse into nested objects
      paths.push(...collectLeafPaths(child, fullKey));
    } else {
      // Leaf: string, number, boolean, array, or null
      paths.push(fullKey);
    }
  }

  return paths;
}

/**
 * Retrieves the value at a dot-separated key path from a nested object.
 * Returns `undefined` if any segment along the path is missing.
 */
function getByPath(obj: unknown, path: string): unknown {
  const segments = path.split('.');
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

// ---------------------------------------------------------------------------
// Pre-compute all leaf paths from en.json once (outside the test)
// ---------------------------------------------------------------------------
const enLeafPaths = collectLeafPaths(enMessages);

// Sanity check: we should have a non-trivial number of paths
if (enLeafPaths.length === 0) {
  throw new Error('collectLeafPaths returned no paths — check the implementation');
}

// ---------------------------------------------------------------------------
// Property test
// ---------------------------------------------------------------------------

describe('I18n key completeness property tests', () => {
  // Feature: website-completion-murf-wellflow, Property 10: For any key path in messages/en.json, the same path exists in messages/es.json with a non-empty string value
  test('P10: every leaf key path in en.json exists in es.json with a non-empty string value', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...enLeafPaths),
        (keyPath) => {
          const esValue = getByPath(esMessages, keyPath);

          // The value must exist (not undefined)
          if (esValue === undefined) return false;

          // If the en value is a string, the es value must also be a non-empty string
          const enValue = getByPath(enMessages, keyPath);
          if (typeof enValue === 'string') {
            return typeof esValue === 'string' && esValue.trim().length > 0;
          }

          // For non-string leaves (arrays, numbers, booleans) the path must exist
          return esValue !== undefined;
        }
      ),
      { numRuns: 100 }
    );
  });
});
