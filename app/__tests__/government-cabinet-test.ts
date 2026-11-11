import { AmbiguousDataError, type GovernmentSnapshot, type UnclearCabinetOffice } from '@/domain/government';
import {
  confirmCabinetWithDip,
  dipRoleOfMember,
  findMember,
  GovernmentRepository,
  officeOfMember,
  UNCONFIRMED_REASON,
} from '@/data/repositories/government-repository';
import { HttpError } from '@/data/http/fetch-json';
import { AbgeordnetenwatchClient } from '@/data/sources/abgeordnetenwatch/client';
import { DipClient } from '@/data/sources/dip/client';
import { DIP_API_KEY } from '@/data/sources/dip/config';
import { DipGovernmentClient, matchGovernmentPerson, sameName } from '@/data/sources/dip/government';
import { buildGovernmentSnapshot, fetchCabinet } from '@/data/sources/wikidata/snapshot';

import dipActivities from './fixtures/dip-aktivitaet-schnieder.json';
import dipHubertz from './fixtures/dip-person-hubertz.json';
import dipKabinett from './fixtures/dip-person-kabinett.json';
import dipRainer from './fixtures/dip-person-rainer.json';
import dipMerz from './fixtures/dip-person-merz.json';
import dipSchnieder from './fixtures/dip-person-schnieder.json';
import dipWadephul from './fixtures/dip-person-wadephul.json';
import dipWarken from './fixtures/dip-person-warken.json';
import dipRessortBills from './fixtures/dip-vorgang-ressort-bundeskanzleramt.json';
import cabinets from './fixtures/wikidata-sparql-kabinette.json';
import { fixtureReader } from './fixtures/wikidata-reader';

const NOW = new Date('2026-10-31T12:00:00.000Z');

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

const dipPersons: Record<string, unknown> = {
  Merz: dipMerz,
  Warken: dipWarken,
  Schnieder: dipSchnieder,
  Hubertz: dipHubertz,
  Wadephul: dipWadephul,
  Rainer: dipRainer,
};

/** Simuliert DIP anhand der URL. Wikidata fragt die App nicht mehr ab. */
function fakeFetch(overrides: { dipKabinett?: unknown } = {}) {
  return jest.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = decodeURIComponent(String(input));
    if (url.includes('wikidata.org')) throw new Error(`Die App darf Wikidata nicht abfragen: ${url}`);
    // Mehrere Nachnamen auf einmal (Gegenprüfung des Kabinetts): echte Antwort vom 05.11.2026.
    if ((url.match(/f\.person=/g) ?? []).length > 1) return jsonResponse(overrides.dipKabinett ?? dipKabinett);
    const person = /api\/v1\/person\?f\.person=([^&]+)/.exec(url);
    if (person && dipPersons[person[1]]) return jsonResponse(dipPersons[person[1]]);
    if (url.startsWith('https://search.dip.bundestag.de/api/v1/aktivitaet?')) return jsonResponse(dipActivities);
    if (url.startsWith('https://search.dip.bundestag.de/api/v1/vorgang?')) return jsonResponse(dipRessortBills);
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
  const aw = new AbgeordnetenwatchClient(http);
  return new GovernmentRepository(snapshot, new DipClient(http), aw, http, () => NOW, undefined, new DipGovernmentClient(http));
}

const urlsOf = (f: jest.Mock) => f.mock.calls.map(([u]) => decodeURIComponent(String(u)));

