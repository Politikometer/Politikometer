/**
 * Stufe A des Funktionsplans (11.11.2026): Fehlermeldungen unterscheiden und Absturzschutz.
 *
 * Anlass: Bei einer ähnlichen App stand monatelang „keine Internetverbindung“, obwohl deren Server
 * ausgefallen war. Unsere App soll sagen, woran es liegt.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { z } from 'zod';

import { fetchJson, HttpError, RateLimitedError } from '@/data/http/fetch-json';
import { AppErrorBoundary } from '@/ui/components/AppErrorBoundary';
import { ErrorMessage } from '@/ui/components/StatusViews';
import { classifyError, describeError } from '@/ui/error-text';

// Node-Module ohne @types/node (wie in sicherheit-test.tsx)
declare const __dirname: string;
declare function require(name: string): unknown;
const { readFileSync } = require('fs') as { readFileSync(p: string, encoding: 'utf8'): string };

function zodError(): unknown {
  try {
    z.object({ data: z.array(z.number()) }).parse({ data: 'geändert' });
  } catch (err) {
    return err;
  }
  throw new Error('zod hätte ablehnen müssen');
}

function named(name: string): Error {
  const err = new Error('x');
  err.name = name;
  return err;
}

describe('Fehler einordnen', () => {
  it('Störung der Quelle (HTTP 5xx) ist kein Problem der Internetverbindung', () => {
    for (const status of [500, 502, 503, 504]) {
      expect(classifyError(new HttpError(status, 'https://example.org'))).toBe('source-down');
    }
    const text = describeError(new HttpError(503, 'https://example.org'));
    expect(text).toContain('Störung');
    expect(text).toContain('An deiner Internetverbindung liegt es nicht');
  });

  it('unerwartete Antwort (HTTP 4xx, geändertes Format, kein JSON) verweist auf ein App-Update', () => {
    expect(classifyError(new HttpError(404, 'https://example.org'))).toBe('source-changed');
    expect(classifyError(new HttpError(400, 'https://example.org'))).toBe('source-changed');
    expect(classifyError(zodError())).toBe('source-changed');
    expect(classifyError(new SyntaxError('Unexpected token <'))).toBe('source-changed');
    const text = describeError(zodError());
    expect(text).toContain('Update');
    expect(text).not.toContain('Internetverbindung');
  });

  it('Zeitüberschreitung', () => {
    expect(classifyError(named('AbortError'))).toBe('timeout');
    expect(classifyError(new HttpError(408, 'https://example.org'))).toBe('timeout');
  });

  it('keine Verbindung: Internet prüfen, aber auch die Quelle als Ursache nennen', () => {
    const error = new TypeError('Network request failed');
    expect(classifyError(error)).toBe('network');
    const text = describeError(error);
    expect(text).toContain('Internetverbindung');
    expect(text).toContain('liegt es an der Datenquelle');
  });

  it('zu viele Anfragen und Unbekanntes', () => {
    expect(classifyError(new RateLimitedError(60))).toBe('rate-limited');
    expect(describeError(new RateLimitedError(60))).toContain('zu viele Anfragen');
    for (const value of [new Error('irgendwas'), null, undefined, 'text', 42, {}]) {
      expect(classifyError(value)).toBe('unknown');
      expect(describeError(value)).not.toContain('Internetverbindung');
    }
  });

  it('ordnet echte Fehler aus fetchJson richtig ein', async () => {
    const sleep = async () => {};
    const response = (status: number, json: () => Promise<unknown>) =>
      (async () => ({ status, ok: status >= 200 && status < 300, headers: { get: () => null }, json })) as unknown as typeof fetch;
    const down = response(503, async () => ({}));
    const html = response(200, async () => JSON.parse('<html>Wartung</html>'));
    const offline = (async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;

    const failure = (fetchImpl: typeof fetch) =>
      fetchJson('https://example.org/x', { fetchImpl, sleep, retries: 0 }).then(
        () => {
          throw new Error('hätte fehlschlagen müssen');
        },
        (err: unknown) => err,
      );

    expect(classifyError(await failure(down))).toBe('source-down');
    expect(classifyError(await failure(offline))).toBe('network');
    expect(classifyError(await failure(html))).toBe('source-changed');
  });

  it('die Fehlerkarte zeigt den passenden Text', async () => {
    await render(<ErrorMessage error={new HttpError(502, 'https://example.org')} hasCachedData />);
    expect(screen.getByText(/dort liegt eine Störung vor/)).toBeTruthy();
    expect(screen.getByText(/zuletzt gespeicherten Daten/)).toBeTruthy();
  });
});

describe('Absturzschutz', () => {
  it('zeigt eine verständliche Seite ohne technische Meldung und erlaubt einen neuen Versuch', async () => {
    const retry = jest.fn(async () => {});
    await render(<AppErrorBoundary error={new Error('geheim: TypeError in xyz.tsx')} retry={retry} />);
    expect(screen.getByText('Etwas ist schiefgelaufen')).toBeTruthy();
    expect(screen.queryByText(/geheim/)).toBeNull();
    expect(screen.getByText('Fehler melden')).toBeTruthy();
    await fireEvent.press(screen.getByText('Erneut versuchen'));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('ist im Grundgerüst der App eingebunden', () => {
    // Quelltextprüfung: Das Grundgerüst selbst lässt sich im Test nicht laden (Speicher, Netzwerkstatus).
    const source = readFileSync(__dirname + '/../src/app/_layout.tsx', 'utf8');
    expect(source).toContain("export { AppErrorBoundary as ErrorBoundary } from '@/ui/components/AppErrorBoundary';");
  });
});
