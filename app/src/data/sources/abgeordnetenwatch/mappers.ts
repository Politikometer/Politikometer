/** Übersetzt abgeordnetenwatch-Daten ins interne Datenmodell. */
import type {
  Candidacy,
  Constituency,
  HowElected,
  Mandate,
  MemberListEntry,
  Politician,
  Poll,
  SourceRef,
  VoteChoice,
  VoteCounts,
} from '@/domain/model';

import { extractOfficialLinks, htmlToText } from './html';
import type { AwMandate, AwPolitician, AwPoll, AwVote } from './schemas';

export const PUBLISHER = 'abgeordnetenwatch.de';
const FALLBACK_URL = 'https://www.abgeordnetenwatch.de';

export function sourceRef(url: string | null | undefined, retrievedAt: string, license?: string | null): SourceRef {
  return {
    publisher: PUBLISHER,
    url: url || FALLBACK_URL,
    license: license || 'CC0 1.0',
    retrievedAt,
  };
}

/** Entfernt den Zusatz in Klammern: „SPD (Bundestag 2025 - 2029)“ → „SPD“. */
export function stripPeriodSuffix(label: string): string {
  return label.replace(/\s*\([^()]*\)\s*$/, '').trim();
}

/** „192 - Erfurt – Weimar (Bundestag 2025 - 2029)“ → { number: 192, name: „Erfurt – Weimar“ } */
export function parseConstituencyLabel(label: string): Constituency | null {
  const match = /^\s*(\d+)\s*-\s*(.+)$/.exec(stripPeriodSuffix(label));
  if (!match) return null;
  return { number: Number(match[1]), name: match[2].trim() };
}

export function mapHowElected(value: string | null | undefined): HowElected {
  switch (value) {
    case 'constituency':
      return 'direct';
    case 'list':
      return 'list';
    case 'moved_up':
      return 'moved_up';
    default:
      return 'unknown';
  }
}

/** Die aktuell gültige Fraktion (ohne Enddatum), sonst die zuletzt begonnene. */
export function currentFraction(memberships: AwMandate['fraction_membership']): string | null {
  if (!memberships?.length) return null;
  const open = memberships.find((m) => !m.valid_until);
  const chosen =
    open ??
    [...memberships].sort((a, b) => (b.valid_from ?? '').localeCompare(a.valid_from ?? ''))[0];
  return stripPeriodSuffix(chosen.fraction.label);
}

export function mapMandate(m: AwMandate, retrievedAt: string, license?: string | null): Mandate {
  const ed = m.electoral_data;
  return {
    id: m.id,
    politicianId: m.politician.id,
    politicianName: m.politician.label,
    parliament: 'Bundestag',
    termLabel: m.parliament_period.label,
    fraction: currentFraction(m.fraction_membership),
    howElected: mapHowElected(ed?.mandate_won),
    constituency: ed?.constituency ? parseConstituencyLabel(ed.constituency.label) : null,
    electoralList: ed?.electoral_list ? stripPeriodSuffix(ed.electoral_list.label) : null,
    listPosition: ed?.list_position ?? null,
    start: m.start_date ?? null,
    end: m.end_date ?? null,
    note: m.info?.trim() || null,
    source: sourceRef(m.politician.abgeordnetenwatch_url, retrievedAt, license),
  };
}

export function mapCandidacy(m: AwMandate, retrievedAt: string, license?: string | null): Candidacy {
  const ed = m.electoral_data;
  return {
    id: m.id,
    politicianId: m.politician.id,
    name: m.politician.label,
    lastName: m.politician.label,
    party: m.party ? m.party.label : null,
    electionLabel: m.parliament_period.label,
    constituency: ed?.constituency ? parseConstituencyLabel(ed.constituency.label) : null,
    electoralList: ed?.electoral_list ? stripPeriodSuffix(ed.electoral_list.label) : null,
    listPosition: ed?.list_position ?? null,
    source: sourceRef(m.politician.abgeordnetenwatch_url, retrievedAt, license),
  };
}

export function mapPoll(p: AwPoll, retrievedAt: string, license?: string | null): Poll {
  return {
    id: p.id,
    title: p.label,
    date: p.field_poll_date ?? null,
    accepted: p.field_accepted ?? null,
    topics: (p.field_topics ?? []).map((t) => t.label),
    description: htmlToText(p.field_intro),
    documents: extractOfficialLinks(p.field_intro),
    source: sourceRef(p.abgeordnetenwatch_url, retrievedAt, license),
  };
}

