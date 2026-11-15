import { getCurrentRateLimit, RateLimitInfo } from './githubApi';

type RateLimitSubscriber = (info: RateLimitInfo) => void;

class RateLimitManager {
  private current: RateLimitInfo = getCurrentRateLimit();
  private subscribers: Set<RateLimitSubscriber> = new Set();

  public get(): RateLimitInfo {
    return this.current;
  }

  public update(info: RateLimitInfo): void {
    this.current = info;
    this.notify();
  }

  public syncFromApi(): void {
    this.update(getCurrentRateLimit());
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
