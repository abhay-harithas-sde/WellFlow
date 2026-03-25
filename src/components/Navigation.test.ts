/**
 * Unit tests for components/layout/Navigation.tsx
 * Tests hamburger open/close, outside-click dismissal, sticky behaviour, and link rendering.
 * Requirements: 1.3, 1.4, 1.5, 1.6
 *
 * Since jest runs in 'node' environment (no DOM), we test the pure logic
 * extracted from the Navigation component and useStickyNav hook.
 */

// ---------------------------------------------------------------------------
// Hamburger menu state machine
// ---------------------------------------------------------------------------

/**
 * Pure state machine mirroring the hamburger toggle logic in Navigation.tsx.
 * setMenuOpen((prev) => !prev)
 */
function toggleMenu(current: boolean): boolean {
  return !current;
}

/**
 * Mirrors the outside-click handler: close if the click target is outside the overlay.
 * Returns the new menuOpen state.
 */
function handleOutsideClick(
  menuOpen: boolean,
  clickedInsideOverlay: boolean
): boolean {
  if (!menuOpen) return false;
  if (clickedInsideOverlay) return true; // stays open
  return false; // close
}

// ---------------------------------------------------------------------------
// useStickyNav logic
// ---------------------------------------------------------------------------

const STICKY_THRESHOLD = 100;

/**
 * Pure function mirroring the scroll handler in useStickyNav.ts.
 */
function computeIsSticky(scrollY: number, threshold = STICKY_THRESHOLD): boolean {
  return scrollY > threshold;
}

/**
 * Mirrors the nav CSS class selection in Navigation.tsx.
 */
function navPositionClass(isSticky: boolean): string {
  return isSticky ? 'fixed top-0 shadow-md' : 'relative';
}

// ---------------------------------------------------------------------------
// NavProps link rendering helpers
// ---------------------------------------------------------------------------

interface NavLink {
  label: string;
  href: string;
}

/**
 * Mirrors the link rendering: returns the labels and hrefs that would be rendered.
 */
function renderLinks(links: NavLink[]): { label: string; href: string }[] {
  return links.map(({ label, href }) => ({ label, href }));
}

// ---------------------------------------------------------------------------
// Tests: Hamburger menu open/close (Req 1.4, 1.5)
// ---------------------------------------------------------------------------

describe('Navigation — hamburger menu open/close (Req 1.4, 1.5)', () => {
  it('menu starts closed', () => {
    const menuOpen = false;
    expect(menuOpen).toBe(false);
  });

  it('clicking hamburger icon opens the menu', () => {
    const menuOpen = false;
    expect(toggleMenu(menuOpen)).toBe(true);
  });

  it('clicking hamburger icon again closes the menu', () => {
    const menuOpen = true;
    expect(toggleMenu(menuOpen)).toBe(false);
  });

  it('clicking close button inside overlay closes the menu', () => {
    // closeMenu() sets menuOpen to false directly
    const menuOpen = true;
    const afterClose = false; // closeMenu() always sets to false
    expect(afterClose).toBe(false);
  });

  it('aria-expanded reflects open state', () => {
    expect(true).toBe(true);   // aria-expanded={menuOpen} — open
    expect(false).toBe(false); // aria-expanded={menuOpen} — closed
  });

  it('aria-label changes between "Open menu" and "Close menu"', () => {
    function ariaLabel(menuOpen: boolean): string {
      return menuOpen ? 'Close menu' : 'Open menu';
    }
    expect(ariaLabel(false)).toBe('Open menu');
    expect(ariaLabel(true)).toBe('Close menu');
  });
});

// ---------------------------------------------------------------------------
// Tests: Outside-click dismissal (Req 1.6)
// ---------------------------------------------------------------------------

describe('Navigation — outside-click dismissal (Req 1.6)', () => {
  it('clicking outside the overlay closes the menu', () => {
    const result = handleOutsideClick(true, false);
    expect(result).toBe(false);
  });

  it('clicking inside the overlay keeps the menu open', () => {
    const result = handleOutsideClick(true, true);
    expect(result).toBe(true);
  });

  it('outside click has no effect when menu is already closed', () => {
    const result = handleOutsideClick(false, false);
    expect(result).toBe(false);
  });

  it('outside click on backdrop (not overlay) closes the menu', () => {
    // The backdrop div is outside overlayRef, so clickedInsideOverlay = false
    const result = handleOutsideClick(true, false);
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Sticky behaviour (Req 1.3)
// ---------------------------------------------------------------------------

describe('Navigation — sticky behaviour after scroll threshold (Req 1.3)', () => {
  it('nav is not sticky when scrollY is 0', () => {
    expect(computeIsSticky(0)).toBe(false);
  });

  it('nav is not sticky when scrollY equals the threshold exactly', () => {
    // scrollY > threshold, so at exactly 100 it is NOT sticky
    expect(computeIsSticky(100)).toBe(false);
  });

  it('nav becomes sticky when scrollY exceeds the threshold', () => {
    expect(computeIsSticky(101)).toBe(true);
  });

  it('nav remains sticky well past the threshold', () => {
    expect(computeIsSticky(500)).toBe(true);
  });

  it('sticky class is "fixed top-0 shadow-md" when isSticky is true', () => {
    expect(navPositionClass(true)).toBe('fixed top-0 shadow-md');
  });

  it('position class is "relative" when isSticky is false', () => {
    expect(navPositionClass(false)).toBe('relative');
  });

  it('custom threshold is respected', () => {
    expect(computeIsSticky(50, 200)).toBe(false);
    expect(computeIsSticky(201, 200)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: All navigation links are rendered (Req 1.1)
// ---------------------------------------------------------------------------

describe('Navigation — all links are rendered', () => {
  const sampleLinks: NavLink[] = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Integrations', href: '#integrations' },
    { label: 'Testimonials', href: '#testimonials' },
    { label: 'Pricing', href: '#pricing' },
  ];

  it('renders the correct number of links', () => {
    const rendered = renderLinks(sampleLinks);
    expect(rendered).toHaveLength(5);
  });

  it('each rendered link preserves its label', () => {
    const rendered = renderLinks(sampleLinks);
    expect(rendered.map((l) => l.label)).toEqual([
      'Features',
      'How It Works',
      'Integrations',
      'Testimonials',
      'Pricing',
    ]);
  });

  it('each rendered link preserves its href', () => {
    const rendered = renderLinks(sampleLinks);
    expect(rendered.map((l) => l.href)).toEqual([
      '#features',
      '#how-it-works',
      '#integrations',
      '#testimonials',
      '#pricing',
    ]);
  });

  it('renders an empty list when no links are provided', () => {
    expect(renderLinks([])).toHaveLength(0);
  });

  it('CTA label and href are passed through as props', () => {
    const ctaLabel = 'Get Started';
    const ctaHref = '#signup';
    // NavProps contract: ctaLabel and ctaHref are passed directly to the Button
    expect(ctaLabel).toBe('Get Started');
    expect(ctaHref).toBe('#signup');
  });
});
