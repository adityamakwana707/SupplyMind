type StatsRecord = Record<string, { calls: number; limited: number }>;

const globalStats: StatsRecord = {};

const bump = (label: string, field: 'calls' | 'limited') => {
  if (!globalStats[label]) {
    globalStats[label] = { calls: 0, limited: 0 };
  }
  globalStats[label][field] += 1;
};

export class RateLimiter {
  private readonly maxCalls: number;
  private readonly windowMs: number;
  private readonly label: string;
  private readonly timestamps: number[] = [];

  constructor(maxCalls: number, windowMs: number, label: string) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
    this.label = label;
  }

  check(): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0] < windowStart) {
      this.timestamps.shift();
    }

    if (this.timestamps.length >= this.maxCalls) {
      bump(this.label, 'limited');
      console.warn(
        `[RateLimit] ${this.label} — limit ${this.maxCalls}/${this.windowMs}ms exceeded. Skipping call.`
      );
      return false;
    }

    this.timestamps.push(now);
    bump(this.label, 'calls');
    return true;
  }

  async waitAndCall<T>(fn: () => Promise<T>): Promise<T | null> {
    if (!this.check()) return null;
    return await fn();
  }
}

export const mapsDirectionsLimit = new RateLimiter(10, 60_000, 'Maps Directions');
export const mapsDistanceLimit = new RateLimiter(20, 60_000, 'Maps Distance Matrix');
export const openWeatherLimit = new RateLimiter(15, 60_000, 'OpenWeatherMap');
export const vertexAiLimit = new RateLimiter(5, 60_000, 'Vertex AI');

export function getApiCallStats(): StatsRecord {
  return { ...globalStats };
}

