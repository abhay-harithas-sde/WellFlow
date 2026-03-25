import fc from 'fast-check';

// Pure FAQ toggle state machine
// State: openIndex: number | null
// Toggle logic: if openIndex === clickedIndex, set to null; else set to clickedIndex
function faqToggle(openIndex: number | null, clickedIndex: number): number | null {
  return openIndex === clickedIndex ? null : clickedIndex;
}

function applyClicks(initialOpenIndex: number | null, clicks: number[]): number | null {
  return clicks.reduce((state, click) => faqToggle(state, click), initialOpenIndex);
}

describe('FAQSection property tests', () => {
  // Feature: website-completion-murf-wellflow, Property 6: For any sequence of item clicks, at most one FAQ item is expanded at a time
  test('P6: at most one FAQ item is expanded at any point in time', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }), // number of FAQ items N
        fc.array(fc.nat(), { minLength: 0, maxLength: 50 }), // sequence of click indices (raw)
        (n, rawClicks) => {
          // Map raw clicks to valid indices in [0, N-1]
          const clicks = rawClicks.map((c) => c % n);

          // Simulate all intermediate states
          let state: number | null = null;
          for (const click of clicks) {
            state = faqToggle(state, click);
            // Invariant: state is either null or a single valid index in [0, N-1]
            if (state !== null) {
              if (state < 0 || state >= n) return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: website-completion-murf-wellflow, Property 7: For any expanded FAQ item, clicking it collapses it (and vice versa)
  test('P7: clicking an expanded item collapses it; clicking a collapsed item expands it', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }), // number of FAQ items N
        fc.integer({ min: 0, max: 19 }), // item index to test
        (n, rawIndex) => {
          const index = rawIndex % n;

          // Case 1: item is currently expanded — clicking it should collapse (null)
          const afterCollapseClick = faqToggle(index, index);
          if (afterCollapseClick !== null) return false;

          // Case 2: item is currently collapsed (openIndex is null) — clicking it should expand
          const afterExpandClick = faqToggle(null, index);
          if (afterExpandClick !== index) return false;

          // Case 3: a different item is open — clicking this item should expand it (and implicitly close the other)
          const otherIndex = (index + 1) % n;
          if (n > 1) {
            const afterSwitchClick = faqToggle(otherIndex, index);
            if (afterSwitchClick !== index) return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
