import { claimsResponseSchema, labelsResponseSchema, type WdClaim } from '@/data/sources/wikidata/schemas';
import {
  chancellorTitle,
  germanShortName,
  labelOf,
  selectCurrent,
  wdTimeToDate,
} from '@/data/sources/wikidata/mappers';

import cduShortName from './fixtures/wikidata-cdu-p1813.json';
import labels from './fixtures/wikidata-labels-merz-cdu.json';
import merzParty from './fixtures/wikidata-merz-p102.json';
import merzSex from './fixtures/wikidata-merz-p21.json';
import headsOfGovernment from './fixtures/wikidata-q183-p6.json';

const p6 = claimsResponseSchema.parse(headsOfGovernment).claims.P6;

function withRank(claim: WdClaim, rank: WdClaim['rank']): WdClaim {
  return { ...claim, rank };
}

describe('Wikidata-Schemas und -Auswertung', () => {
  it('liest echte Antworten von wbgetclaims und wbgetentities', () => {
    expect(p6.length).toBe(3);
    expect(claimsResponseSchema.parse(merzParty).claims.P102).toHaveLength(1);
    expect(labelOf(labelsResponseSchema.parse(labels), 'Q566257')).toBe('Friedrich Merz');
  });

  it('findet den amtierenden Regierungschef: Aussage ohne Endzeitpunkt', () => {
    expect(selectCurrent(p6, '2026-10-30')).toEqual([{ entityId: 'Q566257', since: '2025-05-06' }]);
  });

  it('berücksichtigt den Stichtag (vor dem Amtswechsel)', () => {
    expect(selectCurrent(p6, '2024-01-01')).toEqual([{ entityId: 'Q61053', since: '2021-12-08' }]);
  });

  it('ignoriert als veraltet markierte Aussagen', () => {
    const claims = p6.map((c, i) => (i === 2 ? withRank(c, 'deprecated') : c));
    expect(selectCurrent(claims, '2026-10-30')).toEqual([]);
  });

  it('rät nicht: zwei offene Aussagen ohne Vorrang bleiben zwei', () => {
    const open = withRank(p6[2], 'normal');
    const other = { ...open, mainsnak: { ...open.mainsnak, datavalue: { type: 'wikibase-entityid', value: { id: 'Q1' } } } };
    expect(selectCurrent([open, other], '2026-10-30')).toHaveLength(2);
    // Mit Vorrang („bevorzugt“) ist es eindeutig.
    expect(selectCurrent([withRank(open, 'preferred'), other], '2026-10-30')).toHaveLength(1);
  });

  it('gibt nur taggenaue Daten aus', () => {
    const party = claimsResponseSchema.parse(merzParty).claims.P102[0];
    // Parteieintritt „1972“ ist nur jahresgenau → kein erfundenes Tagesdatum.
    expect(wdTimeToDate(party.qualifiers?.P580?.[0])).toBeNull();
    expect(wdTimeToDate(p6[2].qualifiers?.P580?.[0])).toBe('2025-05-06');
  });

  it('liest Kurzname der Partei und passende Amtsbezeichnung', () => {
    expect(germanShortName(claimsResponseSchema.parse(cduShortName).claims.P1813)).toBe('CDU');
    expect(chancellorTitle(claimsResponseSchema.parse(merzSex).claims.P21)).toBe('Bundeskanzler');
    const female = claimsResponseSchema.parse(merzSex).claims.P21.map((c) => ({
      ...c,
      mainsnak: { ...c.mainsnak, datavalue: { type: 'wikibase-entityid', value: { id: 'Q6581072' } } },
    }));
    expect(chancellorTitle(female)).toBe('Bundeskanzlerin');
  });
});
