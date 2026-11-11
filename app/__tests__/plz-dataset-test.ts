/** Prüft die erzeugte Tabelle PLZ → Wahlkreis auf Vollständigkeit. */
import { lookupPlz, type PlzDataset } from '@/data/sources/local/plz-lookup';

import raw from '../assets/data/plz-wahlkreis.json';

const data = raw as PlzDataset;

describe('Tabelle PLZ → Bundestagswahlkreis', () => {
  it('enthält alle 299 Wahlkreise mit Namen und Land', () => {
    expect(Object.keys(data.wahlkreise)).toHaveLength(299);
    for (const wk of Object.values(data.wahlkreise)) {
      expect(wk.name).toBeTruthy();
      expect(wk.land).toBeTruthy();
    }
  });

  it('ordnet jedem Wahlkreis mindestens eine PLZ zu', () => {
    const covered = new Set(Object.values(data.plz).flat());
    expect(covered.size).toBe(299);
  });

  it('deckt praktisch alle Postleitzahlen ab', () => {
    expect(Object.keys(data.plz).length).toBeGreaterThan(8000);
  });

  it('enthält die Pflicht-Quellenvermerke', () => {
    expect(data.meta.quellen.wahlkreise).toContain('Die Bundeswahlleiterin');
    expect(data.meta.quellen.plz).toContain('OpenStreetMap');
  });

  it.each([
    ['10117', 'Berlin-Mitte'],
    ['30159', 'Stadt Hannover II'],
    ['60311', 'Frankfurt am Main I'],
    ['66424', 'Homburg'],
  ])('ordnet %s richtig zu (%s)', (plz, name) => {
    const result = lookupPlz(plz, data);
    expect(result.status === 'ok' && result.constituencies.map((c) => c.name)).toContain(name);
  });
});
