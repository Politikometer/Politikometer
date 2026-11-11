/**
 * SPARQL-Abfragen und Auswertungshilfen für Wikidata (Lizenz CC0 1.0).
 *
 * Abgefragt wird nur beim Entwickeln (Build-Skript `tools/regierung/build.mjs`), nie in der App.
 *
 * Für das Bundeskabinett brauchen wir Aussagen vieler Personen auf einmal (Ämter mit Zeitraum,
 * Geschlecht, Partei). Über die Action-API wären das Dutzende Anfragen; per SPARQL sind es drei
 * kleine Abfragen (je unter 60 KB, unter 1 s). Wikimedia verlangt eine aussagekräftige Kennung
 * (User-Agent, setzt das Build-Skript) und Abfragen unter 60 s.
 *
 * Wichtig: Die Abfragen liefern nur Rohdaten (Aussagen mit Rang und Zeitraum). Was „aktuell“ ist,
 * entscheidet `cabinet.ts` nachvollziehbar und getestet – nicht die Abfrage.
 */
import { z } from 'zod';

const ENTITY_PREFIX = 'http://www.wikidata.org/entity/';

const bindingValue = z.object({
  type: z.string(),
  value: z.string(),
  datatype: z.string().optional(),
  'xml:lang': z.string().optional(),
});

export const sparqlResponseSchema = z.object({
  results: z.object({
    bindings: z.array(z.record(z.string(), bindingValue)),
  }),
});

export type SparqlBinding = Record<string, z.infer<typeof bindingValue>>;

/** „http://www.wikidata.org/entity/Q183“ → „Q183“; andere Werte → null. */
export function entityOf(b: SparqlBinding, key: string): string | null {
  const v = b[key];
  if (!v || v.type !== 'uri' || !v.value.startsWith(ENTITY_PREFIX)) return null;
  return v.value.slice(ENTITY_PREFIX.length);
}

/** Text eines Literals oder null. */
export function literalOf(b: SparqlBinding, key: string): string | null {
  const v = b[key];
  return v && v.type === 'literal' ? v.value : null;
}

/**
 * Datum eines Literals („2025-05-06T00:00:00Z“ → „2025-05-06“).
 * „Unbekannter Wert“ (somevalue) kommt als URI/Blank-Node, nicht als Literal: dann `unknown`.
 */
export function dateOf(b: SparqlBinding, key: string): { date: string | null; unknown: boolean } {
  const v = b[key];
  if (!v) return { date: null, unknown: false };
  if (v.type !== 'literal') return { date: null, unknown: true };
  const match = /^(\d{4}-\d{2}-\d{2})T/.exec(v.value);
  return match ? { date: match[1], unknown: false } : { date: null, unknown: true };
}

export function rankOf(b: SparqlBinding, key = 'rank'): 'preferred' | 'normal' | 'deprecated' {
  const v = b[key]?.value ?? '';
  if (v.endsWith('PreferredRank')) return 'preferred';
  if (v.endsWith('DeprecatedRank')) return 'deprecated';
  return 'normal';
}

/** Nur echte Wikidata-Kennungen in Abfragen einsetzen (kein Einschleusen fremder Abfrageteile). */
function qid(id: string): string {
  if (!/^Q\d+$/.test(id)) throw new Error(`Ungültige Wikidata-Kennung: ${id}`);
  return `wd:${id}`;
}

function isoDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Ungültiges Datum: ${date}`);
  return `"${date}T00:00:00Z"^^xsd:dateTime`;
}

/** Namen, Geschlecht, Ministerium und aktuelle Partei – gleich für beide Personenabfragen. */
const DETAILS = `
  OPTIONAL { ?role rdfs:label ?roleLabel FILTER(LANG(?roleLabel) = "de") }
  OPTIONAL { ?role wdt:P2389 ?ministry . OPTIONAL { ?ministry rdfs:label ?ministryLabel FILTER(LANG(?ministryLabel) = "de") } }
  OPTIONAL { ?person rdfs:label ?personLabel FILTER(LANG(?personLabel) = "de") }
  OPTIONAL { ?person wdt:P21 ?sex }
  OPTIONAL {
    ?person p:P102 ?pst . ?pst ps:P102 ?party ; wikibase:rank ?partyRank .
    FILTER(?partyRank != wikibase:DeprecatedRank)
    FILTER NOT EXISTS { ?pst pq:P582 ?partyEnd }
    OPTIONAL { ?party rdfs:label ?partyLabel FILTER(LANG(?partyLabel) = "de") }
    OPTIONAL { ?party wdt:P1813 ?partyShort FILTER(LANG(?partyShort) = "de") }
  }`;

const DETAIL_VARS =
  '?roleLabel ?ministry ?ministryLabel ?personLabel ?sex ?party ?partyLabel ?partyShort ?partyRank';

/** Alle Kabinette (P31 = Regierungsorgan von Deutschland) mit Beginn (P571) und Ende (P576). */
export function cabinetsQuery(country: string): string {
  return `SELECT ?cabinet ?cabinetLabel ?start ?end WHERE {
  ${qid(country)} wdt:P208 ?gov .
  ?cabinet wdt:P31 ?gov .
  OPTIONAL { ?cabinet wdt:P571 ?start }
  OPTIONAL { ?cabinet wdt:P576 ?end }
  OPTIONAL { ?cabinet rdfs:label ?cabinetLabel FILTER(LANG(?cabinetLabel) = "de") }
}`;
}

/**
 * Mitglieder laut Kabinett-Eintrag („besteht aus“ P527 mit Rolle P3831) und Ämter (P39),
 * die ausdrücklich diesem Kabinett zugeordnet sind (Qualifikator P5054).
 */
export function membershipQuery(cabinet: string): string {
  return `SELECT ?st ?kind ?person ?role ?rank ?start ?end ${DETAIL_VARS} WHERE {
  {
    BIND("kabinett" AS ?kind)
    ${qid(cabinet)} p:P527 ?st . ?st ps:P527 ?person ; pq:P3831 ?role ; wikibase:rank ?rank .
    OPTIONAL { ?st pq:P580 ?start } OPTIONAL { ?st pq:P582 ?end }
  } UNION {
    BIND("amt" AS ?kind)
    ?st pq:P5054 ${qid(cabinet)} . ?person p:P39 ?st . ?st ps:P39 ?role ; wikibase:rank ?rank .
    OPTIONAL { ?st pq:P580 ?start } OPTIONAL { ?st pq:P582 ?end }
  }${DETAILS}
}`;
}

/**
 * Alle Amtsaussagen (P39) zu den genannten Ämtern, die nicht vor Beginn des Kabinetts endeten,
 * mit Vorgänger/Nachfolger, Namen, Geschlecht, Ministerium und aktueller Partei.
 */
export function holdersQuery(roles: string[], cabinet: string, cabinetStart: string): string {
  return `SELECT ?st ?role ?person ?rank ?start ?end ?replaces ?replacedBy ?cab ${DETAIL_VARS} WHERE {
  VALUES ?role { ${roles.map(qid).join(' ')} }
  ?st ps:P39 ?role .
  ?person p:P39 ?st .
  ?st wikibase:rank ?rank .
  OPTIONAL { ?st pq:P580 ?start } OPTIONAL { ?st pq:P582 ?end }
  OPTIONAL { ?st pq:P1365 ?replaces } OPTIONAL { ?st pq:P1366 ?replacedBy }
  OPTIONAL { ?st pq:P5054 ?cab FILTER(?cab = ${qid(cabinet)}) }
  FILTER(!BOUND(?end) || !isLiteral(?end) || ?end >= ${isoDate(cabinetStart)})${DETAILS}
}`;
}
