import {
  bodyName,
  mapLegislation,
  mapPlenarySession,
  mapWeekProceedings,
  portalUrl,
  positionDocument,
} from '@/data/sources/dip/mappers';
import {
  listResponse,
  plenarprotokollSchema,
  vorgangDetailSchema,
  vorgangSchema,
  vorgangspositionSchema,
} from '@/data/sources/dip/schemas';

import protocols from './fixtures/dip-plenarprotokoll-ab-2026-09-20.json';
import brennstoff from './fixtures/dip-vorgang-338357.json';
import tabak from './fixtures/dip-vorgang-338367.json';
import weekVorgaenge from './fixtures/dip-vorgang-gesetzgebung-2026-10-12.json';
import brennstoffSteps from './fixtures/dip-vorgangsposition-338357.json';
import tabakSteps from './fixtures/dip-vorgangsposition-338367.json';
import weekSteps from './fixtures/dip-vorgangsposition-gesetzgebung-2026-10-12.json';

const NOW = '2026-10-31T10:00:00.000Z';
const positions = (json: unknown) => listResponse(vorgangspositionSchema).parse(json).documents;

describe('DIP-Schemas für Gesetzgebung', () => {
  it('liest echte Antworten zu Vorgang, Vorgangspositionen und Plenarprotokollen', () => {
    expect(vorgangDetailSchema.parse(brennstoff).beratungsstand).toBe('Verabschiedet');
    expect(positions(brennstoffSteps)).toHaveLength(11);
    expect(listResponse(plenarprotokollSchema).parse(protocols).documents).toHaveLength(11);
    expect(listResponse(vorgangSchema).parse(weekVorgaenge).documents).toHaveLength(5);
  });
});

describe('mapLegislation', () => {
  const l = mapLegislation(vorgangDetailSchema.parse(brennstoff), positions(brennstoffSteps), 0, NOW);

  it('übernimmt Titel, Initiative, Beratungsstand und Zusammenfassung als reinen Text', () => {
    expect(l.title).toBe('Drittes Gesetz zur Änderung des Brennstoffemissionshandelsgesetzes');
    expect(l.initiative).toEqual(['Bundesregierung']);
    expect(l.status).toBe('Verabschiedet');
    expect(l.electoralPeriod).toBe(21);
    expect(l.summary).toBe('Beschlussempfehlung des Ausschusses: Änderungen; Annahme einer Entschließung');
    expect(l.source).toEqual({
      publisher: 'Deutscher Bundestag/Bundesrat – DIP',
      url: 'https://dip.bundestag.de/vorgang/drittes-gesetz-zur-%C3%A4nderung-des-brennstoffemissionshandelsgesetzes/338357',
      license: 'Nutzung frei gemäß DIP-Nutzungsbedingungen',
      retrievedAt: NOW,
    });
  });

  it('ordnet die Schritte chronologisch (die Quelle liefert sie ungeordnet)', () => {
    const dates = l.steps.map((s) => s.date);
    expect(dates).toEqual([...dates].sort());
    expect(l.steps.map((s) => `${s.date} ${s.body} ${s.title}`).slice(0, 7)).toEqual([
      '2026-08-14 Bundesrat Gesetzentwurf',
      '2026-09-07 Bundestag Gesetzentwurf',
      '2026-09-14 Bundesrat Empfehlungen der Ausschüsse',
      '2026-09-24 Bundestag 1. Beratung',
      '2026-09-25 Bundesrat 1. Durchgang',
      '2026-09-25 Bundesrat Beschlussdrucksache',
      '2026-09-28 Bundestag Unterrichtung über Stellungnahme des BR',
    ]);
  });

  it('nennt Dokument, Ausschüsse und amtlichen Beschluss eines Schritts', () => {
    const first = l.steps.find((s) => s.title === '1. Beratung')!;
    expect(first.document).toEqual({
      kind: 'Plenarprotokoll',
      label: 'BT-PlPr. 21/96, S. 11983B–11986A',
      number: '21/96',
      publisher: 'Bundestag',
      documentType: null,
      url: 'https://dserver.bundestag.de/btp/21/21096.pdf#P.11983',
    });
    expect(first.committees[0]).toEqual({
      name: 'Ausschuss für Umwelt, Klimaschutz, Naturschutz und nukleare Sicherheit',
      lead: true,
    });
    const third = l.steps.find((s) => s.title === '3. Beratung')!;
    expect(third.decisions).toEqual([
      {
        text: 'Annahme in Ausschussfassung',
        method: 'Namentliche Abstimmung',
        result: '303:210:52',
        majority: null,
      },
    ]);
    const bill = l.steps.find((s) => s.title === 'Gesetzentwurf' && s.body === 'Bundestag')!;
    expect(bill.document?.label).toBe('BT-Drs. 21/7869');
    expect(bill.authors).toEqual(['Bundesregierung']);
    expect(l.steps.find((s) => s.note === 'Nachtrag')?.title).toBe('2. Beratung');
  });

  it('übernimmt Verkündung und Inkrafttreten', () => {
    const t = mapLegislation(vorgangDetailSchema.parse(tabak), positions(tabakSteps), 0, NOW);
    expect(t.status).toBe('Verkündet');
    expect(t.promulgations).toEqual([
      {
        date: '2026-10-20',
        signedOn: '2026-10-19',
        citation: 'BGBl I 2026, 309',
        gazette: 'Bundesgesetzblatt Teil I',
        url: 'https://www.recht.bund.de/eli/bund/BGBl_1/2026/309',
      },
    ]);
    expect(t.entryIntoForce).toEqual([{ date: '2026-10-21', note: null }]);
    expect(t.summary).toContain('Änderung §§ 2 und 38 Tabaksteuergesetz');
    expect(t.summary).not.toMatch(/<|&/);
  });
});

