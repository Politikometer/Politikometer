import { matchPolls } from '@/domain/legislation';
import { HttpError } from '@/data/http/fetch-json';
import { fetchPages, LegislationRepository } from '@/data/repositories/legislation-repository';
import { AbgeordnetenwatchClient } from '@/data/sources/abgeordnetenwatch/client';
import { DipClient } from '@/data/sources/dip/client';
import { DIP_API_KEY } from '@/data/sources/dip/config';

import awParliament from './fixtures/aw-parliament-bundestag.json';
import awPolls from './fixtures/aw-polls-161-subset.json';
import protocols from './fixtures/dip-plenarprotokoll-ab-2026-09-20.json';
import brennstoff from './fixtures/dip-vorgang-338357.json';
import weekVorgaenge from './fixtures/dip-vorgang-gesetzgebung-2026-10-12.json';
import brennstoffSteps from './fixtures/dip-vorgangsposition-338357.json';
import weekSteps from './fixtures/dip-vorgangsposition-gesetzgebung-2026-10-12.json';

// Samstag, 31.10.2026, Ortszeit: letzte Bundestagssitzung war am 16.10.
const NOW = new Date(2026, 9, 31, 12, 0, 0);
const DIP = 'https://search.dip.bundestag.de/api/v1/';

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

function fakeFetch() {
  return jest.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = decodeURIComponent(String(input));
    if (url.startsWith(`${DIP}plenarprotokoll?`)) return jsonResponse(protocols);
    if (url.startsWith(`${DIP}vorgang/338357`)) return jsonResponse(brennstoff);
    if (url.startsWith(`${DIP}vorgang/999`)) return jsonResponse({ code: 404 }, 404);
    if (url.startsWith(`${DIP}vorgang?`)) return jsonResponse(weekVorgaenge);
    if (url.startsWith(`${DIP}vorgangsposition?f.vorgang=338357`)) return jsonResponse(brennstoffSteps);
    if (url.startsWith(`${DIP}vorgangsposition?f.vorgangstyp=`)) return jsonResponse(weekSteps);
    if (url.includes('abgeordnetenwatch.de/api/v2/parliaments/5')) return jsonResponse(awParliament);
    if (url.includes('abgeordnetenwatch.de/api/v2/polls?')) return jsonResponse(awPolls);
    throw new Error(`Unerwartete URL: ${url}`);
  });
}

function makeRepo(fetchImpl: jest.Mock) {
  const http = { fetchImpl: fetchImpl as unknown as typeof fetch, retries: 0 };
  return new LegislationRepository(new DipClient(http), new AbgeordnetenwatchClient(http), () => NOW);
}

const urlsOf = (f: jest.Mock) => f.mock.calls.map(([u]) => decodeURIComponent(String(u)));

describe('LegislationRepository.getLegislation', () => {
  it('lädt Vorgang und Schritte mit zwei Anfragen und DIP-Schlüssel', async () => {
    const fetchImpl = fakeFetch();
    const l = await makeRepo(fetchImpl).getLegislation('338357');
    expect(urlsOf(fetchImpl).sort()).toEqual([
      `${DIP}vorgang/338357`,
      `${DIP}vorgangsposition?f.vorgang=338357`,
    ]);
    const headers = fetchImpl.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`ApiKey ${DIP_API_KEY}`);
    expect(l.steps).toHaveLength(11);
    expect(l.missingSteps).toBe(0);
  });

  it('gibt Fehler der Quelle weiter (z. B. unbekannte ID)', async () => {
    await expect(makeRepo(fakeFetch()).getLegislation('999')).rejects.toBeInstanceOf(HttpError);
  });

  it('verknüpft die namentliche Abstimmung über die Drucksache des Gesetzentwurfs', async () => {
    const repo = makeRepo(fakeFetch());
    const [l, { polls }] = await Promise.all([repo.getLegislation('338357'), repo.getTermPolls()]);
    const matched = matchPolls(l, polls);
    expect(matched.map((p) => [p.id, p.date, p.accepted])).toEqual([[6733, '2026-10-16', true]]);
    expect(matched[0].drucksachen).toEqual(['21/7869', '21/8626']);
  });
});

describe('LegislationRepository.getWeek', () => {
  it('nimmt die letzte Sitzungswoche, wenn die letzten 7 Tage sitzungsfrei waren', async () => {
    const fetchImpl = fakeFetch();
    const week = await makeRepo(fetchImpl).getWeek();
    expect(week.window).toEqual({ start: '2026-10-12', end: '2026-10-18', kind: 'lastSittingWeek' });

    const urls = urlsOf(fetchImpl);
    expect(urls[0]).toBe(`${DIP}plenarprotokoll?f.datum.start=2026-07-03`);
    expect(urls.slice(1).sort()).toEqual([
      `${DIP}vorgang?f.vorgangstyp=Gesetzgebung&f.datum.start=2026-10-12&f.datum.end=2026-10-18`,
      `${DIP}vorgangsposition?f.vorgangstyp=Gesetzgebung&f.datum.start=2026-10-12&f.datum.end=2026-10-18`,
    ]);

    expect(week.sessions.map((s) => `${s.date} ${s.document.label}`)).toEqual([
      '2026-10-14 BT-PlPr. 21/101',
      '2026-10-15 BT-PlPr. 21/102',
      '2026-10-16 BR-PlPr. 1069',
      '2026-10-16 BT-PlPr. 21/103',
    ]);
    expect(week.legislationGroups.map((g) => `${g.status} ${g.items.length}`)).toEqual([
      'Abgelehnt 1',
      'Überwiesen 2',
      'Verabschiedet 1',
      'Verkündet 1',
    ]);
    expect(week.truncated).toBe(false);
    expect(week.stepsTruncated).toBe(false);
    expect(week.source.publisher).toBe('Deutscher Bundestag/Bundesrat – DIP');
  });
});

describe('fetchPages', () => {
  it('folgt dem cursor, bis er sich nicht mehr ändert, höchstens bis zur Obergrenze', async () => {
    const pages = [
      { numFound: 250, cursor: 'a', documents: Array(100).fill(1) },
      { numFound: 250, cursor: 'b', documents: Array(100).fill(2) },
      { numFound: 250, cursor: 'c', documents: Array(50).fill(3) },
    ];
    const load = jest.fn(async (c: string | null) => pages[c === null ? 0 : c === 'a' ? 1 : 2]);
    const all = await fetchPages(load, 5);
    expect(all).toMatchObject({ total: 250, complete: true });
    expect(all.documents).toHaveLength(250);
    expect(load.mock.calls.map(([c]) => c)).toEqual([null, 'a', 'b']);

    const limited = await fetchPages(load, 2);
    expect(limited).toMatchObject({ complete: false });
    expect(limited.documents).toHaveLength(200);
  });
});
