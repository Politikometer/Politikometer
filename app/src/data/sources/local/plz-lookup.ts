/**
 * Postleitzahl → Bundestagswahlkreis(e).
 * Die Tabelle wird von tools/plz-wahlkreis/build.py erzeugt und liegt in der App –
 * die Suche funktioniert deshalb auch offline. Methodik: docs/datenquellen.md
 */
import type { Constituency } from '@/domain/model';

export type PlzDataset = {
  meta: {
    erzeugt: string;
    methode: string;
    quellen: Record<string, string>;
  };
  wahlkreise: Record<string, { name: string; land: string }>;
  plz: Record<string, number[]>;
};

export type PlzLookupResult =
  | { status: 'invalid' }
  | { status: 'unknown'; plz: string }
  | { status: 'ok'; plz: string; constituencies: Constituency[] };

export function normalizePlz(input: string): string {
  return input.replace(/\s+/g, '');
}

export function isValidPlz(plz: string): boolean {
  return /^\d{5}$/.test(plz) && plz !== '00000';
}

export function lookupPlz(input: string, data: PlzDataset): PlzLookupResult {
  const plz = normalizePlz(input);
  if (!isValidPlz(plz)) return { status: 'invalid' };
  const numbers = data.plz[plz];
  if (!numbers?.length) return { status: 'unknown', plz };
  const constituencies = numbers.map((n) => getConstituency(n, data));
  return { status: 'ok', plz, constituencies };
}

export function getConstituency(number: number, data: PlzDataset): Constituency {
  const wk = data.wahlkreise[String(number)];
  return wk ? { number, name: wk.name, state: wk.land } : { number, name: `Wahlkreis ${number}` };
}
