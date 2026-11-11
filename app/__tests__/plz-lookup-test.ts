import { isValidPlz, lookupPlz, type PlzDataset } from '@/data/sources/local/plz-lookup';

const data: PlzDataset = {
  meta: { erzeugt: '2026-10-26', methode: 'Test', quellen: {} },
  wahlkreise: {
    '75': { name: 'Berlin-Mitte', land: 'Berlin' },
    '76': { name: 'Berlin-Pankow', land: 'Berlin' },
  },
  plz: {
    '10117': [75],
    '10405': [75, 76],
  },
};

describe('PLZ-Zuordnung', () => {
  it('erkennt ungültige Eingaben', () => {
    expect(isValidPlz('1234')).toBe(false);
    expect(isValidPlz('123456')).toBe(false);
    expect(isValidPlz('12a45')).toBe(false);
    expect(isValidPlz('00000')).toBe(false);
    expect(lookupPlz('abc', data)).toEqual({ status: 'invalid' });
  });

  it('ignoriert Leerzeichen', () => {
    expect(lookupPlz(' 101 17 ', data).status).toBe('ok');
  });

  it('liefert einen Wahlkreis mit Name und Land', () => {
    expect(lookupPlz('10117', data)).toEqual({
      status: 'ok',
      plz: '10117',
      constituencies: [{ number: 75, name: 'Berlin-Mitte', state: 'Berlin' }],
    });
  });

  it('liefert mehrere Wahlkreise, wenn die PLZ geteilt ist', () => {
    const result = lookupPlz('10405', data);
    expect(result.status === 'ok' && result.constituencies.map((c) => c.number)).toEqual([75, 76]);
  });

  it('meldet unbekannte Postleitzahlen', () => {
    expect(lookupPlz('99999', data)).toEqual({ status: 'unknown', plz: '99999' });
  });
});
