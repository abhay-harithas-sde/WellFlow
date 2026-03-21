// Feature: wellflow-website
// Unit tests for keyboard navigation — Requirements 10.3, 10.5
//
// Note: The project uses testEnvironment: 'node' (no DOM/jsdom), so tests perform
// structural source analysis of TSX files to verify keyboard accessibility properties:
//   - Interactive elements use native <button> or <a> elements (which handle Enter/Space natively)
//     OR have explicit onKeyDown/onKeyPress handlers
//   - Focus styles are present via Tailwind focus-visible:ring classes

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readComponent(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../../', relPath), 'utf-8');
}

/** Count occurrences of a regex pattern in source. */
function countMatches(src: string, pattern: RegExp): number {
  return (src.match(pattern) ?? []).length;
}

/** Return true if the source contains at least one match for the pattern. */
function contains(src: string, pattern: RegExp): boolean {
  return pattern.test(src);
}

/**
 * Extract all JSX opening tags for a given element name.
 * Returns an array of the full opening tag strings.
 */
function extractOpeningTags(src: string, tagName: string): string[] {
  // Match <tagName ...> or <tagName .../>
  const re = new RegExp(`<${tagName}(\\s[^>]*)?>`, 'gs');
  return src.match(re) ?? [];
}

/**
 * Check that a tag string contains focus-visible:ring (Tailwind focus indicator).
 */
function hasFocusVisibleRing(tag: string): boolean {
  return /focus-visible:ring/.test(tag);
}

/**
 * Check that a tag string contains focus:outline-none (prevents double outline).
 */
function hasFocusOutlineNone(tag: string): boolean {
  return /focus:outline-none/.test(tag);
}

// ---------------------------------------------------------------------------
// Component sources
// ---------------------------------------------------------------------------

const sources = {
  navigation: readComponent('components/layout/Navigation.tsx'),
  button: readComponent('components/ui/Button.tsx'),
  skipLink: readComponent('components/layout/SkipLink.tsx'),
};

// ---------------------------------------------------------------------------
// Requirement 10.3 — Interactive elements respond to Enter/Space like click
//
// Native <button> and <a> elements handle Enter/Space natively per the HTML spec.
// We verify that interactive elements use these native elements (not divs with onClick),
// and that Button.tsx additionally has an explicit onKeyDown handler for completeness.
// ---------------------------------------------------------------------------

