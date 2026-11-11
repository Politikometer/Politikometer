import { useQuery } from '@tanstack/react-query';

import { BundestagRepository } from '@/data/repositories/bundestag-repository';
import { STALE_TIME } from '@/state/query-client';

const repository = new BundestagRepository();

export function useRepresentatives(constituencyNumber: number) {
  return useQuery({
    queryKey: ['bundestag', 'representatives', constituencyNumber],
    queryFn: () => repository.getRepresentatives(constituencyNumber),
    enabled: Number.isInteger(constituencyNumber) && constituencyNumber > 0,
  });
}

export function useCandidates(constituencyNumber: number) {
  return useQuery({
    queryKey: ['bundestag', 'candidates', constituencyNumber],
    queryFn: () => repository.getCandidates(constituencyNumber),
    enabled: Number.isInteger(constituencyNumber) && constituencyNumber > 0,
    // Kandidaturen ändern sich nach der Wahl nicht mehr.
    staleTime: STALE_TIME.candidates,
  });
}

export function useVotes(mandateId: number | null | undefined) {
  return useQuery({
    queryKey: ['bundestag', 'votes', mandateId],
    queryFn: () => repository.getVotes(mandateId!),
    enabled: typeof mandateId === 'number' && Number.isInteger(mandateId) && mandateId > 0,
    staleTime: STALE_TIME.votes,
  });
}

export function usePollResult(pollId: number | null) {
  return useQuery({
    queryKey: ['bundestag', 'poll', pollId],
    queryFn: () => repository.getPollResult(pollId!),
    enabled: typeof pollId === 'number' && Number.isInteger(pollId) && pollId > 0,
  });
}

export function usePoliticianProfile(politicianId: number) {
  return useQuery({
    queryKey: ['bundestag', 'profile', politicianId],
    queryFn: () => repository.getProfile(politicianId),
    enabled: Number.isInteger(politicianId) && politicianId > 0,
  });
}

/** Alle aktuellen Bundestagsabgeordneten (2 Anfragen, plus Wahlperiode falls nicht zwischengespeichert). */
export function useAllMembers() {
  return useQuery({
    queryKey: ['bundestag', 'members'],
    queryFn: () => repository.getAllMembers(),
    staleTime: STALE_TIME.members,
  });
}