describe('Build-Auswertung – Bundeskabinett (tools/regierung)', () => {
  it('ermittelt das Kabinett mit drei SPARQL-Abfragen', async () => {
    const reader = fixtureReader();
    const cabinet = await fetchCabinet(reader, NOW);
    expect(cabinet.wikidataId).toBe('Q133849523');
    expect(cabinet.entries).toHaveLength(18);
    expect(cabinet.entries.filter((e) => e.kind === 'member')).toHaveLength(17);
    expect(reader.queries).toHaveLength(3);
    expect(reader.queries[2]).toContain('"2025-05-06T00:00:00Z"^^xsd:dateTime');
  });

  it('rät nicht, wenn kein Kabinett amtiert', async () => {
    const none = structuredClone(cabinets) as typeof cabinets;
    none.results.bindings = none.results.bindings.filter((b) => 'end' in b);
    await expect(fetchCabinet(fixtureReader({ cabinets: none }), NOW)).rejects.toBeInstanceOf(AmbiguousDataError);
    await expect(buildGovernmentSnapshot(fixtureReader({ cabinets: none }), NOW)).rejects.toBeInstanceOf(
      AmbiguousDataError,
    );
  });

  it('bricht ab, wenn Wikidata nicht erreichbar ist (bisherige Datei bleibt)', async () => {
    const reader = { ...fixtureReader(), select: async () => Promise.reject(new HttpError(503, 'x')) };
    await expect(buildGovernmentSnapshot(reader, NOW)).rejects.toBeInstanceOf(HttpError);
  });

  it('das Repository liest das Kabinett aus dem Stand, ohne Netz', async () => {
    const fetchImpl = fakeFetch();
    const cabinet = await makeRepo(fetchImpl as unknown as typeof fetch).getCabinet();
    expect(cabinet).toBe(snapshot.cabinet);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(cabinet.source).toMatchObject({ publisher: 'Wikidata', snapshot: true, retrievedAt: NOW.toISOString() });
  });

  it('bereitet ein Mitglied für die Detailseite auf', async () => {
    const cabinet = await makeRepo(fakeFetch() as unknown as typeof fetch).getCabinet();
    const klingbeil = findMember(cabinet, 'Q1806261')!;
    expect(officeOfMember(klingbeil)).toMatchObject({
      title: 'Bundesminister der Finanzen',
      name: 'Lars Klingbeil',
      inOfficeSince: '2025-05-06',
      party: { shortName: 'SPD' },
    });
    expect(dipRoleOfMember(klingbeil)).toEqual({ kind: 'minister' });
    expect(dipRoleOfMember(findMember(cabinet, 'Q566257')!)).toEqual({ kind: 'chancellor' });
    expect(findMember(cabinet, 'Q2429104')).toBeNull(); // Frei: nicht mehr im Amt
  });
});

