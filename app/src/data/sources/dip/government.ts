/**
 * DIP-Abfragen für Regierungsmitglieder (Ergänzung zu client.ts, ohne dessen Exporte zu ändern).
 *
 * - DIP führt eine Person oft mehrfach: je Regierungsamt („Bundesmin.“ mit Ressort) und als
 *   Abgeordnete/r („MdB“). Aktivitäten als Ministerin oder Minister hängen teils am MdB-Eintrag
 *   (geprüft 31.10.2026: Hubertz, Schnieder). Wir fragen deshalb alle Einträge derselben Person
 *   gemeinsam ab (`f.person_id` mehrfach = ODER-Suche laut OpenAPI). Zeiträume enthalten die
 *   Einträge nicht; den Zeitraum begrenzt der Amtsantritt laut Wikidata.
 * - Vorgänge lassen sich nach federführendem Ressort filtern (`f.ressort_fdf`, OpenAPI 1.5).
 */
import { z } from 'zod';

import { fetchJson, type FetchJsonOptions } from '@/data/http/fetch-json';

import { dipLimiter } from './client';
import { DIP_API_KEY, DIP_API_URL } from './config';
import {
  aktivitaetSchema,
  listResponse,
  personSchema,
  vorgangSchema,
  type DipAktivitaet,
  type DipList,
  type DipVorgang,
} from './schemas';

const stringOrList = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v : [v]));

/** Person mit Ressort (fehlt in `personSchema`, das andere Teile der App nutzen). */
export const governmentPersonSchema = personSchema.extend({ ressort: stringOrList.nullish() });
export type DipGovernmentPersonRaw = z.infer<typeof governmentPersonSchema>;

type Params = [string, string][];

