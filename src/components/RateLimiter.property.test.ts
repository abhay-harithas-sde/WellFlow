// Feature: murf-ai-voice-integration, Property 12: Rate limiter never exceeds maximum concurrency
// Validates: Requirements 10.1, 10.2

import * as fc from 'fast-check';
import { RateLimiter } from './RateLimiter';

/**
 * Property 12: Rate limiter never exceeds maximum concurrency
 *
 * For any sequence of acquire() and release() calls, the activeCount must never
 * exceed 3 at any point in time, and every acquired slot must eventually be
 * released (no slot leak).
 *
 * Validates: Requirements 10.1, 10.2
 */
describe('Property 12: Rate limiter never exceeds maximum concurrency', () => {
  it('activeCount never exceeds 3 for any sequence of acquire/release calls', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a sequence of 1–20 request counts to simulate concurrent acquires
        fc.integer({ min: 1, max: 20 }),
        async (requestCount) => {
          const rl = new RateLimiter();
          const pending: Promise<void>[] = [];
          let maxObserved = 0;

          // Acquire all slots concurrently
          for (let i = 0; i < requestCount; i++) {
            const p = rl.acquire();
            pending.push(p);
            // Flush microtasks so immediately-resolved acquires are counted
            await Promise.resolve();
            if (rl.activeCount > maxObserved) {
              maxObserved = rl.activeCount;
            }
          }

          // Release all slots one by one, checking invariant after each
          for (let i = 0; i < requestCount; i++) {
            rl.release();
            await Promise.resolve();
            if (rl.activeCount > maxObserved) {
              maxObserved = rl.activeCount;
            }
          }

          // Drain any remaining pending promises
          await Promise.all(pending.map(p => p.catch(() => { /* ignore timeouts */ })));

          // The invariant: activeCount must never have exceeded 3
          return maxObserved <= 3;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('no slot leak: activeCount returns to 0 after all slots are released', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (requestCount) => {
          const rl = new RateLimiter();
          const pending: Promise<void>[] = [];

          // Acquire up to MAX_CONCURRENT (3) slots — these resolve immediately
          const immediateCount = Math.min(requestCount, 3);
          for (let i = 0; i < immediateCount; i++) {
            pending.push(rl.acquire());
            await Promise.resolve();
          }

          // Release all immediately-acquired slots
          for (let i = 0; i < immediateCount; i++) {
            rl.release();
            await Promise.resolve();
          }

          // After releasing all, activeCount must be 0 (no slot leak)
          return rl.activeCount === 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});
