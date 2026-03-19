// ============================================================
// Rate_Limiter — token-bucket enforcing Murf Falcon API limits
// Max 2 concurrent requests, max 1000 requests/minute
// Requirements: 3.4, 3.5
// ============================================================

export interface RateLimiterInterface {
  acquire(): Promise<void>;
  release(): void;
  readonly activeCount: number;
  readonly requestsThisMinute: number;
}

const MAX_CONCURRENT = 2;
const MAX_PER_MINUTE = 1000;
const MINUTE_MS = 60_000;

export class RateLimiter implements RateLimiterInterface {
  private _activeCount = 0;
  private _requestsThisMinute = 0;
  private _minuteWindowStart: number = Date.now();
  private _waiters: Array<() => void> = [];

  get activeCount(): number {
    return this._activeCount;
  }

  get requestsThisMinute(): number {
    this._refreshWindow();
    return this._requestsThisMinute;
  }

  acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      this._enqueue(resolve);
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

  private _enqueue(resolve: () => void): void {
    if (this._canAcquire()) {
      this._grant(resolve);
    } else {
      this._waiters.push(resolve);
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
      this._grant(next);
    }
  }
}
