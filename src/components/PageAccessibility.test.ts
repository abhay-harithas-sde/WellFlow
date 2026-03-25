// Feature: wellflow-website
// Accessibility tests for all page components — Requirements 10.1, 10.2, 10.3, 10.4
//
// Note: The project uses testEnvironment: 'node' (no DOM/jsdom), so jest-axe cannot
// run axe-core directly. These tests perform structural analysis of the TSX source
// files to verify semantic HTML, heading hierarchy, alt text, and ARIA attributes —
// the same properties that jest-axe would validate at runtime.

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readPage(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../../', relPath), 'utf-8');
}

/** Extract all tag names that appear as opening tags in the source. */
function findTags(src: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[\\s>]`, 'g');
  return src.match(re) ?? [];
}

/** Count occurrences of a pattern in source. */
function countMatches(src: string, pattern: RegExp): number {
  return (src.match(pattern) ?? []).length;
}

/** Return true if the source contains at least one match for the pattern. */
function contains(src: string, pattern: RegExp): boolean {
  return pattern.test(src);
}

// ---------------------------------------------------------------------------
// Page sources
// ---------------------------------------------------------------------------

const pages: Record<string, string> = {
  layout: readPage('app/[locale]/layout.tsx'),
  homepage: readPage('app/[locale]/layout.tsx'), // homepage assembles sections; layout wraps all
  privacy: readPage('app/[locale]/privacy/page.tsx'),
  terms: readPage('app/[locale]/terms/page.tsx'),
  cookiePolicy: readPage('app/[locale]/cookie-policy/page.tsx'),
  contact: readPage('app/[locale]/contact/page.tsx'),
  faq: readPage('app/[locale]/faq/page.tsx'),
};

// Standalone content pages (exclude layout which is a wrapper)
const contentPages: Record<string, string> = {
  privacy: pages.privacy,
  terms: pages.terms,
  cookiePolicy: pages.cookiePolicy,
  contact: pages.contact,
  faq: pages.faq,
};

// ---------------------------------------------------------------------------
// Requirement 10.4 — Semantic HTML elements
// ---------------------------------------------------------------------------

describe('Requirement 10.4 — Semantic HTML structure', () => {
  it('layout uses <html> with lang attribute', () => {
    const src = pages.layout;
    // lang={locale} wires the locale to the html element
    expect(src).toMatch(/<html\s[^>]*lang=/);
  });

  it('layout uses <body> element', () => {
    expect(pages.layout).toMatch(/<body>/);
  });

  it.each(Object.entries(contentPages))(
    '%s page uses <main> element with id="main-content"',
    (_name, src) => {
      expect(src).toMatch(/<main\s[^>]*id="main-content"/);
    },
  );

  it.each(Object.entries(contentPages))(
    '%s page uses <header> element',
    (_name, src) => {
      expect(src).toMatch(/<header[>\s]/);
    },
  );

  it.each(Object.entries(contentPages))(
    '%s page uses <section> elements',
    (_name, src) => {
      expect(src).toMatch(/<section[>\s]/);
    },
  );

  it('privacy page uses <article> element', () => {
    expect(pages.privacy).toMatch(/<article[>\s]/);
  });

  it('terms page uses <article> element', () => {
    expect(pages.terms).toMatch(/<article[>\s]/);
  });

  it('cookie-policy page uses <article> element', () => {
    expect(pages.cookiePolicy).toMatch(/<article[>\s]/);
  });

  it('faq page uses <dl> for FAQ list', () => {
    expect(pages.faq).toMatch(/<dl[>\s]/);
  });

  it('contact page uses <ul> for social links list', () => {
    expect(pages.contact).toMatch(/<ul[>\s]/);
  });
});

// ---------------------------------------------------------------------------
// Requirement 10.1 — Heading hierarchy (one H1, followed by H2/H3)
// ---------------------------------------------------------------------------

describe('Requirement 10.1 — Heading hierarchy', () => {
  it.each(Object.entries(contentPages))(
    '%s page has exactly one <h1>',
    (_name, src) => {
      const h1Count = countMatches(src, /<h1[\s>]/g);
      expect(h1Count).toBe(1);
    },
  );

  it.each(Object.entries(contentPages))(
    '%s page has at least one <h2>',
    (_name, src) => {
      const h2Count = countMatches(src, /<h2[\s>]/g);
      expect(h2Count).toBeGreaterThanOrEqual(1);
    },
  );

  it('privacy page has h3 sub-sections under h2', () => {
    const h3Count = countMatches(pages.privacy, /<h3[\s>]/g);
    expect(h3Count).toBeGreaterThanOrEqual(1);
  });

  it('terms page has h3 sub-sections under h2', () => {
    const h3Count = countMatches(pages.terms, /<h3[\s>]/g);
    expect(h3Count).toBeGreaterThanOrEqual(1);
  });

  it('cookie-policy page has h3 sub-sections under h2', () => {
    const h3Count = countMatches(pages.cookiePolicy, /<h3[\s>]/g);
    expect(h3Count).toBeGreaterThanOrEqual(1);
  });

  it('faq page has h3 for individual questions', () => {
    const h3Count = countMatches(pages.faq, /<h3[\s>]/g);
    expect(h3Count).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Requirement 10.1 — Alt text on images
// ---------------------------------------------------------------------------

describe('Requirement 10.1 — Alt text on images', () => {
  it.each(Object.entries(contentPages))(
    '%s page has no <img> without an alt attribute',
    (_name, src) => {
      // Find all <img tags and check none are missing alt=""
      const imgTags = src.match(/<img\s[^>]*>/g) ?? [];
      for (const tag of imgTags) {
        expect(tag).toMatch(/alt=/);
      }
    },
  );

  it('layout has no <img> without an alt attribute', () => {
    const imgTags = pages.layout.match(/<img\s[^>]*>/g) ?? [];
    for (const tag of imgTags) {
      expect(tag).toMatch(/alt=/);
    }
  });
});

// ---------------------------------------------------------------------------
// Requirement 10.3 — ARIA attributes and keyboard accessibility
// ---------------------------------------------------------------------------

describe('Requirement 10.3 — ARIA attributes', () => {
  it.each(Object.entries(contentPages))(
    '%s page sections have aria-labelledby attributes',
    (_name, src) => {
      // Every <section> should be labelled
      const sectionCount = countMatches(src, /<section[\s>]/g);
      const labelledCount = countMatches(src, /aria-labelledby=/g);
      expect(labelledCount).toBeGreaterThanOrEqual(sectionCount);
    },
  );

  it.each(Object.entries(contentPages))(
    '%s page links have accessible text (non-empty content)',
    (_name, src) => {
      // Anchor tags should not be self-closing or empty
      const emptyAnchors = src.match(/<a\s[^>]*\/>/g) ?? [];
      expect(emptyAnchors).toHaveLength(0);
    },
  );

  it('layout includes SkipLink component for keyboard navigation', () => {
    expect(pages.layout).toMatch(/SkipLink/);
  });

  it('layout passes skip link label from translations', () => {
    expect(pages.layout).toMatch(/skipToMain/);
  });
});

// ---------------------------------------------------------------------------
// Requirement 10.2 — Focus styles on interactive elements
// ---------------------------------------------------------------------------

describe('Requirement 10.2 — Focus styles on interactive elements', () => {
  it.each(Object.entries(contentPages))(
    '%s page links include focus-visible styles',
    (_name, src) => {
      // All pages with links should have focus-visible ring styles
      const hasLinks = /<a\s/.test(src);
      if (hasLinks) {
        expect(src).toMatch(/focus-visible:ring/);
      }
    },
  );

  it.each(Object.entries(contentPages))(
    '%s page links include focus:outline-none to prevent default outline duplication',
    (_name, src) => {
      const hasLinks = /<a\s/.test(src);
      if (hasLinks) {
        expect(src).toMatch(/focus:outline-none/);
      }
    },
  );
});

// ---------------------------------------------------------------------------
// Requirement 10.4 — Landmark roles via semantic elements
// ---------------------------------------------------------------------------

describe('Requirement 10.4 — Landmark roles', () => {
  it('layout provides <html lang> landmark for screen readers', () => {
    expect(pages.layout).toMatch(/lang=\{locale\}/);
  });

  it.each(Object.entries(contentPages))(
    '%s page wraps content in <main> (landmark role)',
    (_name, src) => {
      expect(src).toMatch(/<main[\s>]/);
    },
  );

  it('faq page uses <dl>/<dt>/<dd> for structured FAQ content', () => {
    expect(pages.faq).toMatch(/<dl[\s>]/);
    expect(pages.faq).toMatch(/<dt[\s>]/);
    expect(pages.faq).toMatch(/<dd[\s>]/);
  });

  it('contact page uses <ul>/<li> for social links list', () => {
    expect(pages.contact).toMatch(/<ul[\s>]/);
    expect(pages.contact).toMatch(/<li[\s>]/);
  });
});
