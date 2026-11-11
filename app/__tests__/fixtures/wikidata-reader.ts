/**
 * Wikidata-Zugriff aus echten, gespeicherten Antworten (Fixtures) – für Tests der Auswertung,
 * die das Build-Skript tools/regierung/build.mjs verwendet. Liegt in fixtures/, damit Jest die
 * Datei nicht als Test ausführt.
 */
import { claimsResponseSchema, labelsResponseSchema } from '@/data/sources/wikidata/schemas';
import type { WikidataReader } from '@/data/sources/wikidata/snapshot';
import { sparqlResponseSchema } from '@/data/sources/wikidata/sparql';

import cduShortName from './wikidata-cdu-p1813.json';
import labels from './wikidata-labels-merz-cdu.json';
import merzParty from './wikidata-merz-p102.json';
import merzSex from './wikidata-merz-p21.json';
import headsOfGovernment from './wikidata-q183-p6.json';
import holders from './wikidata-sparql-kabinett-aemter.json';
import membership from './wikidata-sparql-kabinett-mitglieder.json';
import cabinets from './wikidata-sparql-kabinette.json';

export type FixtureOverrides = { cabinets?: unknown; p6?: unknown };

export type RecordingReader = WikidataReader & { queries: string[]; claims: string[] };

export function fixtureReader(overrides: FixtureOverrides = {}): RecordingReader {
  const queries: string[] = [];
  const claims: string[] = [];
  const claimFixtures: Record<string, unknown> = {
    'Q183/P6': overrides.p6 ?? headsOfGovernment,
    'Q566257/P102': merzParty,
    'Q566257/P21': merzSex,
    'Q49762/P1813': cduShortName,
  };
  return {
    queries,
    claims,
    async select(query) {
      queries.push(query);
      let raw: unknown;
      if (query.includes('wdt:P208')) raw = overrides.cabinets ?? cabinets;
      else if (query.includes('BIND("kabinett"')) raw = membership;
      else if (query.includes('VALUES ?role')) raw = holders;
      else throw new Error(`Unerwartete Abfrage: ${query}`);
      return sparqlResponseSchema.parse(raw).results.bindings;
    },
    async getClaims(entityId, property) {
      const key = `${entityId}/${property}`;
      claims.push(key);
      const raw = claimFixtures[key];
      if (!raw) throw new Error(`Unerwartete Aussage: ${key}`);
      return claimsResponseSchema.parse(raw).claims[property] ?? [];
    },
    async getLabels() {
      return labelsResponseSchema.parse(labels);
    },
  };
}
