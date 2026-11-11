import { BundestagRepository } from '@/data/repositories/bundestag-repository';
import { AbgeordnetenwatchClient } from '@/data/sources/abgeordnetenwatch/client';
import { listStateFromLabel, mapMemberListEntry } from '@/data/sources/abgeordnetenwatch/mappers';
import type { AwMandate, AwPolitician } from '@/data/sources/abgeordnetenwatch/schemas';
import { describeSeat, sortedFractions } from '@/domain/representatives';

// Echte, gekürzte Antworten von abgeordnetenwatch.de (abgerufen am 30.10.2026):
// candidacies-mandates?parliament_period=161&type=mandate (10 von 630 Einträgen; total auf 10 gesetzt)
// und politicians?id[in]=[…] zu genau diesen Personen.
import mandatesFixture from './fixtures/aw-mandates-bundestag-161-subset.json';
import parliamentFixture from './fixtures/aw-parliament-bundestag.json';
import politiciansFixture from './fixtures/aw-politicians-bundestag-161-subset.json';

const NOW = new Date('2026-10-30T12:00:00.000Z');

function jsonResponse(body: unknown) {
  return { status: 200, ok: true, headers: { get: () => null }, json: async () => body } as unknown as Response;
}

function fakeFetch(mandates: unknown = mandatesFixture) {
  return jest.fn(async (input: RequestInfo | URL) => {
    const url = decodeURIComponent(String(input));
    if (url.includes('/parliaments/5')) return jsonResponse(parliamentFixture);
    if (url.includes('/candidacies-mandates')) return jsonResponse(mandates);
    if (url.includes('/politicians?')) return jsonResponse(politiciansFixture);
    throw new Error(`Unerwartete URL: ${url}`);
  });
}

const mandates = mandatesFixture.data as unknown as AwMandate[];
const people = politiciansFixture.data as unknown as AwPolitician[];
const byLabel = (label: string) => mandates.find((m) => m.politician.label === label)!;
const personOf = (m: AwMandate) => people.find((p) => p.id === m.politician.id);
const urlsOf = (fn: jest.Mock) => fn.mock.calls.map(([u]) => decodeURIComponent(String(u)));

describe('Liste aller Abgeordneten – Mapper', () => {
  it('liest das Bundesland aus der Landesliste', () => {
    expect(listStateFromLabel('Landesliste Thüringen (Bundestag 2025 - 2029)')).toBe('Thüringen');
    expect(listStateFromLabel(null)).toBeNull();
  });

  it('übernimmt Vor- und Nachname aus den Personendaten', () => {
    const m = byLabel('Jan van Aken');
    const e = mapMemberListEntry(m, personOf(m), NOW.toISOString(), 'CC0 1.0');
    expect(e).toMatchObject({
      fullName: 'Jan van Aken',
      firstName: 'Jan',
      lastName: 'van Aken',
      fraction: 'Die Linke',
    });
    expect(e.politicianId).toBe(m.politician.id);
    expect(e.source.retrievedAt).toBe(NOW.toISOString());
    expect(e.source.url).toContain('abgeordnetenwatch.de/profile/');
  });

  it('beschreibt Wahlkreis bzw. Landesliste', () => {
    const direct = byLabel('Aydan Özoğuz');
    const list = byLabel('Carsten Schneider');
    const d = mapMemberListEntry(direct, personOf(direct), NOW.toISOString());
    const l = mapMemberListEntry(list, personOf(list), NOW.toISOString());
    expect(d.howElected).toBe('direct');
    expect(describeSeat(d)).toMatch(/^Wahlkreis \d+ – /);
    expect(describeSeat(l)).toBe('Landesliste Thüringen');
  });

  it('nutzt ohne Personendaten den vollen Namen zum Sortieren', () => {
    const m = byLabel('Otto Strauß');
    expect(mapMemberListEntry(m, undefined, NOW.toISOString()).lastName).toBe('Otto Strauß');
  });

  it('sortiert Fraktionen alphabetisch, fraktionslos zuletzt', () => {
    expect(
      sortedFractions(['SPD', 'fraktionslos', 'AfD', 'BÜNDNIS 90/­DIE GRÜNEN', 'SPD', null]),
    ).toEqual(['AfD', 'BÜNDNIS 90/­DIE GRÜNEN', 'SPD', 'fraktionslos']);
  });
});