describe('Wochenüberblick', () => {
  it('ordnet die Schritte im Zeitraum den Vorgängen zu', () => {
    const items = mapWeekProceedings(
      listResponse(vorgangSchema).parse(weekVorgaenge).documents,
      positions(weekSteps),
      NOW,
    );
    expect(items).toHaveLength(5);
    const tabakItem = items.find((i) => i.id === '338367')!;
    expect(tabakItem.status).toBe('Verkündet');
    expect(tabakItem.steps.map((s) => `${s.body}: ${s.title}`)).toEqual([
      'Bundestag: Beschlussempfehlung und Bericht',
      'Bundestag: Bericht gemäß § 96 Geschäftsordnung BT',
      'Bundestag: 2. Beratung',
      'Bundestag: 3. Beratung',
      'Bundesrat: Unterrichtung über Gesetzesbeschluss des BT',
      'Bundesrat: 2. Durchgang',
      'Bundesrat: Beschlussdrucksache',
    ]);
  });

  it('zeigt Plenarprotokolle mit amtlicher Fundstelle', () => {
    const p = listResponse(plenarprotokollSchema).parse(protocols).documents;
    const bt = mapPlenarySession(p.find((d) => d.dokumentnummer === '21/103')!, NOW);
    expect(bt).toMatchObject({
      date: '2026-10-16',
      body: 'Bundestag',
      title: 'Protokoll der 103. Sitzung des 21. Deutschen Bundestages',
      document: { label: 'BT-PlPr. 21/103', url: 'https://dserver.bundestag.de/btp/21/21103.pdf' },
    });
    const br = mapPlenarySession(p.find((d) => d.dokumentnummer === '1069')!, NOW);
    expect(br.document.label).toBe('BR-PlPr. 1069');
    expect(br.source.url).toBe(
      'https://dip.bundestag.de/plenarprotokoll/protokoll-der-1069-sitzung-des-bundesrates/5822',
    );
  });
});

describe('Hilfsfunktionen', () => {
  it('übersetzt die Zuordnung', () => {
    expect(bodyName('BT')).toBe('Bundestag');
    expect(bodyName('EK')).toBe('Europakammer des Bundesrates');
    expect(bodyName(null)).toBeNull();
  });
  it('Fundstelle ohne Nummer ergibt kein Dokument', () => {
    expect(positionDocument({ dokumentart: 'Drucksache' })).toBeNull();
  });
  it('portalUrl bleibt für bestehende Arten unverändert', () => {
    expect(portalUrl('vorgang', 'Test Titel', '1')).toBe('https://dip.bundestag.de/vorgang/test-titel/1');
  });
});
