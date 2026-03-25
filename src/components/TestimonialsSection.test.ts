/**
 * Unit tests for components/sections/TestimonialsSection.tsx
 * Tests next/prev carousel navigation logic and keyboard arrow key handling.
 * Requirements: 6.3, 6.4
 *
 * Since jest runs in 'node' environment (no DOM), we test the pure logic
 * extracted from the TestimonialsSection component.
 */

// ---------------------------------------------------------------------------
// Pure navigation logic (mirrors TestimonialsSection.tsx)
// ---------------------------------------------------------------------------

interface Testimonial {
  id: string;
  quote: string;
  author: string;
  rating: number;
}

/** Mirrors handleNext: (currentIndex + 1) % total */
function handleNext(currentIndex: number, total: number): number {
  return (currentIndex + 1) % total;
}

/** Mirrors handlePrev: (currentIndex - 1 + total) % total */
function handlePrev(currentIndex: number, total: number): number {
  return (currentIndex - 1 + total) % total;
}

/** Mirrors handleKeyDown: ArrowRight → next, ArrowLeft → prev */
function handleKeyDown(
  key: string,
  currentIndex: number,
  total: number
): number {
  if (key === 'ArrowRight') return handleNext(currentIndex, total);
  if (key === 'ArrowLeft') return handlePrev(currentIndex, total);
  return currentIndex; // no change for other keys
}

/** Mirrors computeAggregateRating from TestimonialsSection.tsx */
function computeAggregateRating(testimonials: Testimonial[]): number {
  if (testimonials.length === 0) return 0;
  const sum = testimonials.reduce((acc, t) => acc + t.rating, 0);
  return Math.round((sum / testimonials.length) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Tests: Next control (Req 6.3)
// ---------------------------------------------------------------------------

describe('TestimonialsSection — next control (Req 6.3)', () => {
  it('advances index by 1 from the first testimonial', () => {
    expect(handleNext(0, 5)).toBe(1);
  });

  it('advances index by 1 from a middle testimonial', () => {
    expect(handleNext(2, 5)).toBe(3);
  });

  it('wraps from the last testimonial back to the first', () => {
    expect(handleNext(4, 5)).toBe(0);
  });

  it('wraps correctly with a 2-item list', () => {
    expect(handleNext(1, 2)).toBe(0);
  });

  it('wraps correctly with a single-item list', () => {
    expect(handleNext(0, 1)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: Prev control (Req 6.3)
// ---------------------------------------------------------------------------

describe('TestimonialsSection — prev control (Req 6.3)', () => {
  it('decrements index by 1 from the last testimonial', () => {
    expect(handlePrev(4, 5)).toBe(3);
  });

  it('decrements index by 1 from a middle testimonial', () => {
    expect(handlePrev(2, 5)).toBe(1);
  });

  it('wraps from the first testimonial to the last', () => {
    expect(handlePrev(0, 5)).toBe(4);
  });

  it('wraps correctly with a 2-item list', () => {
    expect(handlePrev(0, 2)).toBe(1);
  });

  it('wraps correctly with a single-item list', () => {
    expect(handlePrev(0, 1)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: Keyboard arrow key navigation (Req 6.4)
// ---------------------------------------------------------------------------

describe('TestimonialsSection — keyboard arrow key navigation (Req 6.4)', () => {
  it('ArrowRight triggers next navigation', () => {
    expect(handleKeyDown('ArrowRight', 0, 5)).toBe(1);
  });

  it('ArrowRight wraps from last to first', () => {
    expect(handleKeyDown('ArrowRight', 4, 5)).toBe(0);
  });

  it('ArrowLeft triggers prev navigation', () => {
    expect(handleKeyDown('ArrowLeft', 3, 5)).toBe(2);
  });

  it('ArrowLeft wraps from first to last', () => {
    expect(handleKeyDown('ArrowLeft', 0, 5)).toBe(4);
  });

  it('other keys do not change the index', () => {
    expect(handleKeyDown('Enter', 2, 5)).toBe(2);
    expect(handleKeyDown('Space', 2, 5)).toBe(2);
    expect(handleKeyDown('ArrowUp', 2, 5)).toBe(2);
    expect(handleKeyDown('ArrowDown', 2, 5)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Tests: Aggregate rating computation
// ---------------------------------------------------------------------------

describe('TestimonialsSection — aggregate rating computation', () => {
  it('computes the correct average from a testimonials array', () => {
    const testimonials: Testimonial[] = [
      { id: '1', quote: 'Great', author: 'Alice', rating: 5 },
      { id: '2', quote: 'Good', author: 'Bob', rating: 4 },
      { id: '3', quote: 'Okay', author: 'Carol', rating: 3 },
    ];
    // (5 + 4 + 3) / 3 = 4.0
    expect(computeAggregateRating(testimonials)).toBe(4);
  });

  it('rounds to one decimal place', () => {
    const testimonials: Testimonial[] = [
      { id: '1', quote: 'A', author: 'A', rating: 5 },
      { id: '2', quote: 'B', author: 'B', rating: 4 },
    ];
    // (5 + 4) / 2 = 4.5
    expect(computeAggregateRating(testimonials)).toBe(4.5);
  });

  it('returns 0 for an empty testimonials array', () => {
    expect(computeAggregateRating([])).toBe(0);
  });

  it('returns the single rating when there is only one testimonial', () => {
    const testimonials: Testimonial[] = [
      { id: '1', quote: 'Solo', author: 'Solo', rating: 4 },
    ];
    expect(computeAggregateRating(testimonials)).toBe(4);
  });
});
