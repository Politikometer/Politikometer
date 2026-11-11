/**
 * Zugriff auf die DIP-API des Deutschen Bundestages (nur lesend).
 * - Pro Antwort höchstens 100 Einträge, sortiert absteigend nach Datum und ID.
 *   Weitere Einträge über `cursor`; ändert sich der cursor nicht mehr, ist alles geladen.
 * - Laut Kurzdokumentation nicht mehr als 25 gleichzeitige Anfragen; ein Rate-Limit wird
 *   nicht beziffert. Wir drosseln deutlich darunter und cachen.
 * Doku: https://search.dip.bundestag.de/api/v1/openapi.yaml
 */
import { z } from 'zod';

import { fetchJson, type FetchJsonOptions } from '@/data/http/fetch-json';
import { RateLimiter } from '@/data/http/rate-limiter';

import { DIP_API_KEY, DIP_API_URL } from './config';
import {
  aktivitaetSchema,
  listResponse,
  personSchema,
  plenarprotokollSchema,
  vorgangDetailSchema,
  vorgangSchema,
  vorgangspositionSchema,
  type DipAktivitaet,
  type DipList,
  type DipPerson,
  type DipPlenarprotokoll,
  type DipVorgang,
  type DipVorgangDetail,
  type DipVorgangsposition,
} from './schemas';

/** Konservativ: höchstens 15 Anfragen pro Minute an DIP aus dieser App. */
export const dipLimiter = new RateLimiter(15, 60_000);

type Params = [string, string][];

export class DipClient {
  constructor(private readonly http: FetchJsonOptions = { limiter: dipLimiter }) {}

  private async list<T>(path: string, params: Params, item: z.ZodType<T>): Promise<DipList<T>> {
    const query = new URLSearchParams(params).toString();
    const url = `${DIP_API_URL}/${path}${query ? `?${query}` : ''}`;
    const json = await fetchJson(url, {
      ...this.http,
      headers: { Authorization: `ApiKey ${DIP_API_KEY}`, ...this.http.headers },
    });
    return listResponse(item).parse(json) as DipList<T>;
  }

  private async entity<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    const json = await fetchJson(`${DIP_API_URL}/${path}`, {
      ...this.http,
      headers: { Authorization: `ApiKey ${DIP_API_KEY}`, ...this.http.headers },
    });
    return schema.parse(json) as T;
  }

  /** Ein einzelner Vorgang mit allen Metadaten (Zusammenfassung, Verkündung, …). */
  getProceeding(id: string): Promise<DipVorgangDetail> {
    return this.entity(`vorgang/${encodeURIComponent(id)}`, vorgangDetailSchema);
  }

  /** Alle Schritte (Vorgangspositionen) eines Vorgangs. Reihenfolge der Quelle ist nicht chronologisch. */
  getPositionsOfProceeding(vorgangId: string, cursor?: string | null): Promise<DipList<DipVorgangsposition>> {
    const params: Params = [['f.vorgang', vorgangId]];
    if (cursor) params.push(['cursor', cursor]);
    return this.list('vorgangsposition', params, vorgangspositionSchema);
  }

  /**
   * Vorgänge eines Typs mit mindestens einem Dokument im Zeitraum (beide Daten einschließlich).
   * Laut OpenAPI zählt bei Vorgängen der Datumsbereich aller zugehörigen Dokumente –
   * nicht nur das Feld `datum` (= Datum des letzten Dokuments).
   */
  getProceedingsInRange(opts: {
    type: string;
    start: string;
    end: string;
    cursor?: string | null;
  }): Promise<DipList<DipVorgang>> {
    const params: Params = [
      ['f.vorgangstyp', opts.type],
      ['f.datum.start', opts.start],
      ['f.datum.end', opts.end],
    ];
    if (opts.cursor) params.push(['cursor', opts.cursor]);
    return this.list('vorgang', params, vorgangSchema);
  }

  /** Vorgangsschritte eines Vorgangstyps, deren Dokument im Zeitraum datiert ist. */
  getPositionsInRange(opts: {
    type: string;
    start: string;
    end: string;
    cursor?: string | null;
  }): Promise<DipList<DipVorgangsposition>> {
    const params: Params = [
      ['f.vorgangstyp', opts.type],
      ['f.datum.start', opts.start],
      ['f.datum.end', opts.end],
    ];
    if (opts.cursor) params.push(['cursor', opts.cursor]);
    return this.list('vorgangsposition', params, vorgangspositionSchema);
  }

  /** Plenarprotokolle von Bundestag und Bundesrat ab `start`, neueste zuerst. */
  getPlenaryProtocols(opts: { start: string; end?: string | null; cursor?: string | null }): Promise<
    DipList<DipPlenarprotokoll>
  > {
    const params: Params = [['f.datum.start', opts.start]];
    if (opts.end) params.push(['f.datum.end', opts.end]);
    if (opts.cursor) params.push(['cursor', opts.cursor]);
    return this.list('plenarprotokoll', params, plenarprotokollSchema);
  }

  /** Personen, deren Vor- oder Nachname den Suchbegriff enthält. */
  searchPersons(name: string): Promise<DipList<DipPerson>> {
    return this.list('person', [['f.person', name]], personSchema);
  }

  /** Aktivitäten einer Person (Reden, Antworten, …), neueste zuerst. */
  getActivitiesOfPerson(
    personId: string,
    opts: { since?: string | null; cursor?: string | null } = {},
  ): Promise<DipList<DipAktivitaet>> {
    const params: Params = [['f.person_id', personId]];
    if (opts.since) params.push(['f.datum.start', opts.since]);
    if (opts.cursor) params.push(['cursor', opts.cursor]);
    return this.list('aktivitaet', params, aktivitaetSchema);
  }

  /** Vorgänge nach amtlicher Initiative und Vorgangstyp, neueste zuerst. */
  getProceedings(opts: {
    initiative: string;
    type: string;
    since?: string | null;
    cursor?: string | null;
  }): Promise<DipList<DipVorgang>> {
    const params: Params = [
      ['f.initiative', opts.initiative],
      ['f.vorgangstyp', opts.type],
    ];
    if (opts.since) params.push(['f.datum.start', opts.since]);
    if (opts.cursor) params.push(['cursor', opts.cursor]);
    return this.list('vorgang', params, vorgangSchema);
  }
}
