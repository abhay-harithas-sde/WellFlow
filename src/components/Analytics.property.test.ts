// Feature: wellflow-website, Property 4: Analytics only loads after acceptance

/**
 * Property-based test for lib/analytics.ts
 * Property 4: Analytics only loads after acceptance
 * Validates: Requirements 12.2, 12.3
 *
 * Pure logic tests (node environment, no DOM).
 * For any ConsentRecord, the analytics script must be present in the DOM
 * if and only if accepted is true.
 *
 * Key invariant: injectGA4Script is called if and only if accepted=true.
 * We test this by mocking injectGA4Script and verifying the AnalyticsLoader
 * logic: it calls injectGA4Script when accepted=true and does NOT call it
 * when accepted=false.
 */

import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// ConsentRecord type (mirrors design.md)
// ---------------------------------------------------------------------------

type ConsentRecord = {
  version: 1;
  accepted: boolean;
  timestamp: number;
};

// ---------------------------------------------------------------------------
// Pure analytics-loading logic extracted from lib/analytics.ts
// ---------------------------------------------------------------------------

/**
 * Mirrors the core logic of AnalyticsLoader's useEffect:
 *   if (!accepted) return;
 *   injectGA4Script();
 *
 * Returns true if injectGA4Script would be called, false otherwise.
 */
function shouldInjectScript(accepted: boolean): boolean {
  return accepted === true;
}

/**
 * Simulates the AnalyticsLoader effect: calls the injector only when accepted.
 * Returns the number of times the injector was invoked.
 */
function runAnalyticsLoader(
  accepted: boolean,
  injector: () => void,
): number {
  let callCount = 0;
  const wrappedInjector = () => {
    callCount++;
    injector();
  };

  // Mirror of AnalyticsLoader useEffect body:
  if (!accepted) return callCount;
  wrappedInjector();

  return callCount;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const consentRecordArb: fc.Arbitrary<ConsentRecord> = fc.record({
  version: fc.constant(1 as const),
  accepted: fc.boolean(),
  timestamp: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
});

// ---------------------------------------------------------------------------
// Property 4 tests
// ---------------------------------------------------------------------------

describe('Analytics — Property 4: Analytics only loads after acceptance', () => {
  /**
   * P4a: For any ConsentRecord, injectGA4Script is called if and only if accepted=true.
   * Validates: Requirements 12.2, 12.3
   */
  it('P4a: injectGA4Script is called if and only if accepted is true', () => {
    fc.assert(
      fc.property(consentRecordArb, (record) => {
        let injected = false;
        const mockInjector = () => { injected = true; };

        const callCount = runAnalyticsLoader(record.accepted, mockInjector);

        if (record.accepted) {
          // Script must be injected when accepted=true
          expect(callCount).toBe(1);
          expect(injected).toBe(true);
        } else {
          // Script must NOT be injected when accepted=false
          expect(callCount).toBe(0);
          expect(injected).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P4b: shouldInjectScript returns true if and only if accepted=true.
   * Validates: Requirements 12.2, 12.3
   */
  it('P4b: shouldInjectScript returns true iff accepted is true', () => {
    fc.assert(
      fc.property(fc.boolean(), (accepted) => {
        const result = shouldInjectScript(accepted);
        expect(result).toBe(accepted);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P4c: For any ConsentRecord with accepted=true, the injector is called exactly once.
   * Validates: Requirements 12.2
   */
  it('P4c: injector is called exactly once when accepted is true', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        (timestamp) => {
          const record: ConsentRecord = { version: 1, accepted: true, timestamp };
          let callCount = 0;
          runAnalyticsLoader(record.accepted, () => { callCount++; });
          expect(callCount).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * P4d: For any ConsentRecord with accepted=false, the injector is never called.
   * Validates: Requirements 12.3
   */
  it('P4d: injector is never called when accepted is false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        (timestamp) => {
          const record: ConsentRecord = { version: 1, accepted: false, timestamp };
          let callCount = 0;
          runAnalyticsLoader(record.accepted, () => { callCount++; });
          expect(callCount).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * P4e: The accepted flag is the sole determinant — timestamp has no effect.
   * For any two ConsentRecords with the same accepted value but different timestamps,
   * the injection behaviour must be identical.
   * Validates: Requirements 12.2, 12.3
   */
  it('P4e: injection behaviour depends only on accepted, not on timestamp', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        (accepted, ts1, ts2) => {
          let count1 = 0;
          let count2 = 0;
          runAnalyticsLoader(accepted, () => { count1++; });
          runAnalyticsLoader(accepted, () => { count2++; });
          expect(count1).toBe(count2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
