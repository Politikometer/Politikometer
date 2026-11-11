/**
 * Ergänzende Tests zur Behebung der tester-Befunde vom 31.10.2026
 * (Inkrafttreten, Namensaufteilung, Datumsformat, Zahlentext Woche, Cache-Größe).
 */
import type { PersistedClient } from '@tanstack/react-query-persist-client';

import { nameSplits, splitName } from '@/data/repositories/government-repository';
import { entryIntoForceLines } from '@/features/gesetze/entry-into-force';
import { legislationCountText } from '@/features/woche/sections';
import {
  DETAIL_MAX_AGE,
  MAX_DETAIL_QUERIES,
  MAX_PERSIST_BYTES,
  MAX_VOTES_QUERIES,
  prunePersistedClient,
  serializePersistedClient,
  utf8Length,
} from '@/state/persist-policy';
import { formatDate, formatDateTime } from '@/ui/format';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('Inkrafttreten mit Erläuterung', () => {
  it('eine Zeile je Datum, nach Datum sortiert', () => {
    expect(
      entryIntoForceLines([
        { date: '2026-12-09', note: 'im Übrigen' },
        { date: '2028-09-27', note: 'Artikel 6' },
        { date: '2026-09-27', note: 'Artikel 5' },
        { date: '2026-09-27', note: 'Artikel 7' },
        { date: '2027-01-01', note: null },
      ]),
    ).toEqual([
      '27.09.2026 (Artikel 5, Artikel 7)',
      '09.12.2026 (im Übrigen)',
      '01.01.2027',
      '27.09.2028 (Artikel 6)',
    ]);
  });
});

describe('Namensaufteilung für die Profilsuche', () => {
  it('liefert alle Aufteilungen, häufigste zuerst', () => {
    expect(nameSplits('Reem Alabali Radovan')).toEqual([
      { first: 'Reem Alabali', last: 'Radovan' },
      { first: 'Reem', last: 'Alabali Radovan' },
    ]);
    expect(nameSplits('Friedrich  Merz')).toEqual([{ first: 'Friedrich', last: 'Merz' }]);
    expect(nameSplits('Merz')).toEqual([]);
    expect(splitName('Reem Alabali Radovan')).toEqual({ first: 'Reem Alabali', last: 'Radovan' });
  });
});

describe('Datumsformat', () => {
  it('formatiert reine Kalenderdaten ohne Zeitzonenumrechnung', () => {
    expect(formatDate('2026-12-09')).toBe('09.12.2026');
    expect(formatDate('2026-01-01')).toBe('01.01.2026');
    expect(formatDate('2026-13-01')).toBeNull();
    expect(formatDate('kein Datum')).toBeNull();
  });

  it('formatiert Zeitstempel weiter wie bisher', () => {
    expect(formatDate('2026-10-31T10:00:00.000Z')).toMatch(/^\d{2}\.\d{2}\.2026$/);
    expect(formatDateTime('2026-10-31T10:00:00.000Z')).toMatch(/^\d{2}\.\d{2}\.2026, \d{2}:\d{2} Uhr$/);
  });
});

describe('Zahlentext auf der Wochenseite', () => {
  const groups = (n: number) => [
    { status: 'Überwiesen', items: Array.from({ length: n }, () => ({}) as never) },
  ];

  it('nennt die Gesamtzahl nur, wenn Vorgänge fehlen', () => {
    expect(legislationCountText({ legislationGroups: groups(50), legislationTotal: 80, truncated: true })).toContain(
      '50 Vorgänge (von 80; sehr viele Einträge – vollständig im DIP).',
    );
  });

  it('eigener Hinweis, wenn nur Schritte fehlen', () => {
    const text = legislationCountText({
      legislationGroups: groups(12),
      legislationTotal: 12,
      truncated: false,
      stepsTruncated: true,
    });
    expect(text).not.toContain('von 12');
    expect(text).toContain('12 Vorgänge.');
    expect(text).toContain('nicht alle Schritte im Zeitraum');
  });

  it('ohne Hinweis, wenn alles geladen ist', () => {
    const text = legislationCountText({ legislationGroups: groups(1), legislationTotal: 1, truncated: false });
    expect(text).toBe('1 Vorgang. Gruppiert nach dem heutigen amtlichen Beratungsstand, Gruppen alphabetisch.');
  });
});

/**
 * Testrechnung Cache-Größe. Größen live gemessen am 05.11.2026 (JSON der gemappten Daten, UTF-8):
 *   Abgeordnetenliste 258 KB · Abstimmungen der Wahlperiode 34 KB (85 Abstimmungen) · Kabinett 9 KB ·
 *   Woche 6 KB · Kanzler 0,3 KB · Wahlkreis 4 KB (+ Kandidierende 4 KB) · Profil 1 KB ·
 *   Abstimmungsverhalten einer Person 190 KB · Abstimmungsergebnis 2 KB · Gesetz 8 KB.
 * Für die Rechnung mit Zuschlag für das Ende der Wahlperiode (mehr Abstimmungen):
 */
const KB = 1000;
const NOW = Date.UTC(2026, 10, 5, 12);
const HOUR = 60 * 60 * 1000;

function query(queryKey: unknown[], bytes: number, ageMs = 0, status: 'success' | 'error' = 'success') {
  return {
    queryKey,
    queryHash: JSON.stringify(queryKey),
    state: {
      data: status === 'success' ? 'x'.repeat(bytes) : undefined,
      dataUpdatedAt: NOW - ageMs,
      status,
      error: null,
      errorUpdateCount: 0,
      errorUpdatedAt: 0,
      fetchFailureReason: null,
      fetchFailureCount: 0,
      fetchMeta: null,
      fetchStatus: 'idle',
      isInvalidated: false,
      dataUpdateCount: 1,
    },
  };
}

