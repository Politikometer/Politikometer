import { AmbiguousDataError, type GovernmentSnapshot } from '@/domain/government';
import { GovernmentRepository, splitName } from '@/data/repositories/government-repository';
import { HttpError } from '@/data/http/fetch-json';
import { AbgeordnetenwatchClient } from '@/data/sources/abgeordnetenwatch/client';
import { DipClient } from '@/data/sources/dip/client';
import { DIP_API_KEY } from '@/data/sources/dip/config';
import { buildGovernmentSnapshot, fetchChancellor } from '@/data/sources/wikidata/snapshot';

import awMandate from './fixtures/aw-mandate-merz-161.json';
import awParliament from './fixtures/aw-parliament-bundestag.json';
import awSearch from './fixtures/aw-politician-search-merz.json';
import dipActivities from './fixtures/dip-aktivitaet-8167.json';
import dipPerson from './fixtures/dip-person-merz.json';
import dipProceedings from './fixtures/dip-vorgang-bundesregierung.json';
import headsOfGovernment from './fixtures/wikidata-q183-p6.json';
import { fixtureReader } from './fixtures/wikidata-reader';

const NOW = new Date('2026-10-30T12:00:00.000Z');

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

type Overrides = Partial<Record<'dipPerson' | 'awSearch', unknown>>;

/** Simuliert DIP und abgeordnetenwatch anhand der URL. Wikidata fragt die App nicht mehr ab. */
function fakeFetch(overrides: Overrides = {}) {
  return jest.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = decodeURIComponent(String(input));
    if (url.includes('wikidata.org')) throw new Error(`Die App darf Wikidata nicht abfragen: ${url}`);
    if (url.startsWith('https://search.dip.bundestag.de/api/v1/person?')) return jsonResponse(overrides.dipPerson ?? dipPerson);
    if (url.startsWith('https://search.dip.bundestag.de/api/v1/aktivitaet?')) return jsonResponse(dipActivities);
    if (url.startsWith('https://search.dip.bundestag.de/api/v1/vorgang?')) return jsonResponse(dipProceedings);
    if (url.includes('abgeordnetenwatch.de/api/v2/politicians?')) return jsonResponse(overrides.awSearch ?? awSearch);
    if (url.includes('abgeordnetenwatch.de/api/v2/parliaments/5')) return jsonResponse(awParliament);
    if (url.includes('abgeordnetenwatch.de/api/v2/candidacies-mandates?')) return jsonResponse(awMandate);
    throw new Error(`Unerwartete URL: ${url}`);
  });
}

/** Stand aus echten Wikidata-Antworten – mit derselben Auswertung wie das Build-Skript. */
let snapshot: GovernmentSnapshot;
beforeAll(async () => {
  snapshot = await buildGovernmentSnapshot(fixtureReader(), NOW);
});

function makeRepo(fetchImpl: typeof fetch) {
  const http = { fetchImpl, retries: 0 };
  return new GovernmentRepository(snapshot, new DipClient(http), new AbgeordnetenwatchClient(http), http, () => NOW);
}

const urlsOf = (f: jest.Mock) => f.mock.calls.map(([u]) => decodeURIComponent(String(u)));

describe('Build-Auswertung – Bundeskanzler/in (tools/regierung)', () => {
  it('ermittelt die amtierende Person über Wikidata (P6 ohne Endzeitpunkt)', async () => {
    const reader = fixtureReader();
    const office = await fetchChancellor(reader, NOW);
    expect(reader.claims).toEqual(['Q183/P6', 'Q566257/P102', 'Q566257/P21', 'Q49762/P1813']);
    expect(office).toEqual({
      title: 'Bundeskanzler',
      wikidataId: 'Q566257',
      name: 'Friedrich Merz',
      inOfficeSince: '2025-05-06',
      party: { name: 'Christlich Demokratische Union Deutschlands', shortName: 'CDU' },
      source: {
        publisher: 'Wikidata',
        url: 'https://www.wikidata.org/wiki/Q566257',
        license: 'CC0 1.0',
        retrievedAt: NOW.toISOString(),
        snapshot: true,
      },
    });
  });

  it('rät nicht, wenn Wikidata keine amtierende Person nennt', async () => {
    const ended = structuredClone(headsOfGovernment) as typeof headsOfGovernment;
    const last = ended.claims.P6[2] as unknown as { qualifiers: Record<string, unknown[]> };
    last.qualifiers.P582 = [
      { snaktype: 'value', property: 'P582', datavalue: { type: 'time', value: { time: '+2026-01-01T00:00:00Z', precision: 11 } } },
    ];
    await expect(fetchChancellor(fixtureReader({ p6: ended }), NOW)).rejects.toBeInstanceOf(AmbiguousDataError);
    // Dann wird auch keine Datei erzeugt.
    await expect(buildGovernmentSnapshot(fixtureReader({ p6: ended }), NOW)).rejects.toBeInstanceOf(AmbiguousDataError);
  });

  it('bricht ab, wenn Wikidata nicht erreichbar ist', async () => {
    const reader = { ...fixtureReader(), getClaims: async () => Promise.reject(new HttpError(503, 'x')) };
    await expect(fetchChancellor(reader, NOW)).rejects.toBeInstanceOf(HttpError);
  });

  it('verlangt, dass Kanzler/in und Regierungschef/in im Kabinett dieselbe Person sind', () => {
    expect(snapshot.chancellor.wikidataId).toBe('Q566257');
    const heads = snapshot.cabinet.entries.filter((e) => e.kind === 'member' && e.isHeadOfGovernment);
    expect(heads.map((e) => e.wikidataId)).toEqual(['Q566257']);
    expect(snapshot).toMatchObject({ format: 1, evaluatedFor: '2026-10-30', source: { license: 'CC0 1.0' } });
  });
});

