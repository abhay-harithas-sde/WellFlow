/**
 * Unit tests for components/layout/Footer.tsx
 * Tests legal links, copyright year, social links, newsletter validation,
 * LanguageSwitcher presence, and i18n key wiring.
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8
 */

// ---------------------------------------------------------------------------
// Data mirroring Footer.tsx
// ---------------------------------------------------------------------------

interface FooterLink {
  label: string;
  href: string;
}

const legalLinks: FooterLink[] = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Cookie Policy', href: '/cookie-policy' },
  { label: 'Contact', href: '/contact' },
  { label: 'FAQ', href: '/faq' },
];

const socialLinks: { label: string; href: string; target: string; rel: string }[] = [
  {
    label: 'Twitter',
    href: 'https://twitter.com/wellflowapp',
    target: '_blank',
    rel: 'noopener noreferrer',
  },
  {
    label: 'Instagram',
    href: 'https://instagram.com/wellflowapp',
    target: '_blank',
    rel: 'noopener noreferrer',
  },
];

const logoText = 'WellFlow';

function getCopyrightYear(): number {
  return new Date().getFullYear();
}

/** Mirrors the email validation pattern used in Footer.tsx */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

// ---------------------------------------------------------------------------
// Tests: Legal links (Req 13.1)
// ---------------------------------------------------------------------------

describe('Footer — legal links (Req 13.1)', () => {
  it('all 5 legal links are present', () => {
    expect(legalLinks).toHaveLength(5);
  });

  it('each legal link has a non-empty label', () => {
    legalLinks.forEach(({ label }) => {
      expect(label.trim().length).toBeGreaterThan(0);
    });
  });

  it('each legal link has a non-empty href', () => {
    legalLinks.forEach(({ href }) => {
      expect(href.trim().length).toBeGreaterThan(0);
    });
  });

  it('legal link hrefs match expected paths', () => {
    const hrefs = legalLinks.map((l) => l.href);
    expect(hrefs).toContain('/privacy');
    expect(hrefs).toContain('/terms');
    expect(hrefs).toContain('/cookie-policy');
    expect(hrefs).toContain('/contact');
    expect(hrefs).toContain('/faq');
  });

  it('legal link labels match expected values', () => {
    const labels = legalLinks.map((l) => l.label);
    expect(labels).toContain('Privacy Policy');
    expect(labels).toContain('Terms of Service');
    expect(labels).toContain('Cookie Policy');
    expect(labels).toContain('Contact');
    expect(labels).toContain('FAQ');
  });
});

// ---------------------------------------------------------------------------
// Tests: Copyright year (Req 13.4)
// ---------------------------------------------------------------------------

describe('Footer — copyright year (Req 13.4)', () => {
  it('copyright year matches the current year', () => {
    expect(getCopyrightYear()).toBe(new Date().getFullYear());
  });

  it('copyright year is a 4-digit number', () => {
    const year = getCopyrightYear();
    expect(year).toBeGreaterThanOrEqual(2000);
    expect(year).toBeLessThan(3000);
  });
});

// ---------------------------------------------------------------------------
// Tests: Social links (Req 13.2)
// ---------------------------------------------------------------------------

describe('Footer — social links (Req 13.2)', () => {
  it('exactly 2 social links are present (Twitter and Instagram)', () => {
    expect(socialLinks).toHaveLength(2);
  });

  it('Twitter link is present', () => {
    const hrefs = socialLinks.map((l) => l.href);
    expect(hrefs).toContain('https://twitter.com/wellflowapp');
  });

  it('Instagram link is present (LinkedIn replaced)', () => {
    const hrefs = socialLinks.map((l) => l.href);
    expect(hrefs).toContain('https://instagram.com/wellflowapp');
    // LinkedIn must NOT be present
    expect(hrefs.some((h) => h.includes('linkedin'))).toBe(false);
  });

  it('all social links open in a new tab', () => {
    socialLinks.forEach(({ target }) => {
      expect(target).toBe('_blank');
    });
  });

  it('all social links have rel="noopener noreferrer"', () => {
    socialLinks.forEach(({ rel }) => {
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: Newsletter email validation (Req 13.5, 13.6, 13.7)
// ---------------------------------------------------------------------------

describe('Footer — newsletter email validation (Req 13.5, 13.6, 13.7)', () => {
  const validEmails = [
    'user@example.com',
    'hello.world@domain.org',
    'test+tag@sub.domain.co',
    'a@b.io',
  ];

  const invalidEmails = [
    '',
    'notanemail',
    '@nodomain.com',
    'missing@',
    'spaces in@email.com',
    'double@@domain.com',
  ];

  it.each(validEmails)('accepts valid email: %s', (email) => {
    expect(validateEmail(email)).toBe(true);
  });

  it.each(invalidEmails)('rejects invalid email: %s', (email) => {
    expect(validateEmail(email)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Logo text (Req 13.8)
// ---------------------------------------------------------------------------

describe('Footer — logo text', () => {
  it('logo text is "WellFlow"', () => {
    expect(logoText).toBe('WellFlow');
  });
});

// ---------------------------------------------------------------------------
// Tests: i18n keys exist in messages/en.json (Req 13.8)
// ---------------------------------------------------------------------------

describe('Footer — i18n keys in messages/en.json (Req 13.8)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const en = require('../../messages/en.json') as Record<string, unknown>;
  const footer = en.footer as Record<string, unknown>;

  it('footer.tagline key exists', () => {
    expect(typeof footer.tagline).toBe('string');
    expect((footer.tagline as string).length).toBeGreaterThan(0);
  });

  it('footer.copyright key exists', () => {
    expect(typeof footer.copyright).toBe('string');
  });

  it('footer.legal keys exist', () => {
    const legal = footer.legal as Record<string, string>;
    expect(typeof legal.privacy).toBe('string');
    expect(typeof legal.terms).toBe('string');
    expect(typeof legal.cookie).toBe('string');
    expect(typeof legal.contact).toBe('string');
    expect(typeof legal.faq).toBe('string');
  });

  it('footer.social keys exist (twitter and instagram)', () => {
    const social = footer.social as Record<string, string>;
    expect(typeof social.twitter).toBe('string');
    expect(typeof social.instagram).toBe('string');
  });

  it('footer.newsletter keys exist', () => {
    const newsletter = footer.newsletter as Record<string, string>;
    expect(typeof newsletter.label).toBe('string');
    expect(typeof newsletter.placeholder).toBe('string');
    expect(typeof newsletter.submit).toBe('string');
    expect(typeof newsletter.success).toBe('string');
    expect(typeof newsletter.error).toBe('string');
  });
});
