import { useQuery } from '@tanstack/react-query';

import { legislationRepository } from '@/features/gesetze/hooks';

const HOUR = 60 * 60 * 1000;
/** In Sitzungswochen kommen täglich Protokolle und Schritte hinzu. */
export const WEEK_STALE = 3 * HOUR;

export function useWeekOverview() {
  return useQuery({
    queryKey: ['woche', 'ueberblick'],
    queryFn: () => legislationRepository.getWeek(),
    staleTime: WEEK_STALE,
  });
}
