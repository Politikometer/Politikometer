import {
  currentFraction,
  mapHowElected,
  mapMandate,
  mapPolitician,
  parseConstituencyLabel,
  stripPeriodSuffix,
} from '@/data/sources/abgeordnetenwatch/mappers';
import { listResponse, mandateSchema, politicianSchema } from '@/data/sources/abgeordnetenwatch/schemas';

import mandatesFixture from './fixtures/aw-mandates-wk192.json';
import politiciansFixture from './fixtures/aw-politicians-wk192.json';

const AT = '2026-10-26T12:00:00.000Z';

describe('Hilfsfunktionen', () => {
  it('entfernt den Wahlperioden-Zusatz', () => {
    expect(stripPeriodSuffix('SPD (Bundestag 2025 - 2029)')).toBe('SPD');
    expect(stripPeriodSuffix('Bundestag 2025 - 2029')).toBe('Bundestag 2025 - 2029');
  });

  it('liest Nummer und Name des Wahlkreises', () => {
    expect(parseConstituencyLabel('192 - Erfurt – Weimar – Weimarer Land II (Bundestag 2025 - 2029)')).toEqual({
      number: 192,
      name: 'Erfurt – Weimar – Weimarer Land II',
    });
    expect(parseConstituencyLabel('kein Wahlkreis')).toBeNull();
  });

  it('übersetzt die Art des Mandats', () => {
    expect(mapHowElected('constituency')).toBe('direct');
    expect(mapHowElected('list')).toBe('list');
    expect(mapHowElected('moved_up')).toBe('moved_up');
    expect(mapHowElected(null)).toBe('unknown');
  });

  it('nimmt die aktuelle Fraktion', () => {
    expect(
      currentFraction([
        { fraction: { id: 1, label: 'A (Bundestag 2025 - 2029)' }, valid_from: '2025-03-25', valid_until: '2026-01-01' },
        { fraction: { id: 2, label: 'B (Bundestag 2025 - 2029)' }, valid_from: '2026-01-02', valid_until: null },
      ]),
    ).toBe('B');
    expect(currentFraction([])).toBeNull();
  });
});

describe('Mapping echter API-Antworten (Wahlkreis 192)', () => {
  const mandates = listResponse(mandateSchema).parse(mandatesFixture).data;
  const politicians = listResponse(politicianSchema).parse(politiciansFixture).data;

  it('validiert die Antworten gegen das Schema', () => {
    expect(mandates.length).toBeGreaterThan(0);
    expect(politicians.length).toBe(mandates.length);
  });

  it('übersetzt jedes Mandat vollständig und mit Quelle', () => {
    for (const m of mandates) {
      const mapped = mapMandate(m, AT, 'CC0 1.0');
      expect(mapped.constituency?.number).toBe(192);
      expect(mapped.fraction).toBeTruthy();
      expect(mapped.howElected).not.toBe('unknown');
      expect(mapped.source).toEqual(
        expect.objectContaining({ publisher: 'abgeordnetenwatch.de', license: 'CC0 1.0', retrievedAt: AT }),
      );
      expect(mapped.source.url).toMatch(/^https:\/\/www\.abgeordnetenwatch\.de\//);
    }
  });

  it('übersetzt Personen', () => {
    const p = mapPolitician(politicians[0], AT, 'CC0 1.0');
    expect(p.fullName).toBeTruthy();
    expect(p.lastName).toBeTruthy();
    expect(p.party).toBeTruthy();
    expect(p.source.retrievedAt).toBe(AT);
  });
});