function client(queries: ReturnType<typeof query>[]): PersistedClient {
  return {
    timestamp: NOW,
    buster: 'x',
    clientState: { mutations: [], queries: queries as unknown as PersistedClient['clientState']['queries'] },
  };
}

const core = [
  query(['bundestag', 'members'], 300 * KB),
  query(['gesetz', 'abstimmungen-wahlperiode'], 120 * KB),
  query(['regierung', 'kabinett'], 10 * KB),
  query(['regierung', 'bundeskanzler'], 1 * KB),
  query(['woche', 'ueberblick'], 30 * KB),
];

describe('Cache-Größe auf dem Gerät', () => {
  it('Vielnutzung über eine Woche: bleibt unter 1,2 MB, Grunddaten vollständig', () => {
    const heavy = [
      ...core,
      // 40 Wahlkreise angesehen
      ...Array.from({ length: 40 }, (_, i) => query(['bundestag', 'representatives', i + 1], 5 * KB, i * HOUR)),
      ...Array.from({ length: 40 }, (_, i) => query(['bundestag', 'candidates', i + 1], 5 * KB, i * HOUR)),
      // 60 Profile mit Abstimmungsverhalten
      ...Array.from({ length: 60 }, (_, i) => query(['bundestag', 'profile', i + 1], 2 * KB, i * HOUR)),
      ...Array.from({ length: 60 }, (_, i) => query(['bundestag', 'votes', i + 1], 250 * KB, i * HOUR)),
      // 80 Gesetze, 40 Abstimmungsergebnisse, 20 Ministerseiten mit mehreren Seiten Aktivitäten
      ...Array.from({ length: 80 }, (_, i) => query(['gesetz', String(i + 1)], 10 * KB, i * HOUR)),
      ...Array.from({ length: 40 }, (_, i) => query(['bundestag', 'poll', i + 1], 3 * KB, i * HOUR)),
      ...Array.from({ length: 20 }, (_, i) => query(['regierung', 'aktivitaeten', String(i), null], 40 * KB, i * HOUR)),
      // Fehlerzustände werden nie gespeichert
      query(['gesetz', '999'], 0, 0, 'error'),
    ];
    const unpruned = utf8Length(JSON.stringify(client(heavy)));
    expect(unpruned).toBeGreaterThan(15_000 * KB); // ohne Begrenzung: über 15 MB

    const text = serializePersistedClient(client(heavy), NOW);
    const bytes = utf8Length(text);
    expect(bytes).toBeLessThanOrEqual(MAX_PERSIST_BYTES);
    expect(bytes).toBeLessThan(1_500 * KB);

    const kept = (JSON.parse(text) as PersistedClient).clientState.queries.map((q) => q.queryHash);
    for (const q of core) expect(kept).toContain(q.queryHash);
    // eigener Wahlkreis (zuletzt angesehen) bleibt
    expect(kept).toContain(JSON.stringify(['bundestag', 'representatives', 1]));
    expect(kept).not.toContain(JSON.stringify(['gesetz', '999']));
    expect(kept.filter((h) => h.includes('"votes"')).length).toBeLessThanOrEqual(MAX_VOTES_QUERIES);
  });

  it('normale Nutzung: Regeln allein reichen (ohne Notkürzung), unter 1 MB', () => {
    const normal = [
      ...core,
      query(['bundestag', 'representatives', 192], 5 * KB, 3 * 24 * HOUR), // eigener Wahlkreis, 3 Tage alt
      query(['bundestag', 'candidates', 192], 5 * KB, 3 * 24 * HOUR),
      ...Array.from({ length: 10 }, (_, i) => query(['bundestag', 'profile', i + 1], 2 * KB, i * HOUR)),
      ...Array.from({ length: 10 }, (_, i) => query(['bundestag', 'votes', i + 1], 190 * KB, i * HOUR)),
      ...Array.from({ length: 15 }, (_, i) => query(['gesetz', String(i + 1)], 8 * KB, i * HOUR)),
    ];
    const pruned = prunePersistedClient(client(normal), NOW);
    const bytes = utf8Length(JSON.stringify(pruned));
    expect(bytes).toBeLessThan(1_000 * KB);
    expect(serializePersistedClient(client(normal), NOW)).toBe(JSON.stringify(pruned));
    expect(pruned.clientState.queries.map((q) => q.queryHash)).toContain(
      JSON.stringify(['bundestag', 'representatives', 192]),
    );
  });

  it('Detailseiten: höchstens die letzten N, nicht älter als 2 Tage', () => {
    const details = Array.from({ length: MAX_DETAIL_QUERIES + 5 }, (_, i) =>
      query(['gesetz', String(i + 1)], 1 * KB, i * HOUR),
    );
    const old = query(['bundestag', 'profile', 7], 1 * KB, DETAIL_MAX_AGE + HOUR);
    const kept = prunePersistedClient(client([...details, old]), NOW).clientState.queries.map((q) => q.queryHash);
    expect(kept).toHaveLength(MAX_DETAIL_QUERIES);
    expect(kept[0]).toBe(JSON.stringify(['gesetz', '1'])); // neueste zuerst
    expect(kept).not.toContain(old.queryHash);
  });

  it('zählt Umlaute als zwei Bytes', () => {
    expect(utf8Length('Übrigen')).toBe(8);
    expect(utf8Length('€')).toBe(3);
    expect(utf8Length('😀')).toBe(4);
  });
});
