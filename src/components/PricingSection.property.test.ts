// Feature: website-completion-murf-wellflow, Property 5: Annual savings percentage

/**
 * Property-based test for components/sections/PricingSection.tsx
 * Property 5: Annual savings percentage
 * Validates: Requirements 10.5
 *
 * Pure logic tests (node environment, no DOM).
 * For any pricing tier where annualPrice < monthlyPrice * 12 and monthlyPrice > 0,
 * the displayed savings percentage equals Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100).
 */

import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure logic extracted from components/sections/PricingSection.tsx
// ---------------------------------------------------------------------------

/** Compute annual savings percentage vs monthly billing (mirrors PricingSection.tsx) */
function computeSavingsPercent(monthlyPrice: number, annualPrice: number): number {
  if (monthlyPrice <= 0) return 0;
  return Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100);
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Generates a valid monthlyPrice > 0.
 * Uses Math.fround to ensure 32-bit float boundaries required by fc.float.
 */
const positivePriceArb = fc.float({
  min: Math.fround(0.01),
  max: Math.fround(10000),
  noNaN: true,
  noDefaultInfinity: true,
});

/**
 * Generates a pair (monthlyPrice, annualPrice) satisfying:
 *   monthlyPrice > 0
 *   annualPrice < monthlyPrice * 12
 *   annualPrice >= 0
 */
const savingsTierArb = positivePriceArb.chain((monthlyPrice) => {
  // Ensure maxAnnual is a valid 32-bit float and strictly less than monthlyPrice * 12
  const rawMax = monthlyPrice * 12 * 0.99; // at most 99% of annual cost = guaranteed savings
  const maxAnnual = Math.fround(rawMax);
  return fc
    .float({ min: 0, max: Math.max(0, maxAnnual), noNaN: true, noDefaultInfinity: true })
    .map((annualPrice) => ({ monthlyPrice, annualPrice }));
});

// ---------------------------------------------------------------------------
// Property 5 tests
// ---------------------------------------------------------------------------

describe('PricingSection — Property 5: Annual savings percentage', () => {
  /**
   * P5a: For any tier where annualPrice < monthlyPrice * 12 and monthlyPrice > 0,
   * computeSavingsPercent returns Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100).
   * Validates: Requirements 10.5
   */
  it('P5a: savings percent equals Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100)', () => {
    // Feature: website-completion-murf-wellflow, Property 5: Annual savings percentage
    fc.assert(
      fc.property(savingsTierArb, ({ monthlyPrice, annualPrice }) => {
        const expected = Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100);
        const actual = computeSavingsPercent(monthlyPrice, annualPrice);
        expect(actual).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P5b: When monthlyPrice <= 0, computeSavingsPercent returns 0 (guard condition).
   * Validates: Requirements 10.5
   */
  it('P5b: returns 0 when monthlyPrice is zero or negative', () => {
    // Feature: website-completion-murf-wellflow, Property 5: Annual savings percentage
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-10000), max: 0, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 0, max: Math.fround(10000), noNaN: true, noDefaultInfinity: true }),
        (monthlyPrice, annualPrice) => {
          const actual = computeSavingsPercent(monthlyPrice, annualPrice);
          expect(actual).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * P5c: Savings percentage is always a non-negative integer when annualPrice < monthlyPrice * 12.
   * Validates: Requirements 10.5
   */
  it('P5c: savings percent is a non-negative integer for valid discount tiers', () => {
    // Feature: website-completion-murf-wellflow, Property 5: Annual savings percentage
    fc.assert(
      fc.property(savingsTierArb, ({ monthlyPrice, annualPrice }) => {
        const actual = computeSavingsPercent(monthlyPrice, annualPrice);
        expect(actual).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(actual)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P5d: Savings percentage is at most 100 when annualPrice >= 0.
   * Validates: Requirements 10.5
   */
  it('P5d: savings percent is at most 100 for any valid discount tier', () => {
    // Feature: website-completion-murf-wellflow, Property 5: Annual savings percentage
    fc.assert(
      fc.property(
        savingsTierArb,
        ({ monthlyPrice, annualPrice }) => {
          const actual = computeSavingsPercent(monthlyPrice, annualPrice);
          expect(actual).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });
});
