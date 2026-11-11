/**
 * Was vom Abruf-Cache auf dem Gerät gespeichert wird.
 *
 * Der ganze Cache liegt in EINEM AsyncStorage-Eintrag. Auf Android kann ein Eintrag ab etwa 2 MB
 * nicht mehr gelesen werden (SQLite-CursorWindow) – dann wären alle Offline-Daten weg.
 * Deshalb:
 * - nur erfolgreiche Abfragen,
 * - Grunddaten (Abgeordnetenliste, Woche, Kabinett, Kanzler/in, Abstimmungen der Wahlperiode) immer,
 * - Wahlkreisseiten (Abgeordnete, Kandidierende): die zuletzt geladenen `MAX_CONSTITUENCY_QUERIES` je Art,
 * - Abstimmungsverhalten einer Person (groß, ca. 190 KB): nur die letzten `MAX_VOTES_QUERIES`,
 * - übrige Detailseiten (Profile, Abstimmungsergebnis, Gesetz, Ministerseiten): die letzten
 *   `MAX_DETAIL_QUERIES`; Detailseiten nur, wenn höchstens `DETAIL_MAX_AGE` alt,
 * - harte Obergrenze `MAX_PERSIST_BYTES`: darüber werden die ältesten Seiten weggelassen
 *   (Grunddaten nie).
 * Die PLZ-Tabelle ist Teil der App (assets) und braucht keinen Cache.
 */
import type { PersistedClient } from '@tanstack/react-query-persist-client';

const HOUR = 60 * 60 * 1000;
export const MAX_DETAIL_QUERIES = 20;
export const MAX_VOTES_QUERIES = 2;
export const MAX_CONSTITUENCY_QUERIES = 5;
export const DETAIL_MAX_AGE = 2 * 24 * HOUR;
/** Deutlich unter der Android-Grenze von etwa 2 MB. */
export const MAX_PERSIST_BYTES = 1_200_000;

type DehydratedQuery = PersistedClient['clientState']['queries'][number];

/** Grunddaten, die offline immer verfügbar bleiben sollen. */
export function isCoreQuery(queryKey: readonly unknown[]): boolean {
  const [area, kind] = queryKey;
  if (area === 'woche') return true;
  if (area === 'bundestag') return kind === 'members';
  if (area === 'regierung') return kind === 'kabinett' || kind === 'bundeskanzler';
  if (area === 'gesetz') return kind === 'abstimmungen-wahlperiode';
  return false;
}

type Bucket = { limit: number; maxAge: number | null };

/** Zu welcher Gruppe (mit eigener Obergrenze) eine Nicht-Grunddaten-Abfrage gehört. */
function bucketOf(queryKey: readonly unknown[]): { name: string } & Bucket {
  const [area, kind] = queryKey;
  if (area === 'bundestag' && (kind === 'representatives' || kind === 'candidates')) {
    // Wahlkreis der eigenen PLZ: bleibt die ganzen 7 Tage offline.
    return { name: `wahlkreis:${kind}`, limit: MAX_CONSTITUENCY_QUERIES, maxAge: null };
  }
  if (area === 'bundestag' && kind === 'votes') {
    return { name: 'votes', limit: MAX_VOTES_QUERIES, maxAge: DETAIL_MAX_AGE };
  }
  return { name: 'detail', limit: MAX_DETAIL_QUERIES, maxAge: DETAIL_MAX_AGE };
}

/** Bytes in UTF-8 (Umlaute zählen doppelt) – so misst auch der Speicher. */
export function utf8Length(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff) {
      bytes += 4; // Ersatzpaar → ein Zeichen mit 4 Bytes
      i++;
    } else bytes += 3;
  }
  return bytes;
}

/** Wendet die Regeln oben an (ohne Größenprüfung). */
export function prunePersistedClient(client: PersistedClient, now: number): PersistedClient {
  const ok = client.clientState.queries.filter((q) => q.state.status === 'success' && q.state.data !== undefined);
  const core = ok.filter((q) => isCoreQuery(q.queryKey));
  const counts = new Map<string, number>();
  const details = ok
    .filter((q) => !isCoreQuery(q.queryKey))
    .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)
    .filter((q) => {
      const bucket = bucketOf(q.queryKey);
      if (bucket.maxAge !== null && now - q.state.dataUpdatedAt > bucket.maxAge) return false;
      const n = counts.get(bucket.name) ?? 0;
      if (n >= bucket.limit) return false;
      counts.set(bucket.name, n + 1);
      return true;
    });
  return withQueries(client, [...core, ...details]);
}

/**
 * Text für den Speicher: Regeln anwenden, dann so lange die ältesten Detailseiten weglassen,
 * bis der Text unter `maxBytes` liegt. Grunddaten werden nie weggelassen.
 */
export function serializePersistedClient(
  client: PersistedClient,
  now: number = Date.now(),
  maxBytes: number = MAX_PERSIST_BYTES,
): string {
  const pruned = prunePersistedClient(client, now);
  const core = pruned.clientState.queries.filter((q) => isCoreQuery(q.queryKey));
  // Neueste zuerst (aus prunePersistedClient).
  let details = pruned.clientState.queries.filter((q) => !isCoreQuery(q.queryKey));
  let text = JSON.stringify(pruned);
  while (details.length > 0 && utf8Length(text) > maxBytes) {
    // Grob abschätzen, wie viele wegmüssen, mindestens eine.
    const drop = Math.max(1, Math.ceil(details.length / 4));
    details = details.slice(0, details.length - drop);
    text = JSON.stringify(withQueries(pruned, [...core, ...details]));
  }
  return text;
}

function withQueries(client: PersistedClient, queries: DehydratedQuery[]): PersistedClient {
  return { ...client, clientState: { ...client.clientState, queries } };
}