describe('BundestagRepository.getAllMembers', () => {
  it('lädt Mandate und Personen mit je einer Anfrage und sortiert nach Nachname', async () => {
    const fetchImpl = fakeFetch();
    const repo = new BundestagRepository(new AbgeordnetenwatchClient({ fetchImpl }), () => NOW);
    const result = await repo.getAllMembers();

    expect(result.members).toHaveLength(mandates.length);
    expect(result.term.id).toBe(161);
    expect(result.retrievedAt).toBe(NOW.toISOString());
    expect(result.source).toMatchObject({ publisher: 'abgeordnetenwatch.de', license: 'CC0 1.0' });

    const urls = urlsOf(fetchImpl);
    expect(urls).toHaveLength(3); // Wahlperiode, Mandate, Personen
    const mandateUrl = urls.find((u) => u.includes('/candidacies-mandates'))!;
    expect(mandateUrl).toContain('parliament_period=161');
    expect(mandateUrl).toContain('type=mandate');
    expect(mandateUrl).toContain('range_end=1000');

    const lastNames = result.members.map((m) => m.lastName);
    expect(lastNames).toEqual([...lastNames].sort((a, b) => a.localeCompare(b, 'de')));
    expect(result.members[0].fullName).toBe('Michael „Moses“ Arndt');
    expect(result.fractions[result.fractions.length - 1]).toBe('fraktionslos');
  });

  it('lässt Mandate mit Enddatum weg', async () => {
    const ended = structuredClone(mandatesFixture) as { data: { end_date: string | null }[] };
    ended.data[0].end_date = '2026-07-19';
    const repo = new BundestagRepository(
      new AbgeordnetenwatchClient({ fetchImpl: fakeFetch(ended) }),
      () => NOW,
    );
    const result = await repo.getAllMembers();
    expect(result.members).toHaveLength(mandates.length - 1);
  });

  it('lädt weitere Seiten, wenn die API weniger liefert als die Gesamtzahl', async () => {
    const first = structuredClone(mandatesFixture);
    first.data = first.data.slice(0, 6);
    first.meta.result = { ...first.meta.result, count: 6, total: 10 };
    const second = structuredClone(mandatesFixture);
    second.data = second.data.slice(6);
    second.meta.result = { ...second.meta.result, count: 4, total: 10, range_start: 6 };

    const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
      const url = decodeURIComponent(String(input));
      if (url.includes('/parliaments/5')) return jsonResponse(parliamentFixture);
      if (url.includes('/candidacies-mandates')) {
        return jsonResponse(url.includes('range_start=0') ? first : second);
      }
      return jsonResponse(politiciansFixture);
    });
    const repo = new BundestagRepository(new AbgeordnetenwatchClient({ fetchImpl }), () => NOW);
    const result = await repo.getAllMembers();
    expect(result.members).toHaveLength(10);
    const pages = urlsOf(fetchImpl).filter((u) => u.includes('/candidacies-mandates'));
    expect(pages).toHaveLength(2);
    expect(pages[1]).toContain('range_start=6');
  });

  it('fragt höchstens drei Seiten ab, auch wenn die Gesamtzahl nicht stimmt', async () => {
    const broken = structuredClone(mandatesFixture);
    broken.meta.result = { ...broken.meta.result, total: 100_000 };
    const fetchImpl = fakeFetch(broken);
    const repo = new BundestagRepository(new AbgeordnetenwatchClient({ fetchImpl }), () => NOW);
    await repo.getAllMembers();
    expect(urlsOf(fetchImpl).filter((u) => u.includes('/candidacies-mandates')).length).toBeLessThanOrEqual(3);
  });

  it('meldet Fehler der Quelle weiter', async () => {
    const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/parliaments/5')) return jsonResponse(parliamentFixture);
      return jsonResponse({ meta: { status: 'error', status_message: 'kaputt' }, data: [] });
    });
    const repo = new BundestagRepository(new AbgeordnetenwatchClient({ fetchImpl }), () => NOW);
    await expect(repo.getAllMembers()).rejects.toThrow('kaputt');
  });
});
