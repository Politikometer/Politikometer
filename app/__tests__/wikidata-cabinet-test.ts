import type { CabinetMember } from '@/domain/government';
import {
  buildCabinet,
  genderedTitle,
  ressortKey,
  ressortSortKey,
  rolesOf,
  selectCurrentCabinets,
} from '@/data/sources/wikidata/cabinet';
import { holdersQuery, membershipQuery, sparqlResponseSchema } from '@/data/sources/wikidata/sparql';

import holdersRaw from './fixtures/wikidata-sparql-kabinett-aemter.json';
import membershipRaw from './fixtures/wikidata-sparql-kabinett-mitglieder.json';
import cabinetsRaw from './fixtures/wikidata-sparql-kabinette.json';

// Echte Antworten von query.wikidata.org vom 31.10.2026.
const cabinets = sparqlResponseSchema.parse(cabinetsRaw).results.bindings;
const membershipRows = sparqlResponseSchema.parse(membershipRaw).results.bindings;
const holderRows = sparqlResponseSchema.parse(holdersRaw).results.bindings;
const RETRIEVED = '2026-10-31T12:00:00.000Z';

function build(today: string, holders = holderRows) {
  const [cabinet] = selectCurrentCabinets(cabinets, today);
  return buildCabinet({ cabinet, membershipRows, holderRows: holders, today, retrievedAt: RETRIEVED });
}

const members = (today: string) =>
  build(today).entries.filter((e): e is CabinetMember => e.kind === 'member');
const byName = (today: string, name: string) => members(today).find((m) => m.name === name);

