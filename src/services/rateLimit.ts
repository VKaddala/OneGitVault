/**
 * GitHub API Rate Limit Tracker (Single Responsibility Principle)
 * Tracks rate limit limits, remaining quotas, reset timestamps,
 * and notifies subscribers on changes.
 */

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date | null;
}

type RateLimitListener = (info: RateLimitInfo) => void;

class RateLimitManager {
  private current: RateLimitInfo = {
    limit: 60,
    remaining: 60,
    resetTime: null,
  };

  private listeners: Set<RateLimitListener> = new Set();

  public get(): RateLimitInfo {
    return { ...this.current };
  }

  public subscribe(listener: RateLimitListener): () => void {
    this.listeners.add(listener);
    listener(this.get());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public updateFromHeaders(headers: Headers): void {
    const limit = headers.get('x-ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');

    if (limit && remaining) {
      this.current = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        resetTime: reset ? new Date(parseInt(reset, 10) * 1000) : null,
      };
      this.notify();
    }
  }

  private notify(): void {
    const info = this.get();
    this.listeners.forEach((listener) => {
      try {
        listener(info);
      } catch (e) {
        console.error('[RateLimitManager] Listener error', e);
      }
    });
  }
}

export const rateLimitManager = new RateLimitManager();
