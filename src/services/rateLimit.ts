import { getCurrentRateLimit, setRateLimitListener, checkLiveRateLimit, RateLimitInfo } from './githubApi';

type RateLimitSubscriber = (info: RateLimitInfo) => void;

class RateLimitManager {
  private current: RateLimitInfo = getCurrentRateLimit();
  private subscribers: Set<RateLimitSubscriber> = new Set();

  constructor() {
    // Automatically register listener for GitHub API updates
    setRateLimitListener((info) => {
      this.current = info;
      this.notify();
    });

    // Check live rate limit immediately on initialization
    checkLiveRateLimit().catch(() => {});

    // Periodic 1-second ticker to automatically reset counters when resetTime passes
    setInterval(() => {
      const updated = getCurrentRateLimit();
      if (
        updated.remaining !== this.current.remaining ||
        updated.searchRemaining !== this.current.searchRemaining
      ) {
        this.current = { ...updated };
        this.notify();
      }
    }, 1000);
  }

  public get(): RateLimitInfo {
    return getCurrentRateLimit();
  }

  public update(info: RateLimitInfo): void {
    this.current = info;
    this.notify();
  }

  public syncFromApi(): void {
    checkLiveRateLimit()
      .then((info) => {
        this.current = info;
        this.notify();
      })
      .catch(() => {});
  }

  public subscribe(cb: RateLimitSubscriber): () => void {
    this.subscribers.add(cb);
    cb(this.current);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private notify(): void {
    for (const cb of this.subscribers) {
      cb(this.current);
    }
  }
}

export const rateLimitManager = new RateLimitManager();
export type { RateLimitInfo };