describe('GovernmentRepository', () => {
  it('liest die Kanzlerin/den Kanzler aus dem mitgelieferten Stand, ohne Netz', async () => {
    const fetchImpl = fakeFetch();
    await expect(makeRepo(fetchImpl as unknown as typeof fetch).getChancellor()).resolves.toBe(snapshot.chancellor);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('ordnet die DIP-Person über Name und Funktion zu und sendet den API-Schlüssel', async () => {
    const fetchImpl = fakeFetch();
    const id = await makeRepo(fetchImpl as unknown as typeof fetch).getDipPersonId('Friedrich Merz');
    expect(id).toBe('8167');
    expect(urlsOf(fetchImpl)[0]).toContain('f.person=Merz');
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe(`ApiKey ${DIP_API_KEY}`);
  });

  it('meldet eine nicht eindeutige DIP-Zuordnung', async () => {
    const two = { ...dipPerson, numFound: 2, documents: [dipPerson.documents[0], { ...dipPerson.documents[0], id: '9999' }] };
    const repo = makeRepo(fakeFetch({ dipPerson: two }) as unknown as typeof fetch);
    await expect(repo.getDipPersonId('Friedrich Merz')).rejects.toBeInstanceOf(AmbiguousDataError);
  });

  it('lädt Aktivitäten seit Amtsantritt seitenweise über den cursor', async () => {
    const fetchImpl = fakeFetch();
    const repo = makeRepo(fetchImpl as unknown as typeof fetch);
    const page = await repo.getActivities('8167', '2025-05-06', null);
    expect(page.items.map((a) => a.kind)).toEqual(['Rede', 'Einleitende Ausführungen und Beantwortung', 'Rede']);
    expect(page.total).toBe(dipActivities.numFound);
    await repo.getActivities('8167', '2025-05-06', 'ABC');
    const [first, second] = urlsOf(fetchImpl);
    expect(first).toContain('f.person_id=8167');
    expect(first).toContain('f.datum.start=2025-05-06');
    expect(first).not.toContain('cursor=');
    expect(second).toContain('cursor=ABC');
  });

  it('lädt Gesetzentwürfe mit den amtlichen Filtern Initiative und Vorgangstyp', async () => {
    const fetchImpl = fakeFetch();
    const page = await makeRepo(fetchImpl as unknown as typeof fetch).getGovernmentBills('2025-05-06', null);
    expect(page.items).toHaveLength(3);
    expect(page.nextCursor).toBe(dipProceedings.cursor);
    const url = urlsOf(fetchImpl)[0];
    expect(url).toContain('f.initiative=Bundesregierung');
    expect(url).toContain('f.vorgangstyp=Gesetzgebung');
    expect(url).toContain('f.datum.start=2025-05-06');
  });

  it('verlinkt das Abgeordnetenprofil nur bei eindeutiger Zuordnung', async () => {
    const repo = makeRepo(fakeFetch() as unknown as typeof fetch);
    const office = await repo.getChancellor();
    await expect(repo.findBundestagProfile(office)).resolves.toMatchObject({ politicianId: 118559 });

    const otherQid = { ...awSearch, data: awSearch.data.map((p) => ({ ...p, qid_wikidata: 'Q1' })) };
    const repo2 = makeRepo(fakeFetch({ awSearch: otherQid }) as unknown as typeof fetch);
    await expect(repo2.findBundestagProfile(office)).resolves.toBeNull();

    const twice = { ...awSearch, data: [...awSearch.data, { ...awSearch.data[0], id: 1 }] };
    const repo3 = makeRepo(fakeFetch({ awSearch: twice }) as unknown as typeof fetch);
    await expect(repo3.findBundestagProfile(office)).resolves.toBeNull();
  });

  it('teilt Namen in Vor- und Nachname', () => {
    expect(splitName('Friedrich Merz')).toEqual({ first: 'Friedrich', last: 'Merz' });
    expect(splitName('Merz')).toBeNull();
  });
});
