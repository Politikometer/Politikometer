/**
 * Gleitendes Zeitfenster: höchstens `maxRequests` Anfragen pro `windowMs`.
 * `acquire()` wartet, bis wieder ein Platz frei ist.
 */
export type Clock = {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
};

const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

export class RateLimiter {
  private timestamps: number[] = [];
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
    private readonly clock: Clock = realClock,
  ) {}

  acquire(): Promise<void> {
    // Anfragen nacheinander einreihen, damit keine zwei denselben Platz bekommen.
    const next = this.queue.then(() => this.waitForSlot());
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async waitForSlot(): Promise<void> {
    for (;;) {
      const now = this.clock.now();
      this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
      if (this.timestamps.length < this.maxRequests) {
        this.timestamps.push(now);
        return;
      }
      const oldest = this.timestamps[0];
      await this.clock.sleep(this.windowMs - (now - oldest));
    }
  }
}
