// ============================================================
// Rate_Limiter — token-bucket enforcing Murf AI API limits
// Max 3 concurrent requests, max 1000 requests/minute
// Requirements: 10.1, 10.2, 10.3, 10.4
// ============================================================

export interface RateLimiterInterface {
  acquire(timeoutMs?: number): Promise<void>;
  release(): void;
  readonly activeCount: number;
  readonly requestsThisMinute: number;
}

const MAX_CONCURRENT = 3;
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_PER_MINUTE = 1000;
const MINUTE_MS = 60_000;

export class RateLimiter implements RateLimiterInterface {
  private _activeCount = 0;
  private _requestsThisMinute = 0;
  private _minuteWindowStart: number = Date.now();
  private _waiters: Array<{ resolve: () => void; reject: (err: Error) => void }> = [];

  get activeCount(): number {
    return this._activeCount;
  }

  get requestsThisMinute(): number {
    this._refreshWindow();
    return this._requestsThisMinute;
  }

  acquire(timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._enqueue(resolve, reject, timeoutMs);
    });
  }

  release(): void {
    if (this._activeCount > 0) {
      this._activeCount--;
    }
    // Try to unblock the next waiter
    this._drainQueue();
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  private _refreshWindow(): void {
    const now = Date.now();
    if (now - this._minuteWindowStart >= MINUTE_MS) {
      this._requestsThisMinute = 0;
      this._minuteWindowStart = now;
    }
  }

  private _canAcquire(): boolean {
    this._refreshWindow();
    return (
      this._activeCount < MAX_CONCURRENT &&
      this._requestsThisMinute < MAX_PER_MINUTE
    );
  }

  private _enqueue(resolve: () => void, reject: (err: Error) => void, timeoutMs: number): void {
    if (this._canAcquire()) {
      this._grant(resolve);
    } else {
      const waiter = { resolve, reject };
      this._waiters.push(waiter);

      // Set up timeout to remove this waiter and reject if slot not granted in time
      const timer = setTimeout(() => {
        const idx = this._waiters.indexOf(waiter);
        if (idx !== -1) {
          this._waiters.splice(idx, 1);
          reject(new Error('Rate limiter timeout'));
        }
      }, timeoutMs);

      // Wrap resolve so we clear the timeout when the slot is granted
      const originalResolve = waiter.resolve;
      waiter.resolve = () => {
        clearTimeout(timer);
        originalResolve();
      };

      // If we're only blocked by the per-minute cap, schedule a retry
      // after the current window expires.
      if (this._activeCount < MAX_CONCURRENT) {
        const remaining = MINUTE_MS - (Date.now() - this._minuteWindowStart);
        setTimeout(() => this._drainQueue(), remaining + 1);
      }
    }
  }

  private _grant(resolve: () => void): void {
    this._activeCount++;
    this._requestsThisMinute++;
    resolve();
  }

  private _drainQueue(): void {
    while (this._waiters.length > 0 && this._canAcquire()) {
      const next = this._waiters.shift()!;
      this._grant(next.resolve);
    }
  }
}
