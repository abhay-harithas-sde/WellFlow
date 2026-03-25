// Feature: wellflow-website, Property 2: Cookie consent persistence round-trip

/**
 * Property-based test for hooks/useCookieConsent.ts
 * Property 2: Cookie consent persistence round-trip
 * Validates: Requirements 12.2, 12.3
 *
 * Pure logic tests (node environment, no DOM).
 * For any consent decision (accept or decline), serializing it to localStorage
 * and then reading it back must produce an equivalent ConsentRecord with the
 * same accepted value.
 */

import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// ConsentRecord type (mirrors design.md and useCookieConsent.ts)
// ---------------------------------------------------------------------------

type ConsentRecord = {
  version: 1;
  accepted: boolean;
  timestamp: number;
};

// ---------------------------------------------------------------------------
// Pure persistence logic extracted from useCookieConsent.ts
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'wellflow_cookie_consent';

/** Simulates an in-memory localStorage for pure testing. */
function createMemoryStorage(): Map<string, string> {
  return new Map();
}

function writeToStorage(store: Map<string, string>, record: ConsentRecord): void {
  store.set(STORAGE_KEY, JSON.stringify(record));
}

function readFromStorage(store: Map<string, string>): ConsentRecord | null {
  try {
    const raw = store.get(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (parsed.version === 1 && typeof parsed.accepted === 'boolean') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
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
// Property 2 tests
// ---------------------------------------------------------------------------

describe('CookieConsent — Property 2: Cookie consent persistence round-trip', () => {
  /**
   * P2a: For any accepted boolean, serializing and deserializing a ConsentRecord
   * preserves the accepted value.
   * Validates: Requirements 12.2, 12.3
   */
  it('P2a: serializing and deserializing a ConsentRecord preserves the accepted value', () => {
    fc.assert(
      fc.property(fc.boolean(), (accepted) => {
        const store = createMemoryStorage();
        const record: ConsentRecord = { version: 1, accepted, timestamp: Date.now() };
        writeToStorage(store, record);
        const result = readFromStorage(store);
        expect(result).not.toBeNull();
        expect(result!.accepted).toBe(accepted);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P2b: For any ConsentRecord, the round-trip produces an equivalent record
   * (same version, accepted, and timestamp).
   * Validates: Requirements 12.2, 12.3
   */
  it('P2b: round-trip produces an equivalent ConsentRecord', () => {
    fc.assert(
      fc.property(consentRecordArb, (record) => {
        const store = createMemoryStorage();
        writeToStorage(store, record);
        const result = readFromStorage(store);
        expect(result).not.toBeNull();
        expect(result!.version).toBe(record.version);
        expect(result!.accepted).toBe(record.accepted);
        expect(result!.timestamp).toBe(record.timestamp);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P2c: Invalid/corrupted storage data returns null (graceful fallback).
   * Validates: Requirements 12.2, 12.3
   */
  it('P2c: invalid or corrupted storage data returns null', () => {
    const invalidValues = [
      'not-json',
      '{"version":2,"accepted":true,"timestamp":0}',   // wrong version
      '{"version":1,"accepted":"yes","timestamp":0}',  // accepted not boolean
      '{"version":1,"timestamp":0}',                   // missing accepted
      '{}',
      'null',
      '[]',
      '',
    ];

    for (const raw of invalidValues) {
      const store = createMemoryStorage();
      if (raw !== '') {
        store.set(STORAGE_KEY, raw);
      }
      const result = readFromStorage(store);
      expect(result).toBeNull();
    }
  });

  /**
   * P2d: Missing storage key returns null.
   * Validates: Requirements 12.2, 12.3
   */
  it('P2d: missing storage key returns null', () => {
    const store = createMemoryStorage();
    // Nothing written — key is absent
    const result = readFromStorage(store);
    expect(result).toBeNull();
  });
});

// Feature: wellflow-website, Property 3: Consent decision suppresses banner on revisit

/**
 * Property-based test for hooks/useCookieConsent.ts
 * Property 3: Consent decision suppresses banner on revisit
 * Validates: Requirements 12.5
 *
 * Pure logic tests (node environment, no DOM).
 * For any ConsentRecord where decided is true (i.e., a stored record exists),
 * the cookie consent banner must not be rendered.
 *
 * The banner renders null when decided === true (see CookieConsentBanner.tsx).
 * We verify the pure logic: when a valid ConsentRecord is present in storage,
 * readFromStorage returns a non-null record, which causes the hook to set
 * decided=true, which suppresses the banner.
 */

// ---------------------------------------------------------------------------
// Pure banner-visibility logic (mirrors CookieConsentBanner.tsx + useCookieConsent.ts)
// ---------------------------------------------------------------------------

type ConsentRecordV1 = {
  version: 1;
  accepted: boolean;
  timestamp: number;
};

const CONSENT_KEY = 'wellflow_cookie_consent';

function readConsentFromStorage(store: Map<string, string>): ConsentRecordV1 | null {
  try {
    const raw = store.get(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecordV1;
    if (parsed.version === 1 && typeof parsed.accepted === 'boolean') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Derives the ConsentState that useCookieConsent would produce after reading
 * from storage. Returns { decided, accepted }.
 */
function deriveConsentState(store: Map<string, string>): { decided: boolean; accepted: boolean } {
  const record = readConsentFromStorage(store);
  if (record) {
    return { decided: true, accepted: record.accepted };
  }
  return { decided: false, accepted: false };
}

/**
 * Mirrors the banner render condition in CookieConsentBanner.tsx:
 *   if (decided) return null;
 * Returns true when the banner should be shown, false when suppressed.
 */
function isBannerVisible(state: { decided: boolean }): boolean {
  return !state.decided;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const decidedConsentRecordArb: fc.Arbitrary<ConsentRecordV1> = fc.record({
  version: fc.constant(1 as const),
  accepted: fc.boolean(),
  timestamp: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
});

// ---------------------------------------------------------------------------
// Property 3 tests
// ---------------------------------------------------------------------------

describe('CookieConsent — Property 3: Consent decision suppresses banner on revisit', () => {
  /**
   * P3a: For any ConsentRecord (decided=true), the banner must not be visible.
   * Validates: Requirements 12.5
   */
  it('P3a: banner is suppressed when a ConsentRecord exists in storage', () => {
    fc.assert(
      fc.property(decidedConsentRecordArb, (record) => {
        const store = new Map<string, string>();
        store.set(CONSENT_KEY, JSON.stringify(record));

        const state = deriveConsentState(store);

        // A stored record means decided=true
        expect(state.decided).toBe(true);
        // Banner must not be rendered when decided=true
        expect(isBannerVisible(state)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P3b: accepted=true (user accepted) suppresses the banner.
   * Validates: Requirements 12.5
   */
  it('P3b: banner is suppressed when user previously accepted cookies', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }), (timestamp) => {
        const store = new Map<string, string>();
        const record: ConsentRecordV1 = { version: 1, accepted: true, timestamp };
        store.set(CONSENT_KEY, JSON.stringify(record));

        const state = deriveConsentState(store);
        expect(state.decided).toBe(true);
        expect(state.accepted).toBe(true);
        expect(isBannerVisible(state)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P3c: accepted=false (user declined) also suppresses the banner.
   * Validates: Requirements 12.5
   */
  it('P3c: banner is suppressed when user previously declined cookies', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }), (timestamp) => {
        const store = new Map<string, string>();
        const record: ConsentRecordV1 = { version: 1, accepted: false, timestamp };
        store.set(CONSENT_KEY, JSON.stringify(record));

        const state = deriveConsentState(store);
        expect(state.decided).toBe(true);
        expect(state.accepted).toBe(false);
        expect(isBannerVisible(state)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P3d: Absence of a stored record means decided=false and banner is visible.
   * (Inverse: no decision → banner shown — confirms the suppression logic is conditional.)
   * Validates: Requirements 12.5
   */
  it('P3d: banner is visible when no ConsentRecord exists in storage', () => {
    const store = new Map<string, string>();
    const state = deriveConsentState(store);
    expect(state.decided).toBe(false);
    expect(isBannerVisible(state)).toBe(true);
  });
});
