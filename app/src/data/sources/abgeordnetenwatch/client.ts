/**
 * Zugriff auf die abgeordnetenwatch.de API v2.
 * Lizenz der Daten: CC0 1.0. Rate-Limit: 30 Anfragen/Minute pro IP – wir bleiben darunter.
 */
import { z } from 'zod';

import { fetchJson, type FetchJsonOptions } from '@/data/http/fetch-json';
import { RateLimiter } from '@/data/http/rate-limiter';

import {
  entityResponse,
  listResponse,
  mandateSchema,
  parliamentPeriodSchema,
  parliamentSchema,
  politicianSchema,
  pollSchema,
  voteSchema,
  type AwEnvelope,
  type AwMandate,
  type AwParliament,
  type AwParliamentPeriod,
  type AwPolitician,
  type AwPoll,
  type AwVote,
} from './schemas';

export const BASE_URL = 'https://www.abgeordnetenwatch.de/api/v2';
export const BUNDESTAG_ID = 5;

/** Gemeinsamer Limiter für alle Anfragen an abgeordnetenwatch aus dieser App. */
export const awLimiter = new RateLimiter(20, 60_000);

export type AwResult<T> = {
  data: T;
  license: string | null;
  /** Gesamtzahl der Treffer bei Listen (aus meta.result.total), sonst null. */
  total?: number | null;
};

/** Größte Seite, die wir anfordern. Die API lieferte 630 Mandate mit range_end=1000 in einer Antwort. */
export const PAGE_SIZE = 1000;
/** Obergrenze gegen Endlosschleifen bei fehlerhaften Gesamtzahlen. */
const MAX_PAGES = 3;
/** Personen-IDs pro Anfrage (630 IDs ergeben eine URL von rund 4.300 Zeichen). */
const POLITICIANS_PER_REQUEST = 700;
const LARGE_LIST_TIMEOUT_MS = 45_000;

export class AbgeordnetenwatchClient {
  constructor(private readonly http: FetchJsonOptions = { limiter: awLimiter }) {}

  private async get<D>(
    path: string,
    params: Record<string, string | number>,
    schema: z.ZodType<AwEnvelope<D>>,
    overrides: Partial<FetchJsonOptions> = {},
  ): Promise<AwResult<D>> {
    const query = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ).toString();
    const url = `${BASE_URL}/${path}${query ? `?${query}` : ''}`;
    const json = await fetchJson(url, { ...this.http, ...overrides });
    const parsed = schema.parse(json);
    if (parsed.meta.status !== 'ok') {
      throw new Error(`abgeordnetenwatch: ${parsed.meta.status_message ?? 'Fehler'}`);
    }
    return {
      data: parsed.data,
      license: parsed.meta.abgeordnetenwatch_api?.licence ?? null,
      total: parsed.meta.result?.total ?? null,
    };
  }

  getParliament(id: number): Promise<AwResult<AwParliament>> {
    return this.get(`parliaments/${id}`, {}, entityResponse(parliamentSchema));
  }

  /** Alle aktuellen Mandate, deren Wahlkreis die angegebene Nummer hat. */
  getMandatesByConstituency(periodId: number, constituencyNumber: number): Promise<AwResult<AwMandate[]>> {
    return this.get(
      'candidacies-mandates',
      {
        parliament_period: periodId,
        type: 'mandate',
        constituency_nr: constituencyNumber,
        range_end: 100,
      },
      listResponse(mandateSchema),
    );
  }

  /**
   * Alle Mandate einer Wahlperiode. Meist genügt eine Anfrage; weitere Seiten
   * nur, falls die API weniger liefert als meta.result.total angibt.
   */
  async getMandatesOfPeriod(periodId: number): Promise<AwResult<AwMandate[]>> {
    const all: AwMandate[] = [];
    let license: string | null = null;
    let total: number | null = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await this.get(
        'candidacies-mandates',
        {
          parliament_period: periodId,
          type: 'mandate',
          sort_by: 'id',
          sort_direction: 'asc',
          range_start: all.length,
          range_end: PAGE_SIZE,
        },
        listResponse(mandateSchema),
        // Rund 1 MB; die API brauchte im Test 8–10 s. Mehr Zeit statt Abbruch und Neuversuch.
        { timeoutMs: LARGE_LIST_TIMEOUT_MS },
      );
      all.push(...res.data);
      license = license ?? res.license;
      total = res.total ?? null;
      if (res.data.length === 0 || total === null || all.length >= total) break;
    }
    return { data: all, license, total };
  }

  getMandatesOfPolitician(periodId: number, politicianId: number): Promise<AwResult<AwMandate[]>> {
    return this.get(
      'candidacies-mandates',
      { parliament_period: periodId, type: 'mandate', politician: politicianId },
      listResponse(mandateSchema),
    );
  }

  getParliamentPeriod(id: number): Promise<AwResult<AwParliamentPeriod>> {
    return this.get(`parliament-periods/${id}`, {}, entityResponse(parliamentPeriodSchema));
  }

  /** Alle Kandidaturen in einem Wahlkreis (Wahl-Periode, z. B. „Bundestag Wahl 2025“). */
  getCandidaciesByConstituency(periodId: number, constituencyNumber: number): Promise<AwResult<AwMandate[]>> {
    return this.get(
      'candidacies-mandates',
      { parliament_period: periodId, type: 'candidacy', constituency_nr: constituencyNumber, range_end: 100 },
      listResponse(mandateSchema),
    );
  }

  /** Alle namentlichen Abstimmungen einer Wahlperiode. */
  getPolls(periodId: number): Promise<AwResult<AwPoll[]>> {
    return this.get(
      'polls',
      { field_legislature: periodId, range_end: 1000, sort_by: 'field_poll_date', sort_direction: 'desc' },
      listResponse(pollSchema),
    );
  }

  getPoll(id: number): Promise<AwResult<AwPoll>> {
    return this.get(`polls/${id}`, {}, entityResponse(pollSchema));
  }

  getVotesOfMandate(mandateId: number): Promise<AwResult<AwVote[]>> {
    return this.get('votes', { mandate: mandateId, range_end: 1000 }, listResponse(voteSchema));
  }

  getVotesOfPoll(pollId: number): Promise<AwResult<AwVote[]>> {
    return this.get('votes', { poll: pollId, range_end: 1000 }, listResponse(voteSchema));
  }

  getPolitician(id: number): Promise<AwResult<AwPolitician>> {
    return this.get(`politicians/${id}`, {}, entityResponse(politicianSchema));
  }

  /** Mehrere Personen in einer Anfrage (bei sehr vielen IDs in wenigen Anfragen nacheinander). */
  async getPoliticians(ids: number[]): Promise<AwResult<AwPolitician[]>> {
    if (ids.length === 0) return { data: [], license: null };
    const data: AwPolitician[] = [];
    let license: string | null = null;
    for (let i = 0; i < ids.length; i += POLITICIANS_PER_REQUEST) {
      const chunk = ids.slice(i, i + POLITICIANS_PER_REQUEST);
      const res = await this.get(
        'politicians',
        { 'id[in]': `[${chunk.join(',')}]`, range_end: chunk.length },
        listResponse(politicianSchema),
      );
      data.push(...res.data);
      license = license ?? res.license;
    }
    return { data, license };
  }
}
