import { fetchJson, HttpError, RateLimitedError } from '@/data/http/fetch-json';

function response(status: number, body: unknown = {}, headers: Record<string, string> = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (k: string) => headers[k] ?? null },
    json: async () => body,
  } as unknown as Response;
}

const noSleep = jest.fn(async () => undefined);

beforeEach(() => noSleep.mockClear());

describe('fetchJson', () => {
  it('liefert JSON bei Erfolg', async () => {
    const fetchImpl = jest.fn(async () => response(200, { a: 1 }));
    await expect(fetchJson('https://x', { fetchImpl, sleep: noSleep })).resolves.toEqual({ a: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('versucht es bei Serverfehlern erneut', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(response(502))
      .mockResolvedValueOnce(response(200, { ok: true }));
    await expect(fetchJson('https://x', { fetchImpl, sleep: noSleep })).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(noSleep).toHaveBeenCalledWith(1000);
  });

  it('versucht es bei Netzwerkfehlern erneut und gibt nach den Versuchen auf', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    await expect(fetchJson('https://x', { fetchImpl, sleep: noSleep, retries: 2 })).rejects.toThrow(
      'Network request failed',
    );
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('gibt 404 sofort und ohne Neuversuch zurück', async () => {
    const fetchImpl = jest.fn(async () => response(404));
    await expect(fetchJson('https://x', { fetchImpl, sleep: noSleep })).rejects.toBeInstanceOf(HttpError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('meldet 429 als RateLimitedError mit Wartezeit und ohne Neuversuch', async () => {
    const fetchImpl = jest.fn(async () => response(429, {}, { 'Retry-After': '30' }));
    const err = (await fetchJson('https://x', { fetchImpl, sleep: noSleep }).catch((e) => e)) as RateLimitedError;
    expect(err).toBeInstanceOf(RateLimitedError);
    expect(err.retryAfterSeconds).toBe(30);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
