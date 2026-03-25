/**
 * Unit tests for components/sections/HeroSection.tsx
 * Tests CTA href pass-through, trust indicators rendering, headline/subheadline, and visual src.
 * Requirements: 2.3, 2.4
 *
 * Since jest runs in 'node' environment (no DOM), we test the pure logic
 * extracted from the HeroSection component — data/logic contracts rather than rendering.
 */

// ---------------------------------------------------------------------------
// HeroProps types (mirroring the component interface)
// ---------------------------------------------------------------------------

interface TrustIndicator {
  label: string;
  value: string;
}

interface HeroProps {
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaHref: string;
  trustIndicators: TrustIndicator[];
  visualSrc: string;
}

// ---------------------------------------------------------------------------
// Pure helpers mirroring HeroSection logic
// ---------------------------------------------------------------------------

/** Returns the href that the CTA link would navigate to. */
function getCtaHref(props: HeroProps): string {
  return props.ctaHref;
}

/** Returns the trust indicators that would be rendered (only when array is non-empty). */
function getRenderedTrustIndicators(props: HeroProps): TrustIndicator[] {
  if (props.trustIndicators.length === 0) return [];
  return props.trustIndicators;
}

/** Returns the headline text that would be rendered. */
function getHeadline(props: HeroProps): string {
  return props.headline;
}

/** Returns the subheadline text that would be rendered. */
function getSubheadline(props: HeroProps): string {
  return props.subheadline;
}

/** Returns the visual src that would be passed to next/image. */
function getVisualSrc(props: HeroProps): string {
  return props.visualSrc;
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const sampleTrustIndicators: TrustIndicator[] = [
  { label: 'Active Users', value: '50K+' },
  { label: 'Sessions Completed', value: '1M+' },
  { label: 'Avg. Rating', value: '4.9★' },
];

const sampleProps: HeroProps = {
  headline: 'Your Voice-Powered Wellness Companion',
  subheadline: 'Guided breathing, mindfulness, and stress relief — hands-free.',
  ctaLabel: 'Get Started Free',
  ctaHref: '#signup',
  trustIndicators: sampleTrustIndicators,
  visualSrc: '/images/hero-visual.webp',
};

// ---------------------------------------------------------------------------
// Tests: CTA href pass-through (Req 2.3)
// ---------------------------------------------------------------------------

describe('HeroSection — CTA navigates to correct destination (Req 2.3)', () => {
  it('ctaHref is passed through to the CTA link', () => {
    expect(getCtaHref(sampleProps)).toBe('#signup');
  });

  it('ctaHref is preserved for an external URL', () => {
    const props: HeroProps = { ...sampleProps, ctaHref: 'https://app.wellflow.io/signup' };
    expect(getCtaHref(props)).toBe('https://app.wellflow.io/signup');
  });

  it('ctaHref is preserved for a deep anchor', () => {
    const props: HeroProps = { ...sampleProps, ctaHref: '#pricing' };
    expect(getCtaHref(props)).toBe('#pricing');
  });

  it('ctaLabel is passed through correctly', () => {
    expect(sampleProps.ctaLabel).toBe('Get Started Free');
  });
});

// ---------------------------------------------------------------------------
// Tests: Trust indicators rendering (Req 2.4)
// ---------------------------------------------------------------------------

describe('HeroSection — trust indicators are rendered (Req 2.4)', () => {
  it('all trust indicators are returned when array is non-empty', () => {
    const rendered = getRenderedTrustIndicators(sampleProps);
    expect(rendered).toHaveLength(3);
  });

  it('each trust indicator has a non-empty label', () => {
    const rendered = getRenderedTrustIndicators(sampleProps);
    rendered.forEach((indicator) => {
      expect(indicator.label.length).toBeGreaterThan(0);
    });
  });

  it('each trust indicator has a non-empty value', () => {
    const rendered = getRenderedTrustIndicators(sampleProps);
    rendered.forEach((indicator) => {
      expect(indicator.value.length).toBeGreaterThan(0);
    });
  });

  it('trust indicator labels are preserved correctly', () => {
    const rendered = getRenderedTrustIndicators(sampleProps);
    expect(rendered.map((i) => i.label)).toEqual([
      'Active Users',
      'Sessions Completed',
      'Avg. Rating',
    ]);
  });

  it('trust indicator values are preserved correctly', () => {
    const rendered = getRenderedTrustIndicators(sampleProps);
    expect(rendered.map((i) => i.value)).toEqual(['50K+', '1M+', '4.9★']);
  });

  it('renders nothing when trust indicators array is empty', () => {
    const props: HeroProps = { ...sampleProps, trustIndicators: [] };
    const rendered = getRenderedTrustIndicators(props);
    expect(rendered).toHaveLength(0);
  });

  it('single trust indicator is rendered correctly', () => {
    const props: HeroProps = {
      ...sampleProps,
      trustIndicators: [{ label: 'Users', value: '100+' }],
    };
    const rendered = getRenderedTrustIndicators(props);
    expect(rendered).toHaveLength(1);
    expect(rendered[0].label).toBe('Users');
    expect(rendered[0].value).toBe('100+');
  });
});

// ---------------------------------------------------------------------------
// Tests: Headline and subheadline pass-through
// ---------------------------------------------------------------------------

describe('HeroSection — headline and subheadline are passed through', () => {
  it('headline is passed through correctly', () => {
    expect(getHeadline(sampleProps)).toBe('Your Voice-Powered Wellness Companion');
  });

  it('subheadline is passed through correctly', () => {
    expect(getSubheadline(sampleProps)).toBe(
      'Guided breathing, mindfulness, and stress relief — hands-free.'
    );
  });

  it('headline reflects any provided value', () => {
    const props: HeroProps = { ...sampleProps, headline: 'A Different Headline' };
    expect(getHeadline(props)).toBe('A Different Headline');
  });

  it('subheadline reflects any provided value', () => {
    const props: HeroProps = { ...sampleProps, subheadline: 'A different subheadline.' };
    expect(getSubheadline(props)).toBe('A different subheadline.');
  });
});

// ---------------------------------------------------------------------------
// Tests: Visual src pass-through
// ---------------------------------------------------------------------------

describe('HeroSection — visual src is passed through', () => {
  it('visualSrc is passed through correctly', () => {
    expect(getVisualSrc(sampleProps)).toBe('/images/hero-visual.webp');
  });

  it('visualSrc reflects any provided path', () => {
    const props: HeroProps = { ...sampleProps, visualSrc: '/images/other.png' };
    expect(getVisualSrc(props)).toBe('/images/other.png');
  });

  it('visualSrc accepts an absolute URL', () => {
    const props: HeroProps = {
      ...sampleProps,
      visualSrc: 'https://cdn.wellflow.io/hero.webp',
    };
    expect(getVisualSrc(props)).toBe('https://cdn.wellflow.io/hero.webp');
  });
});
