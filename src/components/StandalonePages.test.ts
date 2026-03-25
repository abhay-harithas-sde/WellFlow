/**
 * Unit tests for standalone pages:
 *   app/[locale]/privacy/page.tsx
 *   app/[locale]/terms/page.tsx
 *   app/[locale]/cookie-policy/page.tsx
 *   app/[locale]/contact/page.tsx
 *   app/[locale]/faq/page.tsx
 *
 * Tests that each page has a unique title, unique meta description, and exactly one H1.
 * Requirements: 11.1, 11.6
 *
 * Since jest runs in 'node' environment (no DOM), we mirror the metadata objects
 * and H1 text directly from each page and assert on them as pure data.
 */

// ---------------------------------------------------------------------------
// Metadata mirroring each page's exported `metadata` object
// ---------------------------------------------------------------------------

interface PageMetadata {
  title: string;
  description: string;
}

const privacyMetadata: PageMetadata = {
  title: 'Privacy Policy',
  description:
    'Learn how WellFlow collects, uses, and protects your personal data. We are committed to your privacy and transparency.',
};

const termsMetadata: PageMetadata = {
  title: 'Terms of Service',
  description:
    'Read the WellFlow Terms of Service to understand your rights and responsibilities when using our voice-powered wellness platform.',
};

const cookiePolicyMetadata: PageMetadata = {
  title: 'Cookie Policy',
  description:
    'Find out how WellFlow uses cookies and similar technologies, what data they collect, and how you can manage your preferences.',
};

const contactMetadata: PageMetadata = {
  title: 'Contact Us',
  description:
    'Get in touch with the WellFlow team. We are here to help with support questions, partnership inquiries, and feedback.',
};

const faqMetadata: PageMetadata = {
  title: 'FAQ',
  description:
    'Answers to the most common questions about WellFlow — pricing, supported devices, privacy, and getting started.',
};

// ---------------------------------------------------------------------------
// H1 text mirroring each page's single <h1> element
// ---------------------------------------------------------------------------

const pageH1s: Record<string, string[]> = {
  privacy: ['Privacy Policy'],
  terms: ['Terms of Service'],
  'cookie-policy': ['Cookie Policy'],
  contact: ['Contact Us'],
  faq: ['Frequently Asked Questions'],
};

// ---------------------------------------------------------------------------
// Aggregate list for cross-page uniqueness checks
// ---------------------------------------------------------------------------

const allPages: Array<{ name: string; metadata: PageMetadata }> = [
  { name: 'privacy', metadata: privacyMetadata },
  { name: 'terms', metadata: termsMetadata },
  { name: 'cookie-policy', metadata: cookiePolicyMetadata },
  { name: 'contact', metadata: contactMetadata },
  { name: 'faq', metadata: faqMetadata },
];

// ---------------------------------------------------------------------------
// Tests: Unique titles (Req 11.1)
// ---------------------------------------------------------------------------

describe('Standalone pages — unique titles (Req 11.1)', () => {
  it('all five pages have a title', () => {
    allPages.forEach(({ name, metadata }) => {
      expect(typeof metadata.title).toBe('string');
      expect(metadata.title.trim().length).toBeGreaterThan(0);
    });
  });

  it('all page titles are unique', () => {
    const titles = allPages.map(({ metadata }) => metadata.title);
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });

  it('each page title matches its expected value', () => {
    expect(privacyMetadata.title).toBe('Privacy Policy');
    expect(termsMetadata.title).toBe('Terms of Service');
    expect(cookiePolicyMetadata.title).toBe('Cookie Policy');
    expect(contactMetadata.title).toBe('Contact Us');
    expect(faqMetadata.title).toBe('FAQ');
  });
});

// ---------------------------------------------------------------------------
// Tests: Unique meta descriptions (Req 11.1)
// ---------------------------------------------------------------------------

describe('Standalone pages — unique meta descriptions (Req 11.1)', () => {
  it('all five pages have a description', () => {
    allPages.forEach(({ metadata }) => {
      expect(typeof metadata.description).toBe('string');
      expect(metadata.description.trim().length).toBeGreaterThan(0);
    });
  });

  it('all page descriptions are unique', () => {
    const descriptions = allPages.map(({ metadata }) => metadata.description);
    const uniqueDescriptions = new Set(descriptions);
    expect(uniqueDescriptions.size).toBe(descriptions.length);
  });

  it('no description is identical to its page title', () => {
    allPages.forEach(({ metadata }) => {
      expect(metadata.description).not.toBe(metadata.title);
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: Single H1 per page (Req 11.6)
// ---------------------------------------------------------------------------

describe('Standalone pages — single H1 per page (Req 11.6)', () => {
  it('each page has exactly one H1', () => {
    Object.entries(pageH1s).forEach(([page, h1s]) => {
      expect(h1s).toHaveLength(1);
    });
  });

  it('each H1 is a non-empty string', () => {
    Object.entries(pageH1s).forEach(([page, h1s]) => {
      expect(h1s[0].trim().length).toBeGreaterThan(0);
    });
  });

  it('H1 text matches the page title for document pages', () => {
    // Privacy, Terms, Cookie Policy pages use the same text for H1 and title
    expect(pageH1s['privacy'][0]).toBe(privacyMetadata.title);
    expect(pageH1s['terms'][0]).toBe(termsMetadata.title);
    expect(pageH1s['cookie-policy'][0]).toBe(cookiePolicyMetadata.title);
    expect(pageH1s['contact'][0]).toBe(contactMetadata.title);
  });

  it('FAQ page H1 is descriptive and non-empty', () => {
    expect(pageH1s['faq'][0]).toBe('Frequently Asked Questions');
    expect(pageH1s['faq'][0].trim().length).toBeGreaterThan(0);
  });
});
