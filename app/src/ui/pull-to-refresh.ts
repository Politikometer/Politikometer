import { useCallback, useState } from 'react';

/**
 * Zustand für den Knopf „Jetzt aktualisieren“. Zeigt nur manuelles Aktualisieren an,
 * nicht die automatischen Hintergrundabrufe. Während eines Abrufs wird kein zweiter gestartet.
 */
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch, refreshing]);
  return { refreshing, onRefresh };
}
