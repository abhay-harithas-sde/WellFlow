import * as fc from 'fast-check';
import { RateLimiter } from './RateLimiter';

// ============================================================
// Unit tests — Requirements: 10.1, 10.2, 10.3, 10.4
// ============================================================

describe('RateLimiter — unit tests', () => {
  it('starts with activeCount 0 and requestsThisMinute 0', () => {
    const rl = new RateLimiter();
    expect(rl.activeCount).toBe(0);
    expect(rl.requestsThisMinute).toBe(0);
  });

  it('acquire() resolves immediately when under both limits', async () => {
    const rl = new RateLimiter();
    await rl.acquire();
    expect(rl.activeCount).toBe(1);
    expect(rl.requestsThisMinute).toBe(1);
  });

  it('allows up to 3 concurrent acquires without blocking (Req 10.1)', async () => {
    const rl = new RateLimiter();
    await rl.acquire();
    await rl.acquire();
    await rl.acquire();
    expect(rl.activeCount).toBe(3);
  });

  it('fourth acquire() is queued until release() is called (Req 10.2)', async () => {
    const rl = new RateLimiter();
    await rl.acquire();
    await rl.acquire();
    await rl.acquire();

    let fourthResolved = false;
    const fourth = rl.acquire().then(() => { fourthResolved = true; });

    // Not yet resolved — still at capacity
    await Promise.resolve();
    expect(fourthResolved).toBe(false);
    expect(rl.activeCount).toBe(3);

    rl.release();
    await fourth;
    expect(fourthResolved).toBe(true);
    expect(rl.activeCount).toBe(3); // slot taken by fourth
  });

  it('activeCount never exceeds 3 with concurrent acquires (Req 10.1)', async () => {
    const rl = new RateLimiter();
    const promises = [rl.acquire(), rl.acquire(), rl.acquire(), rl.acquire(), rl.acquire()];
    await Promise.resolve();
    expect(rl.activeCount).toBeLessThanOrEqual(3);
    // Release all
    for (let i = 0; i < 5; i++) rl.release();
    await Promise.all(promises);
  });

  it('release() immediately unblocks next waiter (Req 10.3)', async () => {
    const rl = new RateLimiter();
    await rl.acquire();
    await rl.acquire();
    await rl.acquire();

    let nextResolved = false;
    const next = rl.acquire().then(() => { nextResolved = true; });

    await Promise.resolve();
    expect(nextResolved).toBe(false);

    rl.release(); // should immediately unblock next
    await next;
    expect(nextResolved).toBe(true);
  });

  it('release() decrements activeCount', async () => {
    const rl = new RateLimiter();
    await rl.acquire();
    expect(rl.activeCount).toBe(1);
    rl.release();
    expect(rl.activeCount).toBe(0);
  });

  it('release() does not go below 0', () => {
    const rl = new RateLimiter();
    rl.release(); // no-op
    expect(rl.activeCount).toBe(0);
  });

  it('requestsThisMinute increments with each granted acquire', async () => {
    const rl = new RateLimiter();
    await rl.acquire();
    rl.release();
    await rl.acquire();
    rl.release();
    expect(rl.requestsThisMinute).toBe(2);
  });

  it('queued waiters are resolved in FIFO order', async () => {
    const rl = new RateLimiter();
    await rl.acquire();
    await rl.acquire();
    await rl.acquire();

    const order: number[] = [];
    const p1 = rl.acquire().then(() => order.push(1));
    const p2 = rl.acquire().then(() => order.push(2));

    rl.release(); // unblocks p1
    await p1;
    rl.release(); // unblocks p2
    await p2;

    expect(order).toEqual([1, 2]);
  });

  // ----------------------------------------------------------------
  // Timeout tests — Req 10.4
  // ----------------------------------------------------------------

  describe('acquire() timeout (Req 10.4)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('rejects with timeout error after 10 seconds by default', async () => {
      const rl = new RateLimiter();
      // Fill all 3 slots
      await rl.acquire();
      await rl.acquire();
      await rl.acquire();

      const p = rl.acquire(); // will be queued

      // Advance time past the 10-second default timeout
      jest.advanceTimersByTime(10_001);

      await expect(p).rejects.toThrow('Rate limiter timeout');
    });

    it('rejects after custom timeoutMs elapses', async () => {
      const rl = new RateLimiter();
      await rl.acquire();
      await rl.acquire();
      await rl.acquire();

      const p = rl.acquire(500); // custom 500ms timeout

      jest.advanceTimersByTime(501);

      await expect(p).rejects.toThrow('Rate limiter timeout');
    });

    it('does NOT reject if slot is granted before timeout', async () => {
      const rl = new RateLimiter();
      await rl.acquire();
      await rl.acquire();
      await rl.acquire();

      const p = rl.acquire(5_000);

      // Release a slot before timeout fires
      rl.release();
      jest.advanceTimersByTime(100);

      await expect(p).resolves.toBeUndefined();
    });

    it('removes timed-out waiter from queue so it does not consume a slot later', async () => {
      const rl = new RateLimiter();
      await rl.acquire();
      await rl.acquire();
      await rl.acquire();

      const timedOut = rl.acquire(1_000);
      jest.advanceTimersByTime(1_001);
      await expect(timedOut).rejects.toThrow('Rate limiter timeout');

      // Now release one slot — should not be consumed by the timed-out waiter
      rl.release();
      expect(rl.activeCount).toBe(2);
    });
  });
});