describe('GovernmentRepository – DIP-Zuordnung von Regierungsmitgliedern', () => {
  const repo = () => makeRepo(fakeFetch() as unknown as typeof fetch);

  it('nimmt alle Einträge derselben Person (Amt und Abgeordnetenmandat)', async () => {
    await expect(repo().getDipGovernmentPerson('Nina Warken', { kind: 'minister' })).resolves.toEqual({
      ids: ['8131', '8249'],
    });
    // „Gordon Schnieder, MdBR“ ist eine andere Person.
    await expect(repo().getDipGovernmentPerson('Patrick Schnieder', { kind: 'minister' })).resolves.toEqual({
      ids: ['1100', '8129'],
    });
  });

  it('verlangt bei Ministerinnen und Ministern die DIP-Funktion „Bundesmin.“', async () => {
    // Echter Stand 05.11.2026: DIP führt Verena Hubertz nur als „MdB“ – keine Bestätigung des Amtes.
    await expect(repo().getDipGovernmentPerson('Verena Hubertz', { kind: 'minister' })).rejects.toBeInstanceOf(
      AmbiguousDataError,
    );
  });

  it('führt gleichnamige Personen aus verschiedenen Zeiten nicht zusammen (Alois Rainer)', async () => {
    // DIP: 8132 „Alois Rainer, Bundesmin.“ (WP 18–21) und 3962 „Alois Rainer, MdB“ (WP 5–9) – zwei Personen.
    await expect(repo().getDipGovernmentPerson('Alois Rainer', { kind: 'minister' })).resolves.toEqual({
      ids: ['8132'],
    });
  });

  it('erkennt abweichende Vornamen („Johann“ ↔ „Johann David“)', async () => {
    await expect(repo().getDipGovernmentPerson('Johann Wadephul', { kind: 'minister' })).resolves.toEqual({
      ids: ['8122'],
    });
    const p = dipWadephul.documents[0] as Parameters<typeof sameName>[0];
    expect(sameName(p, 'Johann Wadephul')).toBe(true);
    expect(sameName(p, 'Peter Wadephul')).toBe(false);
  });

  it('verlangt bei Kanzler/in die Funktion „Bundeskanzl.“', async () => {
    await expect(repo().getDipGovernmentPerson('Friedrich Merz', { kind: 'chancellor' })).resolves.toEqual({
      ids: ['8167'],
    });
    await expect(repo().getDipGovernmentPerson('Nina Warken', { kind: 'chancellor' })).rejects.toBeInstanceOf(
      AmbiguousDataError,
    );
  });

  it('rät nicht bei zwei Abgeordneten gleichen Namens', async () => {
    const twice = {
      ...dipHubertz,
      numFound: 2,
      documents: [dipHubertz.documents[0], { ...dipHubertz.documents[0], id: '9999' }],
    };
    dipPersons.Hubertz = twice;
    try {
      await expect(repo().getDipGovernmentPerson('Verena Hubertz', { kind: 'minister' })).rejects.toBeInstanceOf(
        AmbiguousDataError,
      );
    } finally {
      dipPersons.Hubertz = dipHubertz;
    }
  });

  it('fragt Aktivitäten aller Einträge gemeinsam ab (ODER) und sendet den API-Schlüssel', async () => {
    const fetchImpl = fakeFetch();
    const page = await makeRepo(fetchImpl as unknown as typeof fetch).getGovernmentActivities(
      ['1100', '8129'],
      '2025-05-06',
      null,
    );
    expect(page.total).toBe(dipActivities.numFound);
    expect(page.items).toHaveLength(2);
    const url = urlsOf(fetchImpl)[0];
    expect(url).toContain('f.person_id=1100&f.person_id=8129');
    expect(url).toContain('f.datum.start=2025-05-06');
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe(`ApiKey ${DIP_API_KEY}`);
  });

  it('lädt Gesetzentwürfe nach federführendem Ressort', async () => {
    const fetchImpl = fakeFetch();
    const page = await makeRepo(fetchImpl as unknown as typeof fetch).getRessortBills(
      'Bundeskanzleramt',
      '2026-07-29',
      null,
    );
    expect(page.total).toBe(1);
    expect(page.items[0].initiative).toContain('Bundesregierung');
    const url = urlsOf(fetchImpl)[0];
    expect(url).toContain('f.ressort_fdf=Bundeskanzleramt');
    expect(url).toContain('f.initiative=Bundesregierung');
    expect(url).toContain('f.vorgangstyp=Gesetzgebung');
  });
});

type DipPersonRaw = Parameters<typeof matchGovernmentPerson>[0][number];

