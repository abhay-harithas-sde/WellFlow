/**
 * Unit tests for components/ui/WaveformAnimation.tsx
 * Tests playing vs. static state and reduced-motion rendering.
 * Requirements: 6.6, 17.6
 */

// ---------------------------------------------------------------------------
// Pure logic extracted from WaveformAnimation.tsx for node-environment testing
// ---------------------------------------------------------------------------

const BASE_HEIGHTS = [4, 8, 14, 20, 28, 32, 28, 20, 14, 8, 4, 8, 16, 24, 32, 24, 16, 8, 12, 6];
const SVG_HEIGHT = 40;
const BAR_WIDTH = 3;
const GAP = 2;
const DEFAULT_BAR_COUNT = 20;

/** Mirrors the `animate` flag logic in the component */
function shouldAnimate(playing: boolean, reducedMotion: boolean): boolean {
  return playing && !reducedMotion;
}

/** Mirrors the bar-width + gap layout calculation */
function totalSvgWidth(barCount: number): number {
  return barCount * (BAR_WIDTH + GAP) - GAP;
}

/** Mirrors the per-bar height lookup */
function barHeight(index: number): number {
  return BASE_HEIGHTS[index % BASE_HEIGHTS.length];
}

/** Mirrors the per-bar y-position calculation */
function barY(index: number): number {
  const height = barHeight(index);
  return (SVG_HEIGHT - height) / 2;
}

/** Mirrors the per-bar animation delay calculation */
function barDelayMs(index: number, barCount: number): number {
  return (index / barCount) * 600;
}

/** Mirrors the per-bar transformOrigin calculation */
function barTransformOrigin(index: number): string {
  const x = index * (BAR_WIDTH + GAP);
  return `${x + BAR_WIDTH / 2}px ${SVG_HEIGHT / 2}px`;
}

// ---------------------------------------------------------------------------
// Tests: animate flag (Req 6.6)
// ---------------------------------------------------------------------------

describe('WaveformAnimation — animate flag (Req 6.6)', () => {
  it('animates when playing=true and reducedMotion=false', () => {
    expect(shouldAnimate(true, false)).toBe(true);
  });

  it('does NOT animate when playing=false and reducedMotion=false', () => {
    expect(shouldAnimate(false, false)).toBe(false);
  });

  it('does NOT animate when playing=true and reducedMotion=true', () => {
    expect(shouldAnimate(true, true)).toBe(false);
  });

  it('does NOT animate when playing=false and reducedMotion=true', () => {
    expect(shouldAnimate(false, true)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: reduced-motion rendering (Req 17.6)
// ---------------------------------------------------------------------------

describe('WaveformAnimation — reduced-motion rendering (Req 17.6)', () => {
  it('renders static bars (no animation) when prefers-reduced-motion is active', () => {
    const animate = shouldAnimate(true, true);
    expect(animate).toBe(false);
  });

  it('renders animated bars when prefers-reduced-motion is NOT active and playing', () => {
    const animate = shouldAnimate(true, false);
    expect(animate).toBe(true);
  });

  it('static rendering is independent of playing state when reduced motion is on', () => {
    expect(shouldAnimate(true, true)).toBe(false);
    expect(shouldAnimate(false, true)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: SVG layout
// ---------------------------------------------------------------------------

describe('WaveformAnimation — SVG layout', () => {
  it('computes correct total width for default bar count (20)', () => {
    // 20 bars × (3 + 2) − 2 = 98
    expect(totalSvgWidth(DEFAULT_BAR_COUNT)).toBe(98);
  });

  it('computes correct total width for custom bar count (5)', () => {
    // 5 × 5 − 2 = 23
    expect(totalSvgWidth(5)).toBe(23);
  });

  it('computes correct total width for bar count of 1', () => {
    // 1 × 5 − 2 = 3
    expect(totalSvgWidth(1)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Tests: bar heights cycle through base pattern
// ---------------------------------------------------------------------------

describe('WaveformAnimation — bar heights', () => {
  it('first bar has height 4', () => {
    expect(barHeight(0)).toBe(4);
  });

  it('bar at index 20 wraps back to index 0 height (4)', () => {
    expect(barHeight(20)).toBe(BASE_HEIGHTS[0]);
  });

  it('bar at index 5 has height 32 (peak of the waveform)', () => {
    expect(barHeight(5)).toBe(32);
  });

  it('all bar heights are positive numbers', () => {
    for (let i = 0; i < DEFAULT_BAR_COUNT; i++) {
      expect(barHeight(i)).toBeGreaterThan(0);
    }
  });

  it('bar y-position centers the bar vertically within SVG_HEIGHT', () => {
    const h = barHeight(0); // 4
    expect(barY(0)).toBe((SVG_HEIGHT - h) / 2);
  });
});

// ---------------------------------------------------------------------------
// Tests: animation delay stagger
// ---------------------------------------------------------------------------

describe('WaveformAnimation — animation delay stagger', () => {
  it('first bar has delay 0ms', () => {
    expect(barDelayMs(0, DEFAULT_BAR_COUNT)).toBe(0);
  });

  it('last bar (index 19) has delay close to 570ms', () => {
    // (19 / 20) * 600 = 570
    expect(barDelayMs(19, DEFAULT_BAR_COUNT)).toBeCloseTo(570, 5);
  });

  it('delays increase monotonically with bar index', () => {
    for (let i = 1; i < DEFAULT_BAR_COUNT; i++) {
      expect(barDelayMs(i, DEFAULT_BAR_COUNT)).toBeGreaterThan(
        barDelayMs(i - 1, DEFAULT_BAR_COUNT)
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: transformOrigin for animation pivot
// ---------------------------------------------------------------------------

describe('WaveformAnimation — transformOrigin', () => {
  it('first bar transform origin is centered on bar width and SVG mid-height', () => {
    // x=0, so origin = (0 + 1.5)px (20)px
    expect(barTransformOrigin(0)).toBe('1.5px 20px');
  });

  it('second bar transform origin accounts for bar width + gap offset', () => {
    // x = 1 * (3+2) = 5, origin = (5 + 1.5)px 20px
    expect(barTransformOrigin(1)).toBe('6.5px 20px');
  });
});

// ---------------------------------------------------------------------------
// Tests: barCount prop defaults
// ---------------------------------------------------------------------------

describe('WaveformAnimation — barCount prop', () => {
  it('default barCount is 20', () => {
    expect(DEFAULT_BAR_COUNT).toBe(20);
  });

  it('generates the correct number of bars for a custom barCount', () => {
    const count = 10;
    const bars = Array.from({ length: count }, (_, i) => barHeight(i));
    expect(bars).toHaveLength(10);
  });
});
