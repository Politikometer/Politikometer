import type { RateLimiter } from './rate-limiter';
import { USER_AGENT } from './user-agent';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
  ) {
    super(`HTTP ${status} bei ${url}`);
    this.name = 'HttpError';
  }
}

/** Die Quelle meldet zu viele Anfragen (HTTP 429). Kein automatischer Neuversuch. */
export class RateLimitedError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super('Zu viele Anfragen an die Datenquelle.');
    this.name = 'RateLimitedError';
  }
}

export type FetchJsonOptions = {
  limiter?: RateLimiter;
  timeoutMs?: number;
  /** Neuversuche bei Netzwerkfehlern, Zeitüberschreitung und Serverfehlern (5xx). */
  retries?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  headers?: Record<string, string>;
};

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Netzwerkfehler und 5xx sind vorübergehend; 4xx und 429 nicht. */
function isRetryable(err: unknown): boolean {
  if (err instanceof RateLimitedError) return false;
  if (err instanceof HttpError) return err.status >= 500;
  return true;
}

export async function fetchJson(url: string, options: FetchJsonOptions = {}): Promise<unknown> {
  const {
    limiter,
    timeoutMs = 15_000,
    retries = 2,
    fetchImpl = fetch,
    sleep = defaultSleep,
    headers = {},
  } = options;

  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchOnce(url, { limiter, timeoutMs, fetchImpl, headers });
    } catch (err) {
      if (attempt >= retries || !isRetryable(err)) throw err;
      await sleep(1000 * 2 ** attempt);
    }
  }
}

async function fetchOnce(
  url: string,
  opts: Required<Pick<FetchJsonOptions, 'timeoutMs' | 'fetchImpl' | 'headers'>> &
    Pick<FetchJsonOptions, 'limiter'>,
): Promise<unknown> {
  if (opts.limiter) await opts.limiter.acquire();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    // Als freie Funktion aufrufen: Im Browser (Vorschau am PC) lehnt fetch den Aufruf als Methode eines
    // anderen Objekts ab ("Illegal invocation"). Auf Android/iOS macht es keinen Unterschied.
    const { fetchImpl } = opts;
    const res = await fetchImpl(url, {
      // User-Agent wird im Browser ignoriert, auf Android/iOS gesetzt.
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT, ...opts.headers },
      signal: controller.signal,
    });
    if (res.status === 429) {
      throw new RateLimitedError(Number(res.headers.get('Retry-After')) || 60);
    }
    if (!res.ok) throw new HttpError(res.status, url);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