describe('Gegenprüfung des Kabinetts mit DIP', () => {
  const persons = dipKabinett.documents as DipPersonRaw[];

  it('fragt alle Nachnamen in einer DIP-Anfrage ab und bestätigt die Mitglieder', async () => {
    const fetchImpl = fakeFetch();
    const cabinet = await makeRepo(fetchImpl as unknown as typeof fetch).getVerifiedCabinet();
    const dipUrls = urlsOf(fetchImpl).filter((u) => u.includes('search.dip.bundestag.de'));
    expect(dipUrls).toHaveLength(1);
    expect(dipUrls[0]).toContain('f.person=Merz');
    expect(dipUrls[0]).toContain('f.person=Radovan');

    const members = cabinet.entries.filter((e) => e.kind === 'member').map((e) => e.name);
    expect(members).toContain('Friedrich Merz');
    expect(members).toContain('Lars Klingbeil');
    expect(members).toContain('Alois Rainer');
    expect(members).toContain('Reem Alabali Radovan');
    expect(members).toContain('Johann Wadephul');
    // DIP führt Hubertz nur als „MdB“ → keine Person, sondern „keine eindeutige Angabe“.
    expect(members).not.toContain('Verena Hubertz');
    const unclear = cabinet.entries.filter(
      (e): e is UnclearCabinetOffice => e.kind === 'unclear' && e.reason === UNCONFIRMED_REASON,
    );
    expect(unclear).toHaveLength(1);
    expect(unclear[0].title).toMatch(/Wohnen/);
    expect(JSON.stringify(unclear)).not.toContain('Hubertz');
    // Reihenfolge bleibt erhalten (Kanzler zuerst).
    expect(cabinet.entries[0]).toMatchObject({ kind: 'member', name: 'Friedrich Merz' });
  });

  it('zeigt eine Person nicht als Ministerin, wenn Wikidata einen falschen Namen nennt', async () => {
    const cabinet = await makeRepo(fakeFetch() as unknown as typeof fetch).getCabinet();
    const tampered = {
      ...cabinet,
      entries: cabinet.entries.map((e) =>
        e.kind === 'member' && e.name === 'Lars Klingbeil' ? { ...e, name: 'Karl Bär' } : e,
      ),
    };
    const checked = confirmCabinetWithDip(tampered, persons);
    expect(checked.entries.some((e) => e.kind === 'member' && e.name === 'Karl Bär')).toBe(false);
  });

  it('meldet einen Fehler, wenn DIP nicht erreichbar ist (keine ungeprüften Personen)', async () => {
    const base = fakeFetch();
    const fetchImpl = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
      String(input).includes('search.dip.bundestag.de') ? jsonResponse({}, 503) : base(input, init),
    );
    await expect(makeRepo(fetchImpl as unknown as typeof fetch).getVerifiedCabinet()).rejects.toBeInstanceOf(HttpError);
  });

  it('nimmt keine Einträge, die nicht in der aktuellen Wahlperiode geführt werden', () => {
    // Ehemaliges Regierungsmitglied (Funktion „Bundesmin.“ ohne Zeitraum, zuletzt WP 20).
    const former = { ...persons.find((p) => p.id === '8120')!, wahlperiode: [17, 18, 19, 20] };
    expect(matchGovernmentPerson([former], 'Lars Klingbeil', { kind: 'minister' }, 21)).toEqual([]);
    expect(matchGovernmentPerson([former], 'Lars Klingbeil', { kind: 'minister' }, 20).map((p) => p.id)).toEqual(['8120']);
  });

  it('rät nicht bei abweichenden Vornamen gleichnamiger Einträge', () => {
    const minister = persons.find((p) => p.id === '8129')!; // Patrick Schnieder, Bundesmin.
    const other = { ...persons.find((p) => p.id === '1100')!, vorname: 'Peter Patrick' };
    expect(matchGovernmentPerson([minister, other], 'Patrick Schnieder', { kind: 'minister' }, 21)).toEqual([]);
  });

  it('erkennt den Chef des Bundeskanzleramtes („Bundesmin. f. besondere Aufgaben“)', () => {
    const ids = matchGovernmentPerson(persons, 'Thorsten Frei', { kind: 'minister' }, 21).map((p) => p.id).sort();
    expect(ids).toEqual(['1556', '8135']);
  });

  it('verlangt bei Staatsministerinnen und -ministern die Funktion „Staatsmin.“', () => {
    const frei = persons.filter((p) => p.nachname === 'Frei');
    expect(matchGovernmentPerson(frei, 'Thorsten Frei', { kind: 'minister', staatsminister: true }, 21)).toEqual([]);
    const staatsmin = frei.map((p) => (p.id === '8135' ? { ...p, funktion: ['Staatsmin.'] } : p));
    expect(
      matchGovernmentPerson(staatsmin, 'Thorsten Frei', { kind: 'minister', staatsminister: true }, 21).length,
    ).toBe(2);
  });
});
