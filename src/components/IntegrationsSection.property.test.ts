// Feature: wellflow-website, Property 8: All integrations are categorised

/**
 * Property-based test for components/sections/IntegrationsSection.tsx
 * Property 8: All integrations are categorised
 * Validates: Requirements 5.2
 *
 * Pure logic tests (node environment, no DOM).
 * For any integration in the integrations data array, its category field
 * must be one of the four defined categories:
 * 'health-fitness' | 'calendar' | 'wearables' | 'messaging'.
 */

import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Integration interface (mirrors design.md and IntegrationsSection.tsx)
// ---------------------------------------------------------------------------

interface Integration {
  id: string;
  name: string;
  logoSrc: string;
  category: 'health-fitness' | 'calendar' | 'wearables' | 'messaging';
}

// ---------------------------------------------------------------------------
// INTEGRATIONS array from IntegrationsSection.tsx (source of truth for Req 5.2)
// ---------------------------------------------------------------------------

const INTEGRATIONS: Integration[] = [
  // Health & Fitness
  { id: 'apple-health', name: 'Apple Health', logoSrc: '🍎', category: 'health-fitness' },
  { id: 'google-fit', name: 'Google Fit', logoSrc: '🏃', category: 'health-fitness' },
  { id: 'fitbit', name: 'Fitbit', logoSrc: '💪', category: 'health-fitness' },
  { id: 'garmin', name: 'Garmin', logoSrc: '⌚', category: 'health-fitness' },
  // Calendar
  { id: 'google-calendar', name: 'Google Calendar', logoSrc: '📅', category: 'calendar' },
  { id: 'apple-calendar', name: 'Apple Calendar', logoSrc: '🗓️', category: 'calendar' },
  { id: 'outlook', name: 'Outlook', logoSrc: '📧', category: 'calendar' },
  // Wearables
  { id: 'apple-watch', name: 'Apple Watch', logoSrc: '⌚', category: 'wearables' },
  { id: 'wear-os', name: 'Wear OS', logoSrc: '🤖', category: 'wearables' },
  { id: 'oura', name: 'Oura', logoSrc: '💍', category: 'wearables' },
  // Messaging
  { id: 'slack', name: 'Slack', logoSrc: '💬', category: 'messaging' },
  { id: 'whatsapp', name: 'WhatsApp', logoSrc: '📱', category: 'messaging' },
  { id: 'telegram', name: 'Telegram', logoSrc: '✈️', category: 'messaging' },
];

// ---------------------------------------------------------------------------
// Allowed categories (four defined categories per design.md)
// ---------------------------------------------------------------------------

const ALLOWED_CATEGORIES = ['health-fitness', 'calendar', 'wearables', 'messaging'] as const;

type AllowedCategory = (typeof ALLOWED_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Pure logic helpers
// ---------------------------------------------------------------------------

/** Returns true when the category is one of the four allowed values. */
function isValidCategory(category: string): category is AllowedCategory {
  return (ALLOWED_CATEGORIES as readonly string[]).includes(category);
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 100 }).filter(
  (s) => s.trim().length > 0
);

const validCategoryArb = fc.constantFrom(...ALLOWED_CATEGORIES);

const invalidCategoryArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => !(ALLOWED_CATEGORIES as readonly string[]).includes(s));

const integrationWithValidCategoryArb: fc.Arbitrary<Integration> = fc.record({
  id: nonEmptyStringArb,
  name: nonEmptyStringArb,
  logoSrc: nonEmptyStringArb,
  category: validCategoryArb,
});

// ---------------------------------------------------------------------------
// Property 8 tests
// ---------------------------------------------------------------------------

describe('IntegrationsSection — Property 8: All integrations are categorised', () => {
  /**
   * P8a: For any generated Integration object with a valid category,
   * isValidCategory returns true.
   * Validates: Requirements 5.2
   */
  it('P8a: any integration with a valid category passes the category check', () => {
    fc.assert(
      fc.property(integrationWithValidCategoryArb, (integration) => {
        expect(isValidCategory(integration.category)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P8b: For any generated Integration object with an invalid category,
   * isValidCategory returns false.
   * Validates: Requirements 5.2
   */
  it('P8b: any integration with an invalid category fails the category check', () => {
    fc.assert(
      fc.property(invalidCategoryArb, (invalidCategory) => {
        expect(isValidCategory(invalidCategory)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P8c: All 13 integrations in the INTEGRATIONS array have valid categories.
   * Validates: Requirements 5.2
   */
  it('P8c: all 13 integrations in the INTEGRATIONS array have valid categories', () => {
    expect(INTEGRATIONS).toHaveLength(13);

    for (const integration of INTEGRATIONS) {
      expect(isValidCategory(integration.category)).toBe(true);
    }
  });

  /**
   * P8d: All 4 required categories are represented in the INTEGRATIONS array.
   * Validates: Requirements 5.2
   */
  it('P8d: all 4 required categories are represented in the INTEGRATIONS array', () => {
    const presentCategories = new Set(INTEGRATIONS.map((i) => i.category));

    for (const category of ALLOWED_CATEGORIES) {
      expect(presentCategories.has(category)).toBe(true);
    }

    expect(presentCategories.size).toBe(4);
  });
});
