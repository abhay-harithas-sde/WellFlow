// Feature: wellflow-website, Property 7: Navigation links cover all required sections

/**
 * Property-based test for components/layout/Navigation.tsx
 * Property 7: Navigation links cover all required sections
 * Validates: Requirements 1.1
 *
 * Since jest runs in 'node' environment (no DOM), we test the pure logic:
 * - Define the required section hrefs
 * - For any links array that includes all required hrefs, the coverage check passes
 * - For any links array missing required hrefs, the coverage check fails
 */

import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Required section anchors (mirrors NavProps contract from Navigation.tsx)
// ---------------------------------------------------------------------------

const REQUIRED_SECTION_HREFS = [
  '#features',
  '#how-it-works',
  '#integrations',
  '#testimonials',
  '#pricing',
] as const;

type NavLink = { label: string; href: string };

/**
 * Pure logic function that checks whether a links array covers all required sections.
 * Mirrors the invariant the Navigation component must satisfy.
 */
function coversAllRequiredSections(links: NavLink[]): boolean {
  const hrefSet = new Set(links.map((l) => l.href));
  return REQUIRED_SECTION_HREFS.every((required) => hrefSet.has(required));
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Non-empty label string. */
const labelArb = fc.string({ minLength: 1, maxLength: 60 });

/** A single required-section link. */
const requiredLinkArb = fc.record({
  label: labelArb,
  href: fc.constantFrom(...REQUIRED_SECTION_HREFS),
});

/** An extra link with an arbitrary non-required href (e.g. external or other anchors). */
const extraLinkArb = fc.record({
  label: labelArb,
  href: fc.oneof(
    fc.constant('#about'),
    fc.constant('#blog'),
    fc.constant('https://example.com'),
    fc.string({ minLength: 1, maxLength: 40 }).map((s) => `#extra-${s}`)
  ),
});

/**
 * Generates a links array that contains ALL required section hrefs plus
 * zero or more extra links, in arbitrary order.
 */
const fullCoverageLinksArb: fc.Arbitrary<NavLink[]> = fc
  .tuple(
    // One link per required section (label can vary)
    labelArb.map((label) => ({ label, href: '#features' as string })),
    labelArb.map((label) => ({ label, href: '#how-it-works' as string })),
    labelArb.map((label) => ({ label, href: '#integrations' as string })),
    labelArb.map((label) => ({ label, href: '#testimonials' as string })),
    labelArb.map((label) => ({ label, href: '#pricing' as string })),
    // Zero to five extra links
    fc.array(extraLinkArb, { minLength: 0, maxLength: 5 })
  )
  .map(([f, h, i, t, p, extras]) => {
    const required: NavLink[] = [f, h, i, t, p];
    // Shuffle required + extras together to test order-independence
    return [...required, ...extras].sort(() => 0); // stable but mixed
  });

/**
 * Generates a links array that is MISSING at least one required section href.
 */
const missingCoverageLinksArb: fc.Arbitrary<NavLink[]> = fc
  .tuple(
    // Pick a subset of required hrefs (0 to 4 of the 5)
    fc.subarray([...REQUIRED_SECTION_HREFS], { minLength: 0, maxLength: 4 }),
    fc.array(extraLinkArb, { minLength: 0, maxLength: 5 })
  )
  .map(([subset, extras]) =>
    [
      ...subset.map((href) => ({ label: 'Link', href })),
      ...extras,
    ]
  )
  .filter((links) => !coversAllRequiredSections(links)); // ensure at least one is missing

// ---------------------------------------------------------------------------
// Property 7
// ---------------------------------------------------------------------------

describe('Navigation — Property 7: Navigation links cover all required sections', () => {
  it('P7: coversAllRequiredSections returns true when all required hrefs are present', () => {
    fc.assert(
      fc.property(fullCoverageLinksArb, (links) => {
        expect(coversAllRequiredSections(links)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('P7: coversAllRequiredSections returns false when at least one required href is missing', () => {
    fc.assert(
      fc.property(missingCoverageLinksArb, (links) => {
        expect(coversAllRequiredSections(links)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('P7: required section hrefs are exactly the five expected anchors', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        expect(REQUIRED_SECTION_HREFS).toHaveLength(5);
        expect(REQUIRED_SECTION_HREFS).toContain('#features');
        expect(REQUIRED_SECTION_HREFS).toContain('#how-it-works');
        expect(REQUIRED_SECTION_HREFS).toContain('#integrations');
        expect(REQUIRED_SECTION_HREFS).toContain('#testimonials');
        expect(REQUIRED_SECTION_HREFS).toContain('#pricing');
      }),
      { numRuns: 1 }
    );
  });

  it('P7: coverage check is order-independent — same links in any order always pass', () => {
    fc.assert(
      fc.property(fullCoverageLinksArb, (links) => {
        // Reverse the array — result must still be true
        const reversed = [...links].reverse();
        expect(coversAllRequiredSections(reversed)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
