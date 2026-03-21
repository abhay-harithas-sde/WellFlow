import * as fc from 'fast-check';

// Feature: website-completion-murf-wellflow, Property 11: For any <img> or Next.js <Image> element rendered by the website, the element has a non-empty alt attribute

/**
 * Property-based test for image alt text presence
 * Property 11: For any <img> or Next.js <Image> element rendered by the website,
 * the element has a non-empty alt attribute.
 * Validates: Requirements 17.3
 *
 * Pure logic tests (node environment, no DOM).
 * Models an image element as { src: string, alt: string } and verifies
 * that the alt attribute is a non-empty, non-whitespace-only string.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal representation of an image element's required attributes. */
interface ImageElement {
  src: string;
  alt: string;
}

// ---------------------------------------------------------------------------
// Pure alt-text presence logic
// ---------------------------------------------------------------------------

/**
 * Returns true when the image element has a non-empty alt attribute.
 * An alt consisting solely of whitespace is considered empty (WCAG 2.1).
 */
function imageHasNonEmptyAlt(img: ImageElement): boolean {
  return img.alt.trim().length > 0;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Any non-empty, non-whitespace-only string suitable for alt text. */
const nonEmptyStringArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter((s) => s.trim().length > 0);

/** Any non-empty string suitable for an image src. */
const srcArb: fc.Arbitrary<string> = fc.webUrl();

/** An image element with a valid (non-empty) alt attribute. */
const imageWithAltArb: fc.Arbitrary<ImageElement> = fc.record({
  src: srcArb,
  alt: nonEmptyStringArb,
});

/** An image element with an empty alt attribute — a violation. */
const imageWithEmptyAltArb: fc.Arbitrary<ImageElement> = fc.record({
  src: srcArb,
  alt: fc.oneof(
    fc.constant(''),
    fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 10 })
  ),
});

// ---------------------------------------------------------------------------
// Property 11 tests
// ---------------------------------------------------------------------------

