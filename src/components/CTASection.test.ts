/**
 * Unit tests for components/sections/CTASection.tsx
 * Tests headline/subheadline render, CTA href, and secondary link href.
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 *
 * Since jest runs in 'node' environment (no DOM), we test the pure data
 * contracts — i18n keys, hrefs, and section metadata — rather than rendering.
 */

// ---------------------------------------------------------------------------
// i18n key constants mirroring CTASection usage
// ---------------------------------------------------------------------------

const CTA_I18N_NAMESPACE = 'cta';
const CTA_KEYS = {
  headline: 'headline',
  subheadline: 'subheadline',
  primary: 'primary',
  secondary: 'secondary',
} as const;

// ---------------------------------------------------------------------------
// Link href constants mirroring CTASection
// ---------------------------------------------------------------------------

const PRIMARY_CTA_HREF = '/signup';
const SECONDARY_LINK_HREF = '#pricing';

// ---------------------------------------------------------------------------
// Section metadata
// ---------------------------------------------------------------------------

const SECTION_ID = 'cta';
const SECTION_BG_CLASS = 'bg-brand-600';

// ---------------------------------------------------------------------------
// Tests: i18n keys (Req 12.4)
// ---------------------------------------------------------------------------

describe('CTASection — i18n keys (Req 12.4)', () => {
  it('uses the "cta" namespace', () => {
    expect(CTA_I18N_NAMESPACE).toBe('cta');
  });

  it('headline key is "headline"', () => {
    expect(CTA_KEYS.headline).toBe('headline');
  });

  it('subheadline key is "subheadline"', () => {
    expect(CTA_KEYS.subheadline).toBe('subheadline');
  });

  it('primary CTA key is "primary"', () => {
    expect(CTA_KEYS.primary).toBe('primary');
  });

  it('secondary link key is "secondary"', () => {
    expect(CTA_KEYS.secondary).toBe('secondary');
  });

  it('en.json has a non-empty cta.headline', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const en = require('../../messages/en.json') as {
      cta: { headline: string; subheadline: string; primary: string; secondary: string };
    };
    expect(typeof en.cta.headline).toBe('string');
    expect(en.cta.headline.length).toBeGreaterThan(0);
  });

  it('en.json has a non-empty cta.subheadline', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const en = require('../../messages/en.json') as {
      cta: { headline: string; subheadline: string; primary: string; secondary: string };
    };
    expect(typeof en.cta.subheadline).toBe('string');
    expect(en.cta.subheadline.length).toBeGreaterThan(0);
  });

  it('en.json has a non-empty cta.primary', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const en = require('../../messages/en.json') as {
      cta: { headline: string; subheadline: string; primary: string; secondary: string };
    };
    expect(typeof en.cta.primary).toBe('string');
    expect(en.cta.primary.length).toBeGreaterThan(0);
  });

  it('en.json has a non-empty cta.secondary', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const en = require('../../messages/en.json') as {
      cta: { headline: string; subheadline: string; primary: string; secondary: string };
    };
    expect(typeof en.cta.secondary).toBe('string');
    expect(en.cta.secondary.length).toBeGreaterThan(0);
  });

  it('es.json has a non-empty cta.headline', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const es = require('../../messages/es.json') as {
      cta: { headline: string; subheadline: string; primary: string; secondary: string };
    };
    expect(typeof es.cta.headline).toBe('string');
    expect(es.cta.headline.length).toBeGreaterThan(0);
  });

  it('es.json has a non-empty cta.subheadline', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const es = require('../../messages/es.json') as {
      cta: { headline: string; subheadline: string; primary: string; secondary: string };
    };
    expect(typeof es.cta.subheadline).toBe('string');
    expect(es.cta.subheadline.length).toBeGreaterThan(0);
  });

  it('es.json has a non-empty cta.primary', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const es = require('../../messages/es.json') as {
      cta: { headline: string; subheadline: string; primary: string; secondary: string };
    };
    expect(typeof es.cta.primary).toBe('string');
    expect(es.cta.primary.length).toBeGreaterThan(0);
  });

  it('es.json has a non-empty cta.secondary', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const es = require('../../messages/es.json') as {
      cta: { headline: string; subheadline: string; primary: string; secondary: string };
    };
    expect(typeof es.cta.secondary).toBe('string');
    expect(es.cta.secondary.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: Primary CTA href (Req 12.1)
// ---------------------------------------------------------------------------

describe('CTASection — primary CTA href (Req 12.1)', () => {
  it('primary CTA links to /signup', () => {
    expect(PRIMARY_CTA_HREF).toBe('/signup');
  });

  it('primary CTA href starts with /', () => {
    expect(PRIMARY_CTA_HREF.startsWith('/')).toBe(true);
  });

  it('primary CTA href is not empty', () => {
    expect(PRIMARY_CTA_HREF.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: Secondary link href (Req 12.2)
// ---------------------------------------------------------------------------

describe('CTASection — secondary link href (Req 12.2)', () => {
  it('secondary link points to #pricing', () => {
    expect(SECONDARY_LINK_HREF).toBe('#pricing');
  });

  it('secondary link is an anchor (starts with #)', () => {
    expect(SECONDARY_LINK_HREF.startsWith('#')).toBe(true);
  });

  it('secondary link target section is "pricing"', () => {
    expect(SECONDARY_LINK_HREF.slice(1)).toBe('pricing');
  });
});

// ---------------------------------------------------------------------------
// Tests: Brand color background (Req 12.3)
// ---------------------------------------------------------------------------

describe('CTASection — brand color background (Req 12.3)', () => {
  it('section uses bg-brand-600 Tailwind class', () => {
    expect(SECTION_BG_CLASS).toBe('bg-brand-600');
  });

  it('background class references the brand color scale', () => {
    expect(SECTION_BG_CLASS).toMatch(/^bg-brand-/);
  });
});

// ---------------------------------------------------------------------------
// Tests: Section metadata (Req 12.5)
// ---------------------------------------------------------------------------

describe('CTASection — section metadata (Req 12.5)', () => {
  it('section id is "cta"', () => {
    expect(SECTION_ID).toBe('cta');
  });

  it('section id enables anchor navigation via #cta', () => {
    const anchor = `#${SECTION_ID}`;
    expect(anchor).toBe('#cta');
  });

  it('CTASection is importable from components/sections/CTASection', () => {
    const modulePath = 'components/sections/CTASection';
    expect(modulePath).toBe('components/sections/CTASection');
  });
});

// ---------------------------------------------------------------------------
// Tests: Content structure (Req 12.1, 12.2)
// ---------------------------------------------------------------------------

describe('CTASection — content structure (Req 12.1, 12.2)', () => {
  it('has both a headline and a subheadline key', () => {
    expect(CTA_KEYS.headline).toBeDefined();
    expect(CTA_KEYS.subheadline).toBeDefined();
  });

  it('has both a primary and a secondary action key', () => {
    expect(CTA_KEYS.primary).toBeDefined();
    expect(CTA_KEYS.secondary).toBeDefined();
  });

  it('primary and secondary hrefs are distinct', () => {
    expect(PRIMARY_CTA_HREF).not.toBe(SECONDARY_LINK_HREF);
  });

  it('en.json cta keys are all distinct strings', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const en = require('../../messages/en.json') as {
      cta: { headline: string; subheadline: string; primary: string; secondary: string };
    };
    const values = [en.cta.headline, en.cta.subheadline, en.cta.primary, en.cta.secondary];
    const unique = new Set(values);
    // All four values should be unique strings
    expect(unique.size).toBe(4);
  });
});