describe('Bundeskabinett aus Wikidata', () => {
  it('findet das amtierende Kabinett (Beginn erreicht, kein Ende) – auch zum Stichtag', () => {
    expect(selectCurrentCabinets(cabinets, '2026-10-31')).toEqual([
      { id: 'Q133849523', name: 'Kabinett Merz', since: '2025-05-06' },
    ]);
    expect(selectCurrentCabinets(cabinets, '2024-01-01').map((c) => c.id)).toEqual(['Q109712556']);
  });

  it('liest alle Ämter des Kabinetts', () => {
    const roles = rolesOf(membershipRows);
    expect(roles).toHaveLength(21);
    expect(roles).toContain('Q4970706'); // Bundeskanzler
    expect(roles).toContain('Q30543924'); // zweiter Eintrag „Bundesminister für Verkehr“
  });

  it('stellt das Kabinett vollständig und in fester Reihenfolge zusammen', () => {
    const cabinet = build('2026-10-31');
    expect(cabinet.name).toBe('Kabinett Merz');
    expect(cabinet.source.url).toBe('https://www.wikidata.org/wiki/Q133849523');
    expect(cabinet.entries.map((e) => (e.kind === 'member' ? e.name : `? ${e.title}`))).toEqual([
      'Friedrich Merz',
      'Bärbel Bas', // Arbeit
      'Johann Wadephul', // Auswärtiges Amt
      'Karin Prien', // Bildung
      'Nina Warken', // Bundeskanzleramt
      'Karsten Wildberger', // Digitales
      'Lars Klingbeil', // Finanzen
      'Dorothee Bär', // Forschung
      '? Bundesministerium für Gesundheit',
      'Alexander Dobrindt', // Innern
      'Stefanie Hubig', // Justiz
      'Alois Rainer', // Landwirtschaft
      'Carsten Schneider', // Umwelt
      'Patrick Schnieder', // Verkehr
      'Boris Pistorius', // Verteidigung
      'Katherina Reiche', // Wirtschaft und Energie
      'Reem Alabali Radovan', // wirtschaftliche Zusammenarbeit
      'Verena Hubertz', // Wohnen
    ]);
  });

  it('übernimmt Kanzler, Amt seit, Partei und Quelle', () => {
    const merz = byName('2026-10-31', 'Friedrich Merz')!;
    expect(merz).toMatchObject({
      wikidataId: 'Q566257',
      isHeadOfGovernment: true,
      party: { name: 'Christlich Demokratische Union Deutschlands', shortName: 'CDU' },
      offices: [{ title: 'Bundeskanzler der Bundesrepublik Deutschland', since: '2025-05-06', ministry: null }],
      source: { publisher: 'Wikidata', url: 'https://www.wikidata.org/wiki/Q566257', license: 'CC0 1.0' },
    });
  });

  it('ein eingetragenes Ende und ein ausdrücklicher Vorgänger zählen mehr als der veraltete Kabinett-Eintrag', () => {
    // Kabinett-Eintrag: Warken = Gesundheit, Frei = Chef BK. Personen-Einträge: beides endete am 29.07.2026.
    const warken = byName('2026-10-31', 'Nina Warken')!;
    expect(warken.offices).toEqual([
      { title: 'Chefin des Bundeskanzleramtes', wikidataId: 'Q30545012', ministry: 'Bundeskanzleramt', since: '2026-07-29' },
    ]);
    expect(byName('2026-10-31', 'Thorsten Frei')).toBeUndefined();
    // Nachfolge im Gesundheitsministerium hat in Wikidata kein Amt mit Beginn → keine eindeutige Angabe.
    const health = build('2026-10-31').entries.find((e) => e.kind === 'unclear');
    expect(health).toMatchObject({ title: 'Bundesministerium für Gesundheit', wikidataId: 'Q30533368' });
  });

  it('vor dem Wechsel am 29.07.2026 gilt die frühere Besetzung', () => {
    expect(byName('2026-07-01', 'Nina Warken')!.offices.map((o) => o.title)).toEqual([
      'Bundesministerin für Gesundheit',
    ]);
    expect(byName('2026-07-01', 'Thorsten Frei')!.offices.map((o) => o.title)).toEqual([
      'Chef des Bundeskanzleramtes',
      'Bundesminister für besondere Aufgaben',
    ]);
    expect(build('2026-07-01').entries.some((e) => e.kind === 'unclear')).toBe(false);
  });

  it('fasst doppelte Ämter gleicher Bezeichnung zusammen und ordnet Zusatzämter nach dem Ministerium', () => {
    expect(byName('2026-10-31', 'Patrick Schnieder')!.offices.map((o) => o.title)).toEqual([
      'Bundesminister für Verkehr',
    ]);
    expect(byName('2026-10-31', 'Lars Klingbeil')!.offices.map((o) => o.title)).toEqual([
      'Bundesminister der Finanzen',
      'Vizekanzler',
    ]);
    // Zwei Amtsaussagen (2023–2025 und ab 2025): neu ernannt, weiterhin im Amt.
    expect(byName('2026-10-31', 'Boris Pistorius')!.offices[0].since).toBe('2025-05-06');
  });

  it('passt die Amtsbezeichnung dem Geschlecht laut Quelle an', () => {
    expect(byName('2026-10-31', 'Katherina Reiche')!.offices[0].title).toBe(
      'Bundesministerin für Wirtschaft und Energie',
    );
    expect(byName('2026-10-31', 'Carsten Schneider')!.offices[0].title).toBe(
      'Bundesminister für Umwelt, Klimaschutz, Naturschutz und nukleare Sicherheit',
    );
  });

  it('rät nicht: zwei amtierende Personen im selben Ressort ergeben „keine eindeutige Angabe“', () => {
    const extra = holderRows
      .filter((b) => b.person?.value.endsWith('/Q893758')) // Pistorius
      .map((b) => ({
        ...b,
        st: { type: 'uri', value: `${b.st.value}-kopie` },
        person: { type: 'uri', value: 'http://www.wikidata.org/entity/Q1' },
        personLabel: { type: 'literal', value: 'Andere Person', 'xml:lang': 'de' },
      }));
    const cabinet = build('2026-10-31', [...holderRows, ...extra]);
    expect(cabinet.entries.find((e) => e.kind === 'member' && e.name === 'Boris Pistorius')).toBeUndefined();
    expect(cabinet.entries).toContainEqual(
      expect.objectContaining({
        kind: 'unclear',
        title: 'Bundesministerium der Verteidigung',
        reason: 'Die Quelle nennt für dieses Amt derzeit mehr als eine amtierende Person.',
      }),
    );
  });

  it('Hilfsfunktionen für Bezeichnung und Sortierung', () => {
    expect(genderedTitle('Bundesminister der Finanzen', 'female')).toBe('Bundesministerin der Finanzen');
    expect(genderedTitle('Bundesministerin für Bildung', 'male')).toBe('Bundesminister für Bildung');
    expect(genderedTitle('Chef des Bundeskanzleramtes', 'female')).toBe('Chefin des Bundeskanzleramtes');
    expect(genderedTitle('Bundesminister der Finanzen', null)).toBe('Bundesminister der Finanzen');
    expect(ressortKey('Bundesministerin für Wohnen')).toBe(ressortKey('Bundesminister für Wohnen'));
    expect(ressortSortKey('Bundesministerium der Finanzen')).toBe('Finanzen');
    expect(ressortSortKey('Auswärtiges Amt')).toBe('Auswärtiges Amt');
  });

  it('setzt nur gültige Kennungen in Abfragen ein', () => {
    expect(() => membershipQuery('Q1 } DROP')).toThrow();
    expect(() => holdersQuery(['Q1'], 'Q2', '2025-05-06"')).toThrow();
    expect(membershipQuery('Q133849523')).toContain('wd:Q133849523');
  });
});
