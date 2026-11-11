/**
 * Gesetzgebung: setzt DIP (Vorgänge, Schritte, Plenarprotokolle) und abgeordnetenwatch
 * (namentliche Abstimmungen) zum internen Datenmodell zusammen.
 *
 * Wenige Anfragen: Ein Gesetz = 2 DIP-Anfragen (Vorgang + Schritte, bei sehr langen
 * Vorgängen weitere Seiten). Wochenüberblick = 1 Anfrage für Plenarprotokolle, je 1–3 für
 * Vorgänge und Schritte im Zeitraum. Abstimmungen = 2 Anfragen an abgeordnetenwatch.
 */
import {
  groupByStatus,
  localIsoDate,
  addDays,
  weekWindow,
  inWindow,
  drucksacheFromUrl,
  type Legislation,
  type PollSummary,
  type WeekOverview,
} from '@/domain/legislation';
import { BundestagRepository } from '@/data/repositories/bundestag-repository';
import { AbgeordnetenwatchClient } from '@/data/sources/abgeordnetenwatch/client';
import { mapPoll } from '@/data/sources/abgeordnetenwatch/mappers';
import { DipClient } from '@/data/sources/dip/client';
import { DIP_LICENSE, DIP_PORTAL_URL, DIP_PUBLISHER } from '@/data/sources/dip/config';
import {
  mapLegislation,
  mapPlenarySession,
  mapWeekProceedings,
  nextCursor,
} from '@/data/sources/dip/mappers';
import type { DipList } from '@/data/sources/dip/schemas';

/** Amtlicher Vorgangstyp in DIP. */
export const LEGISLATION_TYPE = 'Gesetzgebung';
/** Wie weit wir nach der letzten Bundestagssitzung zurückschauen (sitzungsfreie Zeit im Sommer ≈ 8 Wochen). */
export const SESSION_LOOKBACK_DAYS = 120;
/** Obergrenze je Liste (DIP liefert 100 je Seite). */
export const MAX_PAGES = { steps: 5, weekProceedings: 3, weekSteps: 5 } as const;

/** Alle Seiten einer DIP-Liste bis zur Obergrenze. */
export async function fetchPages<T>(
  load: (cursor: string | null) => Promise<DipList<T>>,
  maxPages: number,
): Promise<{ documents: T[]; total: number; complete: boolean }> {
  const documents: T[] = [];
  let cursor: string | null = null;
  let total = 0;
  for (let page = 0; page < maxPages; page++) {
    const res = await load(cursor);
    documents.push(...res.documents);
    total = res.numFound;
    const next = nextCursor(res, cursor);
    if (!next || documents.length >= total) return { documents, total, complete: true };
    cursor = next;
  }
  return { documents, total, complete: documents.length >= total };
}

export class LegislationRepository {
  constructor(
    private readonly dip: DipClient = new DipClient(),
    private readonly aw: AbgeordnetenwatchClient = new AbgeordnetenwatchClient(),
    private readonly now: () => Date = () => new Date(),
    private readonly bundestag: BundestagRepository = new BundestagRepository(aw, now),
  ) {}

  /** Ein Gesetzgebungsvorgang mit allen Schritten, chronologisch. */
  async getLegislation(id: string): Promise<Legislation> {
    const retrievedAt = this.now().toISOString();
    const [vorgang, positions] = await Promise.all([
      this.dip.getProceeding(id),
      fetchPages((cursor) => this.dip.getPositionsOfProceeding(id, cursor), MAX_PAGES.steps),
    ]);
    const missing = Math.max(0, positions.total - positions.documents.length);
    return mapLegislation(vorgang, positions.documents, missing, retrievedAt);
  }

  /** Alle namentlichen Abstimmungen der laufenden Wahlperiode (kompakt, für Verknüpfungen). */
  async getTermPolls(): Promise<{ polls: PollSummary[]; termLabel: string; retrievedAt: string }> {
    const retrievedAt = this.now().toISOString();
    const term = await this.bundestag.getCurrentTerm();
    const res = await this.aw.getPolls(term.id);
    const polls = res.data.map((p) => {
      const poll = mapPoll(p, retrievedAt, res.license);
      const drucksachen = poll.documents
        .map((d) => drucksacheFromUrl(d.url))
        .filter((d): d is string => !!d);
      return {
        id: poll.id,
        title: poll.title,
        date: poll.date,
        accepted: poll.accepted,
        drucksachen: [...new Set(drucksachen)],
        source: poll.source,
      };
    });
    return { polls, termLabel: term.label, retrievedAt };
  }

  /** Plenarsitzungen und Gesetzgebung der letzten Sitzungswoche (siehe `weekWindow`). */
  async getWeek(): Promise<WeekOverview> {
    const now = this.now();
    const retrievedAt = now.toISOString();
    const today = localIsoDate(now);

    const protocols = await fetchPages(
      (cursor) => this.dip.getPlenaryProtocols({ start: addDays(today, -SESSION_LOOKBACK_DAYS), cursor }),
      2,
    );
    const window = weekWindow(
      today,
      protocols.documents.filter((p) => p.herausgeber === 'BT').map((p) => p.datum),
    );

    const range = { type: LEGISLATION_TYPE, start: window.start, end: window.end };
    const [vorgaenge, positions] = await Promise.all([
      fetchPages((cursor) => this.dip.getProceedingsInRange({ ...range, cursor }), MAX_PAGES.weekProceedings),
      fetchPages((cursor) => this.dip.getPositionsInRange({ ...range, cursor }), MAX_PAGES.weekSteps),
    ]);

    const sessions = protocols.documents
      .filter((p) => inWindow(p.datum, window))
      .map((p) => mapPlenarySession(p, retrievedAt))
      .sort((a, b) => a.date.localeCompare(b.date) || (a.body ?? '').localeCompare(b.body ?? '', 'de'));

    const proceedings = mapWeekProceedings(
      vorgaenge.documents,
      positions.documents.filter((p) => inWindow(p.datum, window)),
      retrievedAt,
    );

    return {
      window,
      sessions,
      legislationGroups: groupByStatus(proceedings),
      legislationTotal: vorgaenge.total,
      truncated: !vorgaenge.complete,
      stepsTruncated: !positions.complete,
      retrievedAt,
      source: { publisher: DIP_PUBLISHER, url: DIP_PORTAL_URL, license: DIP_LICENSE, retrievedAt },
    };
  }
}
