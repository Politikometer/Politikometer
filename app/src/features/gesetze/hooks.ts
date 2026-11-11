import { useQuery } from '@tanstack/react-query';

import { LegislationRepository } from '@/data/repositories/legislation-repository';

export const legislationRepository = new LegislationRepository();

const HOUR = 60 * 60 * 1000;
/** Gesetze ändern ihren Stand in Sitzungswochen; 6 h reichen. */
export const LEGISLATION_STALE = 6 * HOUR;

/** DIP-Vorgangs-IDs sind Ziffernfolgen. */
export function isProceedingId(id: string | undefined): id is string {
  return !!id && /^\d{1,10}$/.test(id);
}

export function useLegislation(id: string | undefined) {
  return useQuery({
    queryKey: ['gesetz', id],
    queryFn: () => legislationRepository.getLegislation(id!),
    enabled: isProceedingId(id),
    staleTime: LEGISLATION_STALE,
  });
}

/** Namentliche Abstimmungen der laufenden Wahlperiode – gemeinsam für Gesetz- und Wochenseite. */
export function useTermPolls() {
  return useQuery({
    queryKey: ['gesetz', 'abstimmungen-wahlperiode'],
    queryFn: () => legislationRepository.getTermPolls(),
    staleTime: LEGISLATION_STALE,
  });
}
