import {
  aktivitaetSchema,
  listResponse,
  personSchema,
  vorgangSchema,
} from '@/data/sources/dip/schemas';
import {
  documentLabel,
  mapActivity,
  mapPage,
  mapProceeding,
  matchChancellor,
  nextCursor,
  portalUrl,
} from '@/data/sources/dip/mappers';

import aktivitaeten from './fixtures/dip-aktivitaet-8167.json';
import person from './fixtures/dip-person-merz.json';
import vorgaenge from './fixtures/dip-vorgang-bundesregierung.json';

const NOW = '2026-10-30T12:00:00.000Z';

describe('DIP-Schemas', () => {
  it('liest echte Antworten zu Person, Aktivität und Vorgang', () => {
    const p = listResponse(personSchema).parse(person);
    // In der echten Antwort ist „funktion“ eine Liste (in der OpenAPI-Datei ein Text).
    expect(p.documents[0].funktion).toEqual(['Bundeskanzl.']);
    expect(listResponse(aktivitaetSchema).parse(aktivitaeten).documents).toHaveLength(3);
    expect(listResponse(vorgangSchema).parse(vorgaenge).numFound).toBe(271);
  });

  it('akzeptiert „funktion“ auch als einzelnen Text (laut OpenAPI)', () => {
    const doc = { ...person.documents[0], funktion: 'Bundeskanzl.' };
    expect(personSchema.parse(doc).funktion).toEqual(['Bundeskanzl.']);
  });

  it('lehnt Antworten ohne Pflichtfelder ab', () => {
    expect(() => listResponse(vorgangSchema).parse({ numFound: 1, documents: [] })).toThrow();
  });
});

describe('DIP-Mapper', () => {
  const acts = listResponse(aktivitaetSchema).parse(aktivitaeten).documents;

  it('übernimmt die amtliche Aktivitätsart, Datum und Fundstelle', () => {
    const a = mapActivity(acts[0], NOW);
    expect(a).toMatchObject({
      id: '1807281',
      kind: 'Rede',
      date: '2026-10-14',
      chamber: 'Bundestag',
      documentLabel: 'BT-PlPr. 21/101, S. 12642C',
      documentUrl: 'https://dserver.bundestag.de/btp/21/21101.pdf#P.12642',
    });
    // Zwei gleichlautende Entschließungsanträge werden nur einmal genannt.
    expect(a.topics).toHaveLength(2);
    expect(a.moreTopicsCount).toBe(0);
    expect(a.source).toEqual({
      publisher: 'Deutscher Bundestag/Bundesrat – DIP',
      url: expect.stringMatching(/^https:\/\/dip\.bundestag\.de\/akt.*\/1807281$/),
      license: expect.any(String),
      retrievedAt: NOW,
    });
  });

  it('kennzeichnet Aktivitäten im Bundesrat', () => {
    const a = mapActivity(acts[2], NOW);
    expect(a.chamber).toBe('Bundesrat');
    expect(a.documentLabel).toBe('BR-PlPr. 1056, S. 180');
    expect(a.kind).toBe('Rede');
  });

  it('schreibt Drucksachen als „BT-Drs.“', () => {
    expect(documentLabel({ herausgeber: 'BT', dokumentart: 'Drucksache', dokumentnummer: '21/1234' })).toBe(
      'BT-Drs. 21/1234',
    );
    expect(documentLabel(null)).toBeNull();
  });

  it('übernimmt Vorgänge mit amtlichem Beratungsstand und DIP-Link', () => {
    const v = listResponse(vorgangSchema).parse(vorgaenge).documents[0];
    const p = mapProceeding(v, NOW);
    expect(p).toMatchObject({ id: '338789', status: 'Überwiesen', type: 'Gesetzgebung', initiative: ['Bundesregierung'] });
    expect(p.source.url).toBe(
      'https://dip.bundestag.de/vorgang/gesetz-zur-%C3%A4nderung-des-energiewirtschaftsgesetzes-zur-gew%C3%A4hrung-eines-zuschusses-zu/338789',
    );
  });

  it('baut Portal-Links wie das DIP selbst', () => {
    expect(portalUrl('vorgang', 'Haushaltsgesetz 2027 / HG', '1')).toBe(
      'https://dip.bundestag.de/vorgang/haushaltsgesetz-2027-hg/1',
    );
  });

  it('erkennt das Ende der Liste am unveränderten cursor', () => {
    const res = { numFound: 3, cursor: 'B', documents: [1] };
    expect(nextCursor(res, 'A')).toBe('B');
    expect(nextCursor(res, 'B')).toBeNull();
    expect(nextCursor({ ...res, documents: [] }, 'A')).toBeNull();
    const page = mapPage(listResponse(vorgangSchema).parse(vorgaenge), null, (v) => v.id, NOW);
    expect(page).toMatchObject({ total: 271, nextCursor: 'AoJw0IHOsp8DLlZvcmdhbmctMzM0NDc0' });
  });

  it('ordnet die Person nur bei Name und Funktion Bundeskanzler zu', () => {
    const persons = listResponse(personSchema).parse(person).documents;
    expect(matchChancellor(persons, 'Friedrich Merz').map((p) => p.id)).toEqual(['8167']);
    expect(matchChancellor(persons, 'Friedrich März')).toEqual([]);
    const notChancellor = persons.map((p) => ({ ...p, funktion: ['MdB'] }));
    expect(matchChancellor(notChancellor, 'Friedrich Merz')).toEqual([]);
  });
});
