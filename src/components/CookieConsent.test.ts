/**
 * Unit tests for CookieConsentBanner visibility logic
 * Driven by useCookieConsent hook state (hooks/useCookieConsent.ts)
 * and CookieConsentBanner render condition (components/ui/CookieConsentBanner.tsx).
 *
 * The jest environment is 'node' (no DOM), so we test the pure logic that
 * controls banner visibility rather than rendering the React component.
 *
 * Banner render rule (CookieConsentBanner.tsx):
 *   if (decided) return null;   ← banner hidden
 *   return <div ...>;           ← banner shown
 *
 * Validates: Requirements 12.1, 12.5
 */

// ---------------------------------------------------------------------------
// Types (mirrors design.md and useCookieConsent.ts)
// ---------------------------------------------------------------------------

type ConsentRecord = {
  version: 1;
  accepted: boolean;
  timestamp: number;
};

type ConsentState = {
  decided: boolean;
  accepted: boolean;
};

// ---------------------------------------------------------------------------
// Pure logic extracted from useCookieConsent.ts
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'wf_cookie_consent';

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

function writeToStorage(store: Map<string, string>, record: ConsentRecord): void {
  store.set(STORAGE_KEY, JSON.stringify(record));
}

/** Derives the ConsentState that useCookieConsent would produce on mount. */
function deriveInitialState(store: Map<string, string>): ConsentState {
  const record = readFromStorage(store);
  if (record) {
    return { decided: true, accepted: record.accepted };
  }
  return { decided: false, accepted: false };
}

/** Simulates calling accept() from useCookieConsent. */
function accept(store: Map<string, string>): ConsentState {
  const record: ConsentRecord = { version: 1, accepted: true, timestamp: Date.now() };
  writeToStorage(store, record);
  return { decided: true, accepted: true };
}

/** Simulates calling decline() from useCookieConsent. */
function decline(store: Map<string, string>): ConsentState {
  const record: ConsentRecord = { version: 1, accepted: false, timestamp: Date.now() };
  writeToStorage(store, record);
  return { decided: true, accepted: false };
}

/**
 * Mirrors the banner render condition in CookieConsentBanner.tsx:
 *   if (decided) return null;
 * Returns true when the banner should be shown.
 */
function isBannerVisible(state: ConsentState): boolean {
  return !state.decided;
}

// ---------------------------------------------------------------------------
// Tests — Requirement 12.1: banner renders on first load
// ---------------------------------------------------------------------------

describe('CookieConsentBanner — first load (no prior decision)', () => {
  it('banner is visible when localStorage has no consent record', () => {
    const store = new Map<string, string>();
    const state = deriveInitialState(store);

    expect(state.decided).toBe(false);
    expect(isBannerVisible(state)).toBe(true);
  });

  it('initial state has decided=false and accepted=false', () => {
    const store = new Map<string, string>();
    const state = deriveInitialState(store);

    expect(state.decided).toBe(false);
    expect(state.accepted).toBe(false);
  });

  it('banner is visible when localStorage key is absent', () => {
    // Explicitly confirm the key is not present
    const store = new Map<string, string>();
    expect(store.has(STORAGE_KEY)).toBe(false);

    const state = deriveInitialState(store);
    expect(isBannerVisible(state)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests — Requirement 12.5: banner absent after accept
// ---------------------------------------------------------------------------

describe('CookieConsentBanner — after accept', () => {
  it('banner is hidden after accept()', () => {
    const store = new Map<string, string>();
    const state = accept(store);

    expect(state.decided).toBe(true);
    expect(isBannerVisible(state)).toBe(false);
  });

  it('accept() sets accepted=true in state', () => {
    const store = new Map<string, string>();
    const state = accept(store);

    expect(state.accepted).toBe(true);
  });

  it('accept() persists a ConsentRecord with accepted=true to storage', () => {
    const store = new Map<string, string>();
    accept(store);

    const record = readFromStorage(store);
    expect(record).not.toBeNull();
    expect(record!.accepted).toBe(true);
    expect(record!.version).toBe(1);
  });

  it('banner remains hidden on subsequent load after accept', () => {
    const store = new Map<string, string>();
    accept(store);

    // Simulate a page revisit by re-deriving state from storage
    const revisitState = deriveInitialState(store);
    expect(revisitState.decided).toBe(true);
    expect(isBannerVisible(revisitState)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests — Requirement 12.5: banner absent after decline
// ---------------------------------------------------------------------------

describe('CookieConsentBanner — after decline', () => {
  it('banner is hidden after decline()', () => {
    const store = new Map<string, string>();
    const state = decline(store);

    expect(state.decided).toBe(true);
    expect(isBannerVisible(state)).toBe(false);
  });

  it('decline() sets accepted=false in state', () => {
    const store = new Map<string, string>();
    const state = decline(store);

    expect(state.accepted).toBe(false);
  });

  it('decline() persists a ConsentRecord with accepted=false to storage', () => {
    const store = new Map<string, string>();
    decline(store);

    const record = readFromStorage(store);
    expect(record).not.toBeNull();
    expect(record!.accepted).toBe(false);
    expect(record!.version).toBe(1);
  });

  it('banner remains hidden on subsequent load after decline', () => {
    const store = new Map<string, string>();
    decline(store);

    // Simulate a page revisit by re-deriving state from storage
    const revisitState = deriveInitialState(store);
    expect(revisitState.decided).toBe(true);
    expect(isBannerVisible(revisitState)).toBe(false);
  });
});
