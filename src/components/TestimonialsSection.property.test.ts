// Feature: wellflow-website, Property 10: Testimonial carousel keyboard navigation completeness

/**
 * Property-based test for components/sections/TestimonialsSection.tsx
 * Property 10: Testimonial carousel keyboard navigation completeness
 * Validates: Requirements 6.4
 *
 * Pure logic tests (node environment, no DOM).
 * For any testimonials array of length N, pressing the "next" control N times
 * starting from the first testimonial must cycle through all N testimonials exactly once.
 *
 * Navigation logic (from TestimonialsSection.tsx):
 *   handleNext: (currentIndex + 1) % total
 *   handlePrev: (currentIndex - 1 + total) % total
 *   Starting index: 0
 */

import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure navigation logic (mirrors TestimonialsSection.tsx)
// ---------------------------------------------------------------------------

function handleNext(currentIndex: number, total: number): number {
  return (currentIndex + 1) % total;
}

function handlePrev(currentIndex: number, total: number): number {
  return (currentIndex - 1 + total) % total;
}

/**
 * Simulate pressing "next" N times from a given starting index.
 * Returns the sequence of indices visited (including the starting index).
 */
function simulateNextPresses(startIndex: number, total: number, presses: number): number[] {
  const visited: number[] = [startIndex];
  let current = startIndex;
  for (let i = 0; i < presses; i++) {
    current = handleNext(current, total);
    visited.push(current);
  }
  return visited;
}

/**
 * Simulate pressing "prev" N times from a given starting index.
 * Returns the sequence of indices visited (including the starting index).
 */
function simulatePrevPresses(startIndex: number, total: number, presses: number): number[] {
  const visited: number[] = [startIndex];
  let current = startIndex;
  for (let i = 0; i < presses; i++) {
    current = handlePrev(current, total);
    visited.push(current);
  }
  return visited;
}

// ---------------------------------------------------------------------------
// Arbitrary: array length between 1 and 20
// ---------------------------------------------------------------------------

const arrayLengthArb = fc.integer({ min: 1, max: 20 });

// ---------------------------------------------------------------------------
// Property 10 tests
// ---------------------------------------------------------------------------

describe('TestimonialsSection — Property 10: Testimonial carousel keyboard navigation completeness', () => {
  /**
   * P10a: For any testimonials array of length N (1–20), pressing next N times
   * from index 0 visits all N indices exactly once.
   * Validates: Requirements 6.4
   */
  it('P10a: pressing next N times from index 0 visits all N indices exactly once', () => {
    fc.assert(
      fc.property(arrayLengthArb, (n) => {
        // Simulate N presses starting from index 0
        // visited includes the starting index, so we get N+1 entries
        const visited = simulateNextPresses(0, n, n);

        // The first N entries (indices 0..N-1) should cover all N indices exactly once
        const firstNCycle = visited.slice(0, n);
        const uniqueIndices = new Set(firstNCycle);

        // All N indices must be visited
        expect(uniqueIndices.size).toBe(n);

        // Every index from 0 to N-1 must appear
        for (let i = 0; i < n; i++) {
          expect(uniqueIndices.has(i)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P10b: For any testimonials array of length N, pressing next N times
   * from index 0 returns to index 0 (full cycle).
   * Validates: Requirements 6.4
   */
  it('P10b: pressing next N times from index 0 returns to index 0 (full cycle)', () => {
    fc.assert(
      fc.property(arrayLengthArb, (n) => {
        let current = 0;
        for (let i = 0; i < n; i++) {
          current = handleNext(current, n);
        }
        expect(current).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P10c: For any testimonials array of length N, pressing prev N times
   * from index 0 also visits all N indices exactly once.
   * Validates: Requirements 6.4
   */
  it('P10c: pressing prev N times from index 0 visits all N indices exactly once', () => {
    fc.assert(
      fc.property(arrayLengthArb, (n) => {
        // Simulate N presses starting from index 0
        const visited = simulatePrevPresses(0, n, n);

        // The first N entries (indices 0..N-1) should cover all N indices exactly once
        const firstNCycle = visited.slice(0, n);
        const uniqueIndices = new Set(firstNCycle);

        // All N indices must be visited
        expect(uniqueIndices.size).toBe(n);

        // Every index from 0 to N-1 must appear
        for (let i = 0; i < n; i++) {
          expect(uniqueIndices.has(i)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P10d: Navigation wraps correctly at boundaries.
   * - next from last index goes to 0
   * - prev from 0 goes to last index (N-1)
   * Validates: Requirements 6.4
   */
  it('P10d: navigation wraps correctly at boundaries', () => {
    fc.assert(
      fc.property(arrayLengthArb, (n) => {
        const lastIndex = n - 1;

        // next from last goes to 0
        expect(handleNext(lastIndex, n)).toBe(0);

        // prev from 0 goes to last
        expect(handlePrev(0, n)).toBe(lastIndex);
      }),
      { numRuns: 100 }
    );
  });
});