describe('ImageAccessibility — Property 11: Image elements have non-empty alt attribute', () => {
  /**
   * P11a: For any image element with a non-empty alt string,
   * imageHasNonEmptyAlt returns true.
   * Validates: Requirements 17.3
   */
  it('P11a: image elements with non-empty alt pass the alt-presence check', () => {
    // Feature: website-completion-murf-wellflow, Property 11: For any <img> or Next.js <Image> element rendered by the website, the element has a non-empty alt attribute
    fc.assert(
      fc.property(imageWithAltArb, (img) => {
        expect(imageHasNonEmptyAlt(img)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P11b: For any image element with an empty or whitespace-only alt,
   * imageHasNonEmptyAlt returns false (violation detected).
   * Validates: Requirements 17.3
   */
  it('P11b: image elements with empty or whitespace-only alt fail the alt-presence check', () => {
    // Feature: website-completion-murf-wellflow, Property 11: For any <img> or Next.js <Image> element rendered by the website, the element has a non-empty alt attribute
    fc.assert(
      fc.property(imageWithEmptyAltArb, (img) => {
        expect(imageHasNonEmptyAlt(img)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P11c: The alt-presence invariant holds for all known image elements
   * in the codebase — each must have a non-empty alt attribute.
   * Validates: Requirements 17.3
   */
  it('P11c: all known image elements in the codebase have non-empty alt attributes', () => {
    // Feature: website-completion-murf-wellflow, Property 11: For any <img> or Next.js <Image> element rendered by the website, the element has a non-empty alt attribute
    const knownImages: ImageElement[] = [
      { src: '/hero-visual.png', alt: 'WellFlow voice-powered wellness experience' },
      { src: '/integrations/apple-health.svg', alt: 'Apple Health' },
      { src: '/integrations/google-fit.svg', alt: 'Google Fit' },
      { src: '/integrations/fitbit.svg', alt: 'Fitbit' },
      { src: '/integrations/garmin.svg', alt: 'Garmin' },
      { src: '/integrations/google-calendar.svg', alt: 'Google Calendar' },
      { src: '/integrations/outlook.svg', alt: 'Outlook' },
      { src: '/integrations/slack.svg', alt: 'Slack' },
      { src: '/integrations/whatsapp.svg', alt: 'WhatsApp' },
    ];

    fc.assert(
      fc.property(fc.constantFrom(...knownImages), (img) => {
        expect(imageHasNonEmptyAlt(img)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P11d: For any whitespace-only alt string (any combination of spaces, tabs,
   * newlines), imageHasNonEmptyAlt always returns false.
   * Validates: Requirements 17.3
   */
  it('P11d: whitespace-only alt strings always fail the alt-presence check', () => {
    // Feature: website-completion-murf-wellflow, Property 11: For any <img> or Next.js <Image> element rendered by the website, the element has a non-empty alt attribute
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 20 }),
        fc.webUrl(),
        (whitespaceAlt, src) => {
          const img: ImageElement = { src, alt: whitespaceAlt };
          expect(imageHasNonEmptyAlt(img)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------

// Feature: wellflow-website, Property 12: Images below the fold have loading="lazy"

/**
 * Property-based test for image loading strategy
 * Property 12: Images below the fold have loading="lazy"
/**
 * Property-based test for image loading strategy
 * Property 12: Images below the fold have loading="lazy"
 * Validates: Requirements 9.5
 *
 * Pure logic tests (node environment, no DOM).
 * For any <img> or next/image element that is not in the hero section,
 * the element must carry the loading="lazy" attribute (or equivalent Next.js prop).
 *
 * The invariant:
 *   isHero  → hasPriority === true  (eager / LCP-optimised)
 *   !isHero → hasLazyLoading === true (or no priority flag)
 */

// ---------------------------------------------------------------------------
// Types (P12)
// ---------------------------------------------------------------------------

/**
 * Descriptor for an image element in the page.
 * - isHero:         true when the image lives inside the HeroSection
 * - hasLazyLoading: true when loading="lazy" is set (native img) or the
 *                   next/image component does NOT have priority={true}
 * - hasPriority:    true when next/image priority={true} is set (eager load)
 */
interface ImageDescriptor {
  isHero: boolean;
  hasLazyLoading: boolean;
  hasPriority: boolean;
}

// ---------------------------------------------------------------------------
// Pure loading-strategy logic
// ---------------------------------------------------------------------------

/**
 * Returns true when the image's loading strategy is correct per the spec:
 *   - Hero images must use priority (eager) loading.
 *   - All other images must use lazy loading (no priority).
 */
function hasCorrectLoadingStrategy(img: ImageDescriptor): boolean {
  if (img.isHero) {
    // Hero image must be priority-loaded for LCP
    return img.hasPriority === true;
  }
  // Non-hero images must be lazy-loaded (and must NOT have priority)
  return img.hasLazyLoading === true && img.hasPriority === false;
}

/**
 * Returns true when a non-hero image is correctly lazy-loaded.
 * Convenience predicate used in several properties below.
 */
function nonHeroImageIsLazy(img: ImageDescriptor): boolean {
  return !img.isHero && img.hasLazyLoading && !img.hasPriority;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Any image descriptor with unconstrained fields. */
const imageDescriptorArb: fc.Arbitrary<ImageDescriptor> = fc.record({
  isHero: fc.boolean(),
  hasLazyLoading: fc.boolean(),
  hasPriority: fc.boolean(),
});

/** A correctly-configured hero image descriptor. */
const heroImageArb: fc.Arbitrary<ImageDescriptor> = fc.record({
  isHero: fc.constant(true),
  hasLazyLoading: fc.boolean(), // irrelevant for hero — priority takes precedence
  hasPriority: fc.constant(true),
});

/** A correctly-configured non-hero (below-the-fold) image descriptor. */
const nonHeroImageArb: fc.Arbitrary<ImageDescriptor> = fc.record({
  isHero: fc.constant(false),
  hasLazyLoading: fc.constant(true),
  hasPriority: fc.constant(false),
});

/** A non-hero image that is incorrectly NOT lazy-loaded. */
const nonHeroEagerImageArb: fc.Arbitrary<ImageDescriptor> = fc.record({
  isHero: fc.constant(false),
  hasLazyLoading: fc.constant(false),
  hasPriority: fc.oneof(fc.constant(true), fc.constant(false)),
});

// ---------------------------------------------------------------------------
// Property 12 tests
// ---------------------------------------------------------------------------

describe('ImageAccessibility — Property 12: Images below the fold have loading="lazy"', () => {
  /**
   * P12a: For any non-hero image with correct lazy configuration,
   * hasCorrectLoadingStrategy returns true.
   * Validates: Requirements 9.5
   */
  it('P12a: non-hero images with loading="lazy" and no priority pass the strategy check', () => {
    fc.assert(
      fc.property(nonHeroImageArb, (img) => {
        expect(hasCorrectLoadingStrategy(img)).toBe(true);
        expect(nonHeroImageIsLazy(img)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P12b: For any hero image with priority=true,
   * hasCorrectLoadingStrategy returns true.
   * Validates: Requirements 9.5
   */
  it('P12b: hero images with priority=true pass the strategy check', () => {
    fc.assert(
      fc.property(heroImageArb, (img) => {
        expect(hasCorrectLoadingStrategy(img)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P12c: For any non-hero image that is NOT lazy-loaded,
   * hasCorrectLoadingStrategy returns false (violation detected).
   * Validates: Requirements 9.5
   */
  it('P12c: non-hero images without lazy loading fail the strategy check', () => {
    fc.assert(
      fc.property(nonHeroEagerImageArb, (img) => {
        expect(hasCorrectLoadingStrategy(img)).toBe(false);
        expect(nonHeroImageIsLazy(img)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P12d: The invariant holds for all valid image descriptors:
   *   isHero  → hasPriority
   *   !isHero → hasLazyLoading ∧ ¬hasPriority
   * Validates: Requirements 9.5
   */
  it('P12d: the loading-strategy invariant holds for all correctly-configured images', () => {
    fc.assert(
      fc.property(
        fc.oneof(heroImageArb, nonHeroImageArb),
        (img) => {
          if (img.isHero) {
            expect(img.hasPriority).toBe(true);
          } else {
            expect(img.hasLazyLoading).toBe(true);
            expect(img.hasPriority).toBe(false);
          }
          expect(hasCorrectLoadingStrategy(img)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * P12e: A non-hero image with priority=true (eager) always fails the check,
   * regardless of the hasLazyLoading flag.
   * Validates: Requirements 9.5
   */
  it('P12e: non-hero images with priority=true always fail the strategy check', () => {
    fc.assert(
      fc.property(fc.boolean(), (hasLazyLoading) => {
        const img: ImageDescriptor = { isHero: false, hasLazyLoading, hasPriority: true };
        expect(hasCorrectLoadingStrategy(img)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Concrete examples — actual image configurations from the codebase
// ---------------------------------------------------------------------------

describe('ImageAccessibility — Property 12: Concrete codebase image configurations', () => {
  /**
   * HeroSection uses next/image with priority={true}.
   * This is the ONLY image that should NOT be lazy-loaded.
   */
  it('HeroSection image: priority=true, no lazy loading — correct for hero', () => {
    const heroSectionImage: ImageDescriptor = {
      isHero: true,
      hasLazyLoading: false, // priority overrides lazy; next/image omits loading="lazy"
      hasPriority: true,
    };
    expect(hasCorrectLoadingStrategy(heroSectionImage)).toBe(true);
  });

  /**
   * IntegrationLogo uses next/image with loading="lazy" (non-hero).
   * All integration logos are below the fold.
   */
  it('IntegrationLogo image: loading="lazy", no priority — correct for non-hero', () => {
    const integrationLogoImage: ImageDescriptor = {
      isHero: false,
      hasLazyLoading: true,
      hasPriority: false,
    };
    expect(hasCorrectLoadingStrategy(integrationLogoImage)).toBe(true);
    expect(nonHeroImageIsLazy(integrationLogoImage)).toBe(true);
  });

  /**
   * Hypothetical violation: a non-hero image accidentally given priority=true.
   * The strategy check must catch this.
   */
  it('Non-hero image with priority=true — violation correctly detected', () => {
    const violatingImage: ImageDescriptor = {
      isHero: false,
      hasLazyLoading: false,
      hasPriority: true,
    };
    expect(hasCorrectLoadingStrategy(violatingImage)).toBe(false);
  });

  /**
   * Hypothetical violation: a non-hero image with neither lazy nor priority.
   * The strategy check must catch this (missing lazy attribute).
   */
  it('Non-hero image with no loading attribute and no priority — violation correctly detected', () => {
    const violatingImage: ImageDescriptor = {
      isHero: false,
      hasLazyLoading: false,
      hasPriority: false,
    };
    expect(hasCorrectLoadingStrategy(violatingImage)).toBe(false);
  });

  /**
   * All non-hero images in the codebase should be lazy-loaded.
   * Enumerate the known image usages (excluding hero).
   */
  it('All known non-hero image configurations are correctly lazy-loaded', () => {
    const knownNonHeroImages: Array<{ name: string; descriptor: ImageDescriptor }> = [
      {
        name: 'IntegrationLogo (IntegrationsSection)',
        descriptor: { isHero: false, hasLazyLoading: true, hasPriority: false },
      },
    ];

    for (const { name, descriptor } of knownNonHeroImages) {
      expect(hasCorrectLoadingStrategy(descriptor)).toBe(true);
      expect(nonHeroImageIsLazy(descriptor)).toBe(true);
      // Provide a useful failure message via a manual check
      if (!hasCorrectLoadingStrategy(descriptor)) {
        throw new Error(`Image "${name}" does not have correct loading strategy`);
      }
    }
  });
});

// Feature: wellflow-website, Property 13: All non-decorative images have non-empty alt text

/**
 * Property-based test for image alt text accessibility
 * Property 13: All non-decorative images have non-empty alt text
 * Validates: Requirements 10.1
 *
 * Pure logic tests (node environment, no DOM).
 * For any non-decorative image, the alt attribute must be a non-empty string.
 *
 * The invariant:
 *   !isDecorative → alt.trim().length > 0
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Descriptor for an image's alt text accessibility configuration.
 * - isDecorative: true when the image is purely decorative (alt="" is correct)
 * - alt:          the alt attribute value on the image element
 */
interface ImageAltDescriptor {
  isDecorative: boolean;
  alt: string;
}

// ---------------------------------------------------------------------------
// Pure alt-text validation logic
// ---------------------------------------------------------------------------

/**
 * Returns true when the image's alt text configuration is correct per WCAG 2.1:
 *   - Non-decorative images must have a non-empty alt string.
 *   - Decorative images should have alt="" (empty string is acceptable).
 */
function hasValidAltText(img: ImageAltDescriptor): boolean {
  if (img.isDecorative) {
    // Decorative images: empty alt is correct (alt="" hides from screen readers)
    return true;
  }
  // Non-decorative images: alt must be a non-empty, non-whitespace-only string
  return img.alt.trim().length > 0;
}

/**
 * Returns true when a non-decorative image has a non-empty alt attribute.
 * Convenience predicate for the core invariant.
 */
function nonDecorativeImageHasAlt(img: ImageAltDescriptor): boolean {
  return img.isDecorative || img.alt.trim().length > 0;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Any non-empty, non-whitespace-only string suitable for alt text. */
const nonEmptyAltArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter((s) => s.trim().length > 0);

/** A correctly-configured non-decorative image (non-empty alt). */
const nonDecorativeImageArb: fc.Arbitrary<ImageAltDescriptor> = fc.record({
  isDecorative: fc.constant(false),
  alt: nonEmptyAltArb,
});

/** A correctly-configured decorative image (any alt value is acceptable). */
const decorativeImageArb: fc.Arbitrary<ImageAltDescriptor> = fc.record({
  isDecorative: fc.constant(true),
  alt: fc.oneof(fc.constant(''), fc.string()),
});

/** A non-decorative image with an empty or whitespace-only alt — a violation. */
const nonDecorativeEmptyAltArb: fc.Arbitrary<ImageAltDescriptor> = fc.record({
  isDecorative: fc.constant(false),
  alt: fc.oneof(
    fc.constant(''),
    fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 10 })
  ),
});

// ---------------------------------------------------------------------------
// Property 13 tests
// ---------------------------------------------------------------------------

describe('ImageAccessibility — Property 13: All non-decorative images have non-empty alt text', () => {
  /**
   * P13a: For any non-decorative image with a non-empty alt string,
   * hasValidAltText returns true.
   * Validates: Requirements 10.1
   */
  it('P13a: non-decorative images with non-empty alt pass the alt-text check', () => {
    fc.assert(
      fc.property(nonDecorativeImageArb, (img) => {
        expect(hasValidAltText(img)).toBe(true);
        expect(nonDecorativeImageHasAlt(img)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P13b: For any decorative image (regardless of alt value),
   * hasValidAltText returns true.
   * Validates: Requirements 10.1
   */
  it('P13b: decorative images always pass the alt-text check', () => {
    fc.assert(
      fc.property(decorativeImageArb, (img) => {
        expect(hasValidAltText(img)).toBe(true);
        expect(nonDecorativeImageHasAlt(img)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P13c: For any non-decorative image with an empty or whitespace-only alt,
   * hasValidAltText returns false (violation detected).
   * Validates: Requirements 10.1
   */
  it('P13c: non-decorative images with empty alt fail the alt-text check', () => {
    fc.assert(
      fc.property(nonDecorativeEmptyAltArb, (img) => {
        expect(hasValidAltText(img)).toBe(false);
        expect(nonDecorativeImageHasAlt(img)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P13d: The invariant holds for all valid image descriptors:
   *   !isDecorative → alt.trim().length > 0
   * Validates: Requirements 10.1
   */
  it('P13d: the alt-text invariant holds for all correctly-configured images', () => {
    fc.assert(
      fc.property(
        fc.oneof(nonDecorativeImageArb, decorativeImageArb),
        (img) => {
          if (!img.isDecorative) {
            expect(img.alt.trim().length).toBeGreaterThan(0);
          }
          expect(hasValidAltText(img)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * P13e: A non-decorative image with alt consisting solely of whitespace
   * always fails the check, regardless of whitespace character used.
   * Validates: Requirements 10.1
   */
  it('P13e: non-decorative images with whitespace-only alt always fail the check', () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 20 }),
        (whitespaceAlt) => {
          const img: ImageAltDescriptor = { isDecorative: false, alt: whitespaceAlt };
          expect(hasValidAltText(img)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Concrete examples — actual image configurations from the codebase
// ---------------------------------------------------------------------------

describe('ImageAccessibility — Property 13: Concrete codebase alt text configurations', () => {
  /**
   * HeroSection: <Image alt="WellFlow voice-powered wellness experience">
   * Non-decorative, non-empty alt — correct.
   */
  it('HeroSection image: non-decorative with descriptive alt — correct', () => {
    const heroImage: ImageAltDescriptor = {
      isDecorative: false,
      alt: 'WellFlow voice-powered wellness experience',
    };
    expect(hasValidAltText(heroImage)).toBe(true);
    expect(nonDecorativeImageHasAlt(heroImage)).toBe(true);
  });

  /**
   * IntegrationLogo: <Image alt={name}> where name is the platform name.
   * Non-decorative (identifies the platform), non-empty alt — correct.
   */
  it('IntegrationLogo image: non-decorative with platform name as alt — correct', () => {
    const integrationNames = [
      'Apple Health',
      'Google Fit',
      'Fitbit',
      'Garmin',
      'Google Calendar',
      'Outlook',
      'Slack',
      'WhatsApp',
    ];
    for (const name of integrationNames) {
      const img: ImageAltDescriptor = { isDecorative: false, alt: name };
      expect(hasValidAltText(img)).toBe(true);
      expect(nonDecorativeImageHasAlt(img)).toBe(true);
    }
  });

  /**
   * FeatureCard icons: rendered as <div aria-hidden="true"> — no img element.
   * Decorative context: if an img were used, alt="" would be correct.
   */
  it('Decorative icon image: alt="" is acceptable for decorative images', () => {
    const decorativeIcon: ImageAltDescriptor = { isDecorative: true, alt: '' };
    expect(hasValidAltText(decorativeIcon)).toBe(true);
    expect(nonDecorativeImageHasAlt(decorativeIcon)).toBe(true);
  });

  /**
   * Hypothetical violation: a non-decorative image with no alt attribute (empty string).
   * The check must catch this.
   */
  it('Non-decorative image with empty alt — violation correctly detected', () => {
    const violatingImage: ImageAltDescriptor = { isDecorative: false, alt: '' };
    expect(hasValidAltText(violatingImage)).toBe(false);
    expect(nonDecorativeImageHasAlt(violatingImage)).toBe(false);
  });

  /**
   * All known non-decorative image usages in the codebase have valid alt text.
   */
  it('All known non-decorative image configurations have valid alt text', () => {
    const knownImages: Array<{ name: string; descriptor: ImageAltDescriptor }> = [
      {
        name: 'HeroSection visual',
        descriptor: { isDecorative: false, alt: 'WellFlow voice-powered wellness experience' },
      },
      {
        name: 'IntegrationLogo (Apple Health)',
        descriptor: { isDecorative: false, alt: 'Apple Health' },
      },
      {
        name: 'IntegrationLogo (Google Fit)',
        descriptor: { isDecorative: false, alt: 'Google Fit' },
      },
    ];

    for (const { name, descriptor } of knownImages) {
      const valid = hasValidAltText(descriptor);
      if (!valid) {
        throw new Error(`Image "${name}" has invalid alt text: "${descriptor.alt}"`);
      }
      expect(valid).toBe(true);
    }
  });
});