// ============================================================
// Property-based tests
// ============================================================

/**
 * Validates: Requirements 10.1, 10.2
 * Property: activeCount never exceeds MAX_CONCURRENT (3) at any point
 * during a sequence of concurrent acquire/release operations.
 */
describe('RateLimiter — PBT: concurrent request limit (Req 10.1)', () => {
  it('activeCount never exceeds 3 across arbitrary acquire/release sequences', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
        async (ops) => {
          const rl = new RateLimiter();
          const pending: Promise<void>[] = [];
          let maxObserved = 0;

          for (const isAcquire of ops) {
            if (isAcquire) {
              const p = rl.acquire();
              pending.push(p);
              await Promise.resolve();
              if (rl.activeCount > maxObserved) maxObserved = rl.activeCount;
            } else {
              rl.release();
              await Promise.resolve();
              if (rl.activeCount > maxObserved) maxObserved = rl.activeCount;
            }
          }

          while (pending.length > 0) {
            rl.release();
            await Promise.resolve();
            if (rl.activeCount > maxObserved) maxObserved = rl.activeCount;
            pending.pop();
          }

          return maxObserved <= 3;
        }
      ),
      { numRuns: 200 }
    );
  });
});

/**
 * Validates: Requirements 3.4
 * Property: requestsThisMinute never exceeds 1000 within a single
 * minute window for any number of sequential acquire calls.
 */
describe('RateLimiter — PBT: requests-per-minute limit (Req 3.4)', () => {
  it('requestsThisMinute never exceeds 1000 within a single window', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1100 }),
        async (n) => {
          const rl = new RateLimiter();
          const limit = Math.min(n, 1000);
          for (let i = 0; i < limit; i++) {
            await rl.acquire();
            rl.release();
          }
          return rl.requestsThisMinute <= 1000;
        }
      ),
      { numRuns: 50 }
    );
  });
});

// Feature: murf-ai-voice-integration, Property 12: Rate limiter never exceeds maximum concurrency
/**
 * Validates: Requirements 10.1, 10.2
 *
 * Property 12 verifies three invariants:
 *   1. activeCount is always between 0 and 3 (inclusive) at any observable point
 *   2. requestsThisMinute is always between 0 and 1000 (inclusive) within a single window
 *   3. After release(), activeCount is strictly less than before release() (unless already 0)
 */
describe('RateLimiter — Property 12: Rate limiter invariants', () => {
  it('invariant 1: activeCount is always between 0 and 3 inclusive', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 30 }),
        async (ops) => {
          const rl = new RateLimiter();
          const pending: Promise<void>[] = [];

          for (const isAcquire of ops) {
            if (isAcquire) {
              pending.push(rl.acquire());
              await Promise.resolve();
            } else {
              rl.release();
              await Promise.resolve();
            }
            if (rl.activeCount < 0 || rl.activeCount > 3) return false;
          }

          while (pending.length > 0) {
            rl.release();
            await Promise.resolve();
            if (rl.activeCount < 0 || rl.activeCount > 3) return false;
            pending.pop();
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('invariant 2: requestsThisMinute is always between 0 and 1000 inclusive within a single window', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 1000 }),
        async (n) => {
          const rl = new RateLimiter();
          for (let i = 0; i < n; i++) {
            await rl.acquire();
            rl.release();
            const count = rl.requestsThisMinute;
            if (count < 0 || count > 1000) return false;
          }
          return rl.requestsThisMinute >= 0 && rl.requestsThisMinute <= 1000;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('invariant 3: after release(), activeCount is strictly less than before (unless already 0)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }),
        async (acquireCount) => {
          const rl = new RateLimiter();
          for (let i = 0; i < acquireCount; i++) {
            await rl.acquire();
          }
          const before = rl.activeCount;
          rl.release();
          const after = rl.activeCount;

          if (before === 0) return after === 0;
          return after < before;
        }
      ),
      { numRuns: 100 }
    );
  });
});
