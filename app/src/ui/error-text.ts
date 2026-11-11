import { HttpError, RateLimitedError } from '@/data/http/fetch-json';

/**
 * Warum ein Abruf fehlgeschlagen ist – damit die App nicht bei jedem Fehler „prüfe die Internetverbindung“
 * rät. Fällt die Datenquelle aus, soll das auch so dastehen.
 */
export type ErrorKind =
  /** Die Quelle bittet um eine Pause (HTTP 429). */
  | 'rate-limited'
  /** Die Quelle ist erreichbar, meldet aber eine Störung (HTTP 5xx). */
  | 'source-down'
  /** Die Quelle antwortet anders als erwartet (HTTP 4xx, unlesbare Antwort, geändertes Format). */
  | 'source-changed'
  /** Keine Antwort innerhalb der Wartezeit. */
  | 'timeout'
  /** Keine Verbindung zustande gekommen – kein Internet oder Quelle nicht erreichbar. */
  | 'network'
  | 'unknown';

function errorName(error: unknown): string {
  return typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : '';
}

export function classifyError(error: unknown): ErrorKind {
  if (error instanceof RateLimitedError) return 'rate-limited';
  if (error instanceof HttpError) {
    if (error.status === 408) return 'timeout';
    return error.status >= 500 ? 'source-down' : 'source-changed';
  }
  const name = errorName(error);
  // Abbruch nach Ablauf der Wartezeit (AbortController in fetchJson).
  if (name === 'AbortError' || name === 'TimeoutError') return 'timeout';
  // Antwort passt nicht zum erwarteten Format (zod) oder ist kein gültiges JSON.
  if (name === 'ZodError' || name === 'SyntaxError') return 'source-changed';
  // fetch meldet fehlende Verbindung als TypeError („Network request failed“, „Failed to fetch“).
  if (name === 'TypeError') return 'network';
  return 'unknown';
}

const TEXT: Record<ErrorKind, string> = {
  'rate-limited': 'Die Datenquelle hat gerade zu viele Anfragen erhalten. Bitte versuche es in einer Minute erneut.',
  'source-down':
    'Die Datenquelle antwortet gerade nicht richtig – dort liegt eine Störung vor. An deiner Internetverbindung liegt es nicht. Bitte versuche es später erneut.',
  'source-changed':
    'Die Datenquelle hat anders geantwortet als erwartet. Möglicherweise wurde sie geändert. Bitte prüfe, ob es ein Update der App gibt, oder versuche es später erneut.',
  timeout:
    'Die Antwort der Datenquelle hat zu lange gedauert. Das kann an der Quelle oder an einer langsamen Verbindung liegen. Bitte versuche es erneut.',
  network:
    'Die Datenquelle ist nicht erreichbar. Bitte prüfe die Internetverbindung. Funktionieren andere Apps und Seiten, liegt es an der Datenquelle – versuche es dann später erneut.',
  unknown: 'Die Daten konnten nicht geladen werden. Bitte versuche es erneut.',
};

export function describeError(error: unknown): string {
  return TEXT[classifyError(error)];
}