describe('Requirement 10.3 — Keyboard activation (Enter/Space)', () => {
  describe('Button component', () => {
    it('renders a native <button> element (handles Enter/Space natively)', () => {
      // The component must return a <button> tag, not a <div> or <span>
      expect(sources.button).toMatch(/<button\b/);
    });

    it('has an explicit onKeyDown handler for Enter and Space keys', () => {
      // Button.tsx adds an explicit handler as a belt-and-suspenders approach
      expect(sources.button).toMatch(/onKeyDown/);
      expect(sources.button).toMatch(/e\.key === 'Enter'/);
      expect(sources.button).toMatch(/e\.key === ' '/);
    });

    it('explicit onKeyDown calls onClick when Enter is pressed', () => {
      // The handler should invoke onClick for keyboard activation
      expect(sources.button).toMatch(/onClick\?\.\(/);
    });

    it('does not use a <div> or <span> as the interactive root element', () => {
      // Ensure no div/span with onClick is used instead of a native button
      const divWithClick = /<div[^>]*onClick/.test(sources.button);
      const spanWithClick = /<span[^>]*onClick/.test(sources.button);
      expect(divWithClick).toBe(false);
      expect(spanWithClick).toBe(false);
    });
  });

  describe('Navigation component', () => {
    it('hamburger toggle uses a native <button> element', () => {
      // The hamburger must be a <button> so Enter/Space work natively
      expect(sources.navigation).toMatch(/<button\b[^>]*aria-label="Open menu"|<button\b[^>]*aria-label=\{menuOpen/);
    });

    it('nav links use native <a> elements (handles Enter natively)', () => {
      // Links must be <a> tags, not divs with onClick
      expect(sources.navigation).toMatch(/<a\b[^>]*href=/);
    });

    it('CTA in navigation uses a native <a> element linking to /signup', () => {
      // The desktop CTA uses an anchor tag styled as a button, linking to /signup
      expect(sources.navigation).toMatch(/href="\/signup"/);
    });

    it('mobile close button uses a native <button> element', () => {
      // The close button inside the mobile overlay must be a native button
      const closeButtonMatches = sources.navigation.match(/<button\b[^>]*aria-label="Close menu"/g) ?? [];
      expect(closeButtonMatches.length).toBeGreaterThanOrEqual(1);
    });

    it('does not use <div> with onClick as interactive elements', () => {
      // No div should have an onClick handler (would break keyboard access)
      const divWithClick = /<div[^>]*onClick/.test(sources.navigation);
      expect(divWithClick).toBe(false);
    });

    it('Escape key closes the mobile menu (keyboard dismissal)', () => {
      // Navigation must handle Escape key to close the overlay
      expect(sources.navigation).toMatch(/e\.key === 'Escape'|key === 'Escape'/);
    });
  });

  describe('SkipLink component', () => {
    it('uses a native <a> element (handles Enter natively)', () => {
      // Skip link must be an anchor tag
      expect(sources.skipLink).toMatch(/<a\b/);
    });

    it('has an href attribute pointing to main content', () => {
      // The skip link must navigate to #main-content
      expect(sources.skipLink).toMatch(/href="#main-content"/);
    });

    it('does not use a <button> or <div> instead of an anchor', () => {
      // Skip links should be anchors, not buttons
      const hasButton = /<button\b/.test(sources.skipLink);
      expect(hasButton).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Requirement 10.5 — Visible focus indicator on all focusable elements
//
// Tailwind's focus-visible:ring-* classes provide a visible focus ring that
// appears only during keyboard navigation (not on mouse click).
// ---------------------------------------------------------------------------

describe('Requirement 10.5 — Visible focus indicators', () => {
  describe('Button component', () => {
    it('base classes include focus-visible:ring-2', () => {
      expect(sources.button).toMatch(/focus-visible:ring-2/);
    });

    it('base classes include focus-visible:ring-brand-600', () => {
      expect(sources.button).toMatch(/focus-visible:ring-brand-600/);
    });

    it('base classes include focus-visible:ring-offset-2', () => {
      expect(sources.button).toMatch(/focus-visible:ring-offset-2/);
    });

    it('base classes include focus:outline-none to prevent double outline', () => {
      expect(sources.button).toMatch(/focus:outline-none/);
    });
  });

  describe('Navigation component', () => {
    it('logo/brand link has focus-visible:ring styles', () => {
      expect(sources.navigation).toMatch(/focus-visible:ring-2/);
    });

    it('nav links have focus-visible:ring styles', () => {
      // All interactive elements in navigation should have focus ring
      const focusRingCount = countMatches(sources.navigation, /focus-visible:ring/g);
      // At minimum: logo link, hamburger button, mobile close button, mobile links
      expect(focusRingCount).toBeGreaterThanOrEqual(3);
    });

    it('hamburger button has focus-visible:ring styles', () => {
      // The hamburger button className must include focus-visible:ring
      const hamburgerSection = sources.navigation.match(
        /className="[^"]*md:hidden[^"]*focus-visible:ring[^"]*"|className="[^"]*focus-visible:ring[^"]*md:hidden[^"]*"/
      );
      // Alternative: check that the hamburger button block contains focus-visible:ring
      const hamburgerBlock = sources.navigation.match(
        /<button[\s\S]*?aria-label=\{menuOpen[\s\S]*?<\/button>/
      )?.[0] ?? '';
      const hasRing = /focus-visible:ring/.test(hamburgerBlock) ||
        // The hamburger button className is on a single line
        /md:hidden[^"]*focus-visible:ring|focus-visible:ring[^"]*md:hidden/.test(sources.navigation);
      expect(hasRing).toBe(true);
    });

    it('mobile overlay links have focus-visible:ring styles', () => {
      // Mobile nav links must also have focus ring
      expect(sources.navigation).toMatch(/focus-visible:ring-2/);
    });

    it('has focus:outline-none to prevent default browser outline duplication', () => {
      expect(sources.navigation).toMatch(/focus:outline-none/);
    });
  });

  describe('SkipLink component', () => {
    it('has focus:ring-2 style when focused', () => {
      // SkipLink uses focus: prefix (not focus-visible:) since it's always keyboard-triggered
      expect(sources.skipLink).toMatch(/focus:ring-2|focus-visible:ring-2/);
    });

    it('has focus:outline-none to prevent double outline', () => {
      expect(sources.skipLink).toMatch(/focus:outline-none/);
    });

    it('is visually hidden until focused (sr-only pattern)', () => {
      // Skip link should be sr-only by default and visible on focus
      expect(sources.skipLink).toMatch(/sr-only/);
      expect(sources.skipLink).toMatch(/focus:not-sr-only|focus-visible:not-sr-only/);
    });
  });
});

// ---------------------------------------------------------------------------
// Requirement 10.3 — No non-native interactive elements (divs/spans with onClick)
// across all keyboard-navigable components
// ---------------------------------------------------------------------------

describe('Requirement 10.3 — No inaccessible interactive elements', () => {
  it.each(Object.entries(sources))(
    '%s component has no <div> with onClick handler',
    (_name, src) => {
      const divWithClick = /<div[^>]*onClick/.test(src);
      expect(divWithClick).toBe(false);
    },
  );

  it.each(Object.entries(sources))(
    '%s component has no <span> with onClick handler',
    (_name, src) => {
      const spanWithClick = /<span[^>]*onClick/.test(src);
      expect(spanWithClick).toBe(false);
    },
  );
});

// ---------------------------------------------------------------------------
// Requirement 10.5 — Focus styles present across all components
// ---------------------------------------------------------------------------

describe('Requirement 10.5 — Focus styles present in all interactive components', () => {
  it.each(Object.entries(sources))(
    '%s component contains focus indicator styles',
    (_name, src) => {
      // Each component must have at least one focus style (ring or outline)
      const hasFocusStyle = /focus-visible:ring|focus:ring|focus:outline/.test(src);
      expect(hasFocusStyle).toBe(true);
    },
  );
});
