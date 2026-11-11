/**
 * Cache für alle Abrufe. Wird auf dem Gerät gespeichert (AsyncStorage),
 * damit zuletzt geladene Daten auch offline sichtbar bleiben.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, type Query } from '@tanstack/react-query';

import { RateLimitedError } from '@/data/http/fetch-json';
import { serializePersistedClient } from '@/state/persist-policy';

const HOUR = 60 * 60 * 1000;
export const CACHE_MAX_AGE = 7 * 24 * HOUR;

/**
 * Wie lange Daten als aktuell gelten. Danach werden sie beim Öffnen eines Bildschirms,
 * beim Zurückkehren in die App und nach Wiederherstellung der Verbindung neu geladen.
 * Ältere Daten bleiben bis dahin sichtbar.
 */
export const STALE_TIME = {
  /** Mandate, Personen, Wahlkreise: ändern sich selten (Nachrücken, Fraktionswechsel). */
  members: 24 * HOUR,
  /** Abstimmungslisten: in Sitzungswochen kommen neue namentliche Abstimmungen hinzu. */
  votes: 6 * HOUR,
  /** Kandidaturen ändern sich nach der Wahl nicht mehr. */
  candidates: 7 * 24 * HOUR,
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME.members,
      // Mindestens so lang wie die Speicherdauer auf dem Gerät, sonst gehen Offline-Daten verloren.
      gcTime: CACHE_MAX_AGE,
      // Veraltete Daten beim Öffnen, beim Zurückkehren in die App und nach Verbindungsabbruch neu laden.
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // Neuversuche macht bereits der HTTP-Client; bei 429 gar nicht.
      retry: (count, error) => !(error instanceof RateLimitedError) && count < 1,
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'politikometer:cache:v1',
  // Begrenzt Umfang und Größe des gespeicherten Caches (siehe persist-policy.ts).
  serialize: (client) => serializePersistedClient(client),
});

/**
 * Kennung des Datenformats. Ändert sich das Format gespeicherter Daten (z. B. Inkrafttreten mit
 * Erläuterung statt nur Datum), wird der alte Cache beim Start verworfen und gelöscht.
 */
export const CACHE_BUSTER = '2026-11-11';

export const persistOptions = {
  persister,
  maxAge: CACHE_MAX_AGE,
  buster: CACHE_BUSTER,
  dehydrateOptions: {
    // Nur erfolgreiche Abfragen (keine Fehler- oder Ladezustände).
    shouldDehydrateQuery: (query: Query) => query.state.status === 'success',
  },
};
