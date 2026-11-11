import type { PollVote, VoteChoice, VoteCounts } from './model';

export const VOTE_LABELS: Record<VoteChoice, string> = {
  yes: 'Ja',
  no: 'Nein',
  abstain: 'Enthalten',
  no_show: 'Nicht abgegeben',
};

export const VOTE_ORDER: VoteChoice[] = ['yes', 'no', 'abstain', 'no_show'];

export function describeAccepted(accepted: boolean | null): string | null {
  if (accepted === true) return 'Angenommen';
  if (accepted === false) return 'Abgelehnt';
  return null;
}

export function formatCounts(c: VoteCounts): string {
  return VOTE_ORDER.map((k) => `${VOTE_LABELS[k]} ${c[k]}`).join(' · ');
}

export function countTotal(c: VoteCounts): number {
  return c.yes + c.no + c.abstain + c.no_show;
}

/**
 * Kennung aus einer Adresse (Link, Direktaufruf): nur reine Ziffernfolgen größer null.
 * Alles andere (leer, „1e3“, „-1“, „12abc“, mehrfach angegebene Werte) ergibt `null`.
 */
export function parseRouteId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{1,12}$/.test(value)) return null;
  const id = Number(value);
  return id > 0 ? id : null;
}

/**
 * Stimme einer Person in einer bestimmten Abstimmung – ausschließlich aus den geladenen Quelldaten
 * ihres Mandats. Name und Stimme dürfen nie aus der Adresse stammen: Sonst könnte ein präparierter
 * Link einer beliebigen Person eine beliebige Stimme zuschreiben.
 */
export function findPersonVote(
  result: { personName?: string | null; votes: PollVote[] } | undefined,
  pollId: number | null,
): { personName: string; vote: PollVote } | null {
  if (!result?.personName || pollId === null) return null;
  const vote = result.votes.find((v) => v.poll.id === pollId);
  return vote ? { personName: result.personName, vote } : null;
}
