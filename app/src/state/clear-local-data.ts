/**
 * „Gespeicherte Daten löschen“: entfernt alles, was die App auf dem Gerät speichert –
 * zuletzt gesuchte PLZ, Merkliste und Zwischenspeicher (Offline-Cache).
 */
import { favoritesStore } from '@/state/favorites';
import { clearLastPlz } from '@/state/last-plz';
import { persister, queryClient } from '@/state/query-client';

export type ClearDeps = {
  clearLastPlz: () => Promise<void>;
  clearFavorites: () => Promise<void>;
  /** Abrufe im Arbeitsspeicher verwerfen. */
  clearQueryCache: () => void;
  /** Gespeicherten Cache auf dem Gerät entfernen. */
  removePersistedCache: () => Promise<void>;
};

const defaultDeps: ClearDeps = {
  clearLastPlz: () => clearLastPlz(),
  clearFavorites: () => favoritesStore.clear(),
  clearQueryCache: () => queryClient.clear(),
  removePersistedCache: async () => {
    await persister.removeClient();
  },
};

/** Was nicht gelöscht werden konnte (leer = alles gelöscht). */
export type ClearResult = { failed: ('plz' | 'favorites' | 'cache')[] };

/** Löscht alle gespeicherten Daten. Wirft nie; meldet, was nicht geklappt hat. */
export async function clearAllLocalData(deps: ClearDeps = defaultDeps): Promise<ClearResult> {
  const failed: ClearResult['failed'] = [];
  const attempt = async (name: ClearResult['failed'][number], fn: () => Promise<void> | void) => {
    try {
      await fn();
    } catch {
      failed.push(name);
    }
  };
  await attempt('plz', deps.clearLastPlz);
  await attempt('favorites', deps.clearFavorites);
  await attempt('cache', async () => {
    deps.clearQueryCache();
    await deps.removePersistedCache();
  });
  return { failed };
}
