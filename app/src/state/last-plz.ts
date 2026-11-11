/** Die zuletzt gesuchte PLZ – nur auf dem Gerät gespeichert. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export const LAST_PLZ_STORAGE_KEY = 'politikometer:last-plz';
const KEY = LAST_PLZ_STORAGE_KEY;

/** Benachrichtigt alle eingebundenen Hooks, wenn die PLZ von außen gelöscht wurde. */
const clearListeners = new Set<() => void>();

/**
 * Löscht die gespeicherte PLZ (z. B. über „Gespeicherte Daten löschen“).
 * Auch bereits angezeigte Bildschirme vergessen sie sofort. Wirft, wenn der Speicher nicht löscht.
 */
export async function clearLastPlz(storage: Pick<typeof AsyncStorage, 'removeItem'> = AsyncStorage): Promise<void> {
  clearListeners.forEach((l) => l());
  await storage.removeItem(KEY);
}

export function useLastPlz() {
  const [lastPlz, setState] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY)
      .then((v) => active && setState(v))
      .catch(() => active && setState(null));
    const onClear = () => setState(null);
    clearListeners.add(onClear);
    return () => {
      active = false;
      clearListeners.delete(onClear);
    };
  }, []);

  const save = useCallback((plz: string) => {
    setState(plz);
    AsyncStorage.setItem(KEY, plz).catch(() => undefined);
  }, []);

  const clear = useCallback(() => {
    setState(null);
    AsyncStorage.removeItem(KEY).catch(() => undefined);
  }, []);

  return { lastPlz, save, clear };
}