export function mapVoteChoice(value: string): VoteChoice {
  switch (value) {
    case 'yes':
    case 'no':
    case 'abstain':
      return value;
    default:
      return 'no_show';
  }
}

const NO_SHOW_REASONS: Record<string, string> = {
  maternity_protection: 'Mutterschutz',
  parental_leave: 'Elternzeit',
  sick: 'Krankheit',
  illness: 'Krankheit',
};

export function mapReasonNoShow(v: AwVote): string | null {
  if (v.reason_no_show_other?.trim()) return v.reason_no_show_other.trim();
  if (!v.reason_no_show) return null;
  return NO_SHOW_REASONS[v.reason_no_show] ?? 'Grund angegeben';
}

export function emptyCounts(): VoteCounts {
  return { yes: 0, no: 0, abstain: 0, no_show: 0 };
}

/** Zählt die Stimmen gesamt und je Fraktion. Fraktionen alphabetisch, „fraktionslos“ zuletzt. */
export function countVotes(votes: AwVote[]): {
  totals: VoteCounts;
  byFraction: { fraction: string; counts: VoteCounts }[];
} {
  const totals = emptyCounts();
  const fractions = new Map<string, VoteCounts>();
  for (const v of votes) {
    const choice = mapVoteChoice(v.vote);
    totals[choice] += 1;
    const name = v.fraction ? stripPeriodSuffix(v.fraction.label) : 'ohne Angabe';
    const counts = fractions.get(name) ?? emptyCounts();
    counts[choice] += 1;
    fractions.set(name, counts);
  }
  const isLast = (name: string) => name === 'fraktionslos' || name === 'ohne Angabe';
  const byFraction = [...fractions.entries()]
    .map(([fraction, counts]) => ({ fraction, counts }))
    .sort(
      (a, b) =>
        Number(isLast(a.fraction)) - Number(isLast(b.fraction)) ||
        a.fraction.localeCompare(b.fraction, 'de', { sensitivity: 'base' }),
    );
  return { totals, byFraction };
}

export function mapPolitician(p: AwPolitician, retrievedAt: string, license?: string | null): Politician {
  const asked = p.statistic_questions;
  const answered = p.statistic_questions_answered;
  return {
    id: p.id,
    fullName: p.label,
    firstName: p.first_name ?? '',
    lastName: p.last_name ?? p.label,
    title: p.field_title?.trim() || null,
    party: p.party ? p.party.label : null,
    birthYear: p.year_of_birth ?? null,
    occupation: p.occupation?.trim() || null,
    education: p.education?.trim() || null,
    residence: p.residence?.trim() || null,
    citizenQuestions:
      typeof asked === 'number' ? { asked, answered: typeof answered === 'number' ? answered : 0 } : null,
    wikidataId: p.qid_wikidata ?? null,
    source: sourceRef(p.abgeordnetenwatch_url, retrievedAt, license),
  };
}

/** „Landesliste Thüringen (Bundestag 2025 - 2029)“ → „Thüringen“. */
export function listStateFromLabel(label: string | null | undefined): string | null {
  if (!label) return null;
  const name = stripPeriodSuffix(label).replace(/^Landesliste\s+/i, '').trim();
  return name || null;
}

/**
 * Kompakter Listeneintrag aus Mandat und (optional) Personendaten.
 * Ohne Personendaten wird der volle Name zum Sortieren genutzt.
 */
export function mapMemberListEntry(
  m: AwMandate,
  person: AwPolitician | undefined,
  retrievedAt: string,
  license?: string | null,
): MemberListEntry {
  const mandate = mapMandate(m, retrievedAt, license);
  return {
    mandateId: mandate.id,
    politicianId: mandate.politicianId,
    fullName: m.politician.label,
    firstName: person?.first_name ?? '',
    lastName: person?.last_name ?? m.politician.label,
    fraction: mandate.fraction,
    howElected: mandate.howElected,
    constituency: mandate.constituency,
    listState: listStateFromLabel(m.electoral_data?.electoral_list?.label),
    source: mandate.source,
  };
}