function toQuery(params: Params): string {
  // encodeURIComponent statt URLSearchParams: in React Native nur teilweise umgesetzt.
  return params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

export class DipGovernmentClient {
  constructor(private readonly http: FetchJsonOptions = { limiter: dipLimiter }) {}

  private async list<T>(path: string, params: Params, item: z.ZodType<T>): Promise<DipList<T>> {
    const json = await fetchJson(`${DIP_API_URL}/${path}?${toQuery(params)}`, {
      ...this.http,
      headers: { Authorization: `ApiKey ${DIP_API_KEY}`, ...this.http.headers },
    });
    return listResponse(item).parse(json) as DipList<T>;
  }

  /** Personen, deren Vor- oder Nachname den Suchbegriff enthält – mit Funktion und Ressort. */
  searchPersons(name: string): Promise<DipList<DipGovernmentPersonRaw>> {
    return this.list('person', [['f.person', name]], governmentPersonSchema);
  }

  /**
   * Personen zu mehreren Suchbegriffen auf einmal (`f.person` mehrfach = ODER, live geprüft
   * 05.11.2026). Folgt dem cursor, bis alle Treffer da sind (höchstens `maxPages` Seiten).
   */
  async searchPersonsAny(names: string[], maxPages = 5): Promise<DipList<DipGovernmentPersonRaw>> {
    const params: Params = [...new Set(names)].sort().map((n) => ['f.person', n]);
    let page = await this.list('person', params, governmentPersonSchema);
    const documents = [...page.documents];
    for (let i = 1; i < maxPages && documents.length < page.numFound && page.cursor; i++) {
      const cursor = page.cursor;
      page = await this.list('person', [...params, ['cursor', cursor]], governmentPersonSchema);
      if (page.documents.length === 0 || page.cursor === cursor) break;
      documents.push(...page.documents);
    }
    return { ...page, documents };
  }

  /** Gesetzgebungsvorgänge der Bundesregierung mit diesem federführenden Ressort, neueste zuerst. */
  getProceedingsOfRessort(opts: {
    ressort: string;
    initiative: string;
    type: string;
    since?: string | null;
    cursor?: string | null;
  }): Promise<DipList<DipVorgang>> {
    const params: Params = [
      ['f.initiative', opts.initiative],
      ['f.vorgangstyp', opts.type],
      ['f.ressort_fdf', opts.ressort],
    ];
    if (opts.since) params.push(['f.datum.start', opts.since]);
    if (opts.cursor) params.push(['cursor', opts.cursor]);
    return this.list('vorgang', params, vorgangSchema);
  }

  /** Aktivitäten mehrerer DIP-Personeneinträge (ODER), neueste zuerst. */
  getActivitiesOfPersons(
    personIds: string[],
    opts: { since?: string | null; cursor?: string | null } = {},
  ): Promise<DipList<DipAktivitaet>> {
    const params: Params = personIds.map((id) => ['f.person_id', id]);
    if (opts.since) params.push(['f.datum.start', opts.since]);
    if (opts.cursor) params.push(['cursor', opts.cursor]);
    return this.list('aktivitaet', params, aktivitaetSchema);
  }
}

function tokens(text: string | null | undefined): string[] {
  return (text ?? '')
    .toLocaleLowerCase('de')
    .replace(/[-‐]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Gleiche Person? Nachname (mit Namenszusatz) muss das Ende des Namens sein, und alle übrigen
 * Namensteile müssen unter den Vornamen in DIP vorkommen
 * („Johann Wadephul“ ↔ DIP „Johann David“ + „Wadephul“; „Reem Alabali Radovan“ ↔ „Reem“ + „Alabali Radovan“).
 */
export function sameName(p: DipGovernmentPersonRaw, name: string): boolean {
  const wanted = tokens(name);
  const last = tokens([p.namenszusatz, p.nachname].filter(Boolean).join(' '));
  if (last.length === 0 || wanted.length <= last.length) return false;
  const tail = wanted.slice(-last.length);
  if (tail.join(' ') !== last.join(' ')) return false;
  const first = new Set(tokens(p.vorname));
  return wanted.slice(0, -last.length).every((t) => first.has(t));
}

/** Funktionen im Bund, unter denen ein Regierungsmitglied in DIP geführt wird. */
const FEDERAL_FUNCTION = /^(bundesmin|bundeskanzl|mdb$|parl\. staatssekr|staatsmin)/i;
/** Regierungsfunktionen in DIP (echte Werte, 05.11.2026): „Bundeskanzl.“, „Bundesmin.“,
 *  „Bundesmin. f. besondere Aufgaben“ (Chef des Bundeskanzleramtes), „Staatsmin.“. */
const GOVERNMENT_FUNCTION = /^(bundesmin|bundeskanzl|staatsmin)/i;

function hasFunction(p: DipGovernmentPersonRaw, pattern: RegExp): boolean {
  return (p.funktion ?? []).some((f) => pattern.test(f.trim()));
}

/**
 * - `chancellor`: DIP muss „Bundeskanzl.“ führen.
 * - `minister`: DIP muss „Bundesmin.“ (auch „Bundesmin. f. besondere Aufgaben …“) führen;
 *   bei `staatsminister: true` (Amt laut Wikidata „Staatsminister/in …“) stattdessen „Staatsmin.“.
 */
export type GovernmentRole = { kind: 'chancellor' } | { kind: 'minister'; staatsminister?: boolean };

function requiredFunction(role: GovernmentRole): RegExp {
  if (role.kind === 'chancellor') return /^bundeskanzl/i;
  return role.staatsminister ? /^staatsmin/i : /^bundesmin/i;
}

/** Erster Vorname, vereinheitlicht („Johann David“ → „johann“). */
function firstGivenName(p: DipGovernmentPersonRaw): string | null {
  return tokens(p.vorname)[0] ?? null;
}

/**
 * Alle DIP-Einträge dieser Person – nur, wenn kein Zweifel besteht; sonst leer (die aufrufende
 * Stelle zeigt dann „keine eindeutige Angabe“ statt zu raten).
 *
 * DIP führt eine Person oft mehrfach (je Regierungsamt und als Abgeordnete/r), aber auch
 * verschiedene Personen gleichen Namens (echtes Beispiel: „Alois Rainer“, MdB 1965–1983, und
 * „Alois Rainer“, Bundesminister seit 2025). Zusammengeführt wird deshalb nur, wenn
 * 1. Name und eine Funktion im Bund passen,
 * 2. der Eintrag in der aktuellen Wahlperiode geführt wird (`currentPeriod`, sonst die jüngste
 *    Wahlperiode der Treffer) – ältere Einträge gleichen Namens bleiben außen vor,
 * 3. alle Einträge denselben ersten Vornamen haben,
 * 4. höchstens ein Eintrag ohne Regierungsfunktion (z. B. „MdB“) dabei ist,
 * 5. ein Eintrag die zur Rolle passende Regierungsfunktion führt (siehe `GovernmentRole`).
 *    Ohne diese Bestätigung zeigen wir die Person nicht als Regierungsmitglied an – auch wenn
 *    Wikidata sie nennt (Wikidata ist frei editierbar).
 */
export function matchGovernmentPerson(
  persons: DipGovernmentPersonRaw[],
  name: string,
  role: GovernmentRole,
  currentPeriod?: number | null,
): DipGovernmentPersonRaw[] {
  const same = persons.filter((p) => sameName(p, name) && hasFunction(p, FEDERAL_FUNCTION));
  const periods = same.flatMap((p) => p.wahlperiode ?? []);
  const period = currentPeriod ?? (periods.length ? Math.max(...periods) : null);
  if (period === null) return [];
  const current = same.filter((p) => (p.wahlperiode ?? []).includes(period));
  if (current.length === 0) return [];
  // Verschiedene Vornamen: möglicherweise verschiedene Personen.
  if (new Set(current.map(firstGivenName)).size !== 1) return [];
  // Mehrere Abgeordnete gleichen Namens: nicht unterscheidbar.
  if (current.filter((p) => !hasFunction(p, GOVERNMENT_FUNCTION)).length > 1) return [];
  if (!current.some((p) => hasFunction(p, requiredFunction(role)))) return [];
  return current;
}

/** Jüngste Wahlperiode in einer DIP-Personenliste (Näherung für die laufende Wahlperiode). */
export function latestPeriod(persons: DipGovernmentPersonRaw[]): number | null {
  const all = persons.flatMap((p) => p.wahlperiode ?? []);
  return all.length ? Math.max(...all) : null;
}
