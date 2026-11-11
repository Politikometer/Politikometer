import { RateLimiter, type Clock } from '@/data/http/rate-limiter';

function fakeClock() {
  let now = 0;
  const sleeps: number[] = [];
  const clock: Clock = {
    now: () => now,
    sleep: async (ms) => {
      sleeps.push(ms);
      now += ms;
    },
  };
  return { clock, sleeps, advance: (ms: number) => (now += ms) };
}

describe('RateLimiter', () => {
  it('lässt Anfragen bis zum Limit sofort durch', async () => {
    const { clock, sleeps } = fakeClock();
    const limiter = new RateLimiter(3, 60_000, clock);
    await limiter.acquire();
    await limiter.acquire();
    await limiter.acquire();
    expect(sleeps).toEqual([]);
  });

  it('wartet, bis die älteste Anfrage aus dem Zeitfenster fällt', async () => {
    const { clock, sleeps, advance } = fakeClock();
    const limiter = new RateLimiter(2, 60_000, clock);
    await limiter.acquire(); // t=0
    advance(10_000);
    await limiter.acquire(); // t=10s
    await limiter.acquire(); // muss bis t=60s warten
    expect(sleeps).toEqual([50_000]);
  });

  it('reiht parallele Anfragen ein', async () => {
    const { clock, sleeps } = fakeClock();
    const limiter = new RateLimiter(1, 1_000, clock);
    await Promise.all([limiter.acquire(), limiter.acquire(), limiter.acquire()]);
    expect(sleeps).toEqual([1_000, 1_000]);
  });
});
