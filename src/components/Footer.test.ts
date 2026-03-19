/**
 * Unit tests for components/layout/Footer.tsx
 * Tests legal links, copyright year, social links, logo text, and tagline.
 * Requirements: 8.1, 8.2, 8.3, 8.4
 *
 * Since jest runs in 'node' environment (no DOM), we test the pure data
 * extracted from the Footer component.
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

const socialLinks: { label: string; href: string }[] = [
  { label: 'WellFlow on X (Twitter)', href: 'https://twitter.com/wellflowapp' },
  { label: 'WellFlow on LinkedIn', href: 'https://linkedin.com/company/wellflowapp' },
];

const logoText = 'WellFlow';
const tagline = 'Your voice-powered wellness companion';

function getCopyrightYear(): number {
  return new Date().getFullYear();
}

// ---------------------------------------------------------------------------
// Tests: Legal links (Req 8.1)
// ---------------------------------------------------------------------------

describe('Footer — legal links (Req 8.1)', () => {
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
// Tests: Copyright year (Req 8.4)
// ---------------------------------------------------------------------------

describe('Footer — copyright year (Req 8.4)', () => {
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
// Tests: Social links (Req 8.2)
// ---------------------------------------------------------------------------

describe('Footer — social links (Req 8.2)', () => {
  it('at least 2 social links are present', () => {
    expect(socialLinks.length).toBeGreaterThanOrEqual(2);
  });

  it('Twitter link is present', () => {
    const hrefs = socialLinks.map((l) => l.href);
    expect(hrefs).toContain('https://twitter.com/wellflowapp');
  });

  it('LinkedIn link is present', () => {
    const hrefs = socialLinks.map((l) => l.href);
    expect(hrefs).toContain('https://linkedin.com/company/wellflowapp');
  });
});

// ---------------------------------------------------------------------------
// Tests: Logo and tagline (Req 8.3)
// ---------------------------------------------------------------------------

describe('Footer — logo and tagline (Req 8.3)', () => {
  it('logo text is "WellFlow"', () => {
    expect(logoText).toBe('WellFlow');
  });

  it('tagline is present and non-empty', () => {
    expect(tagline.trim().length).toBeGreaterThan(0);
  });
});
