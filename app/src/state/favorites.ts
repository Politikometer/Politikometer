/**
 * Merkliste – nur auf diesem Gerät gespeichert, nie übertragen.
 *
 * Gespeichert wird je Eintrag nur: Typ, ID der Quelle, Anzeigename, eine Zusatzzeile
 * und der Zeitpunkt des Merkens. Keine weiteren Daten.
 *
 * Format in AsyncStorage (Schlüssel `politikometer:favorites`):
 *   { "version": 1, "items": [{ "type": "politician", "id": "118559", "title": "…",
 *     "subtitle": "CDU · Bundestag" | null, "savedAt": "2026-10-31T10:00:00.000Z" }] }
 * Kaputte Einträge werden einzeln verworfen. Eine unbekannte (z. B. neuere) Version oder ein
 * Lesefehler sperrt das Ändern der Merkliste, damit gespeicherte Einträge nie überschrieben werden.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { z } from 'zod';

export const FAVORITES_STORAGE_KEY = 'politikometer:favorites';
export const FAVORITES_VERSION = 1;
/** Obergrenze, damit der Speicher nicht unbegrenzt wächst. */
export const MAX_FAVORITES = 500;
const MAX_TEXT = 200;

/**
 * - `politician`: abgeordnetenwatch-Politiker-ID
 * - `proceeding`: DIP-Vorgangs-ID (Gesetzgebungsvorgang)
 * - `minister`: Wikidata-QID eines Regierungsmitglieds
 */
export const FAVORITE_TYPES = ['politician', 'proceeding', 'minister'] as const;
export type FavoriteType = (typeof FAVORITE_TYPES)[number];

export type Favorite = {
  type: FavoriteType;
  id: string;
  title: string;
  subtitle: string | null;
  /** ISO-Zeitstempel des Merkens. */
  savedAt: string;
};

export type FavoriteInput = Omit<Favorite, 'savedAt'>;

const idPattern: Record<FavoriteType, RegExp> = {
  politician: /^\d{1,12}$/,
  proceeding: /^\d{1,12}$/,
  minister: /^Q\d{1,12}$/,
};

const itemSchema = z
  .object({
    type: z.enum(FAVORITE_TYPES),
    id: z.string(),
    title: z.string().trim().min(1).max(MAX_TEXT),
    subtitle: z.string().trim().max(MAX_TEXT).nullable(),
    savedAt: z.iso.datetime(),
  })
  .refine((v) => idPattern[v.type].test(v.id), { message: 'Ungültige ID' });

const fileSchema = z.object({
  version: z.number(),
  items: z.array(z.unknown()),
});

export function favoriteKey(type: FavoriteType, id: string): string {
  return `${type}:${id}`;
}

/** Liest den gespeicherten Text; alles Unlesbare wird verworfen, nie geworfen. */
export function parseFavorites(raw: string | null | undefined): Favorite[] {
  return readFavoritesFile(raw).items;
}

/**
 * Wie `parseFavorites`, meldet aber zusätzlich, ob die Datei eine andere Version hat.
 * Dann darf nicht geschrieben werden – sonst ginge die Liste der neueren App-Version verloren.
 * (Völlig unlesbarer Text ist dagegen schon verloren und darf überschrieben werden.)
 */
export function readFavoritesFile(raw: string | null | undefined): { items: Favorite[]; unsupportedVersion: boolean } {
  const none = { items: [], unsupportedVersion: false };
  if (!raw) return none;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return none;
  }
  if (json && typeof json === 'object' && !Array.isArray(json) && 'version' in json && json.version !== FAVORITES_VERSION) {
    return { items: [], unsupportedVersion: true };
  }
  const file = fileSchema.safeParse(json);
  if (!file.success) return none;
  const seen = new Set<string>();
  const items: Favorite[] = [];
  for (const entry of file.data.items) {
    const parsed = itemSchema.safeParse(entry);
    if (!parsed.success) continue;
    const key = favoriteKey(parsed.data.type, parsed.data.id);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ ...parsed.data, subtitle: parsed.data.subtitle || null });
    if (items.length >= MAX_FAVORITES) break;
  }
  return { items, unsupportedVersion: false };
}

export function serializeFavorites(items: Favorite[]): string {
  return JSON.stringify({ version: FAVORITES_VERSION, items });
}

/** Prüft und kürzt eine neue Eingabe; ungültige Eingaben ergeben null. */
export function normalizeInput(input: FavoriteInput, savedAt: string): Favorite | null {
  const parsed = itemSchema.safeParse({
    type: input.type,
    id: String(input.id).trim(),
    title: input.title.trim().slice(0, MAX_TEXT),
    subtitle: input.subtitle ? input.subtitle.trim().slice(0, MAX_TEXT) || null : null,
    savedAt,
  });
  return parsed.success ? parsed.data : null;
}

export type FavoritesStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  /** Zum vollständigen Löschen; fehlt es, wird eine leere Liste geschrieben. */
  removeItem?(key: string): Promise<void>;
};

/**
 * Warum die Merkliste gerade nicht geändert werden darf:
 * - `readError`: Speicher konnte nicht gelesen werden (beim nächsten Zugriff wird erneut gelesen),
 * - `unsupportedVersion`: von einer anderen (neueren) App-Version gespeichert.
 */
export type FavoritesProblem = 'readError' | 'unsupportedVersion';

export type FavoritesState = {
  loaded: boolean;
  /** Neueste zuerst. */
  items: Favorite[];
  problem: FavoritesProblem | null;
};

/** Verständlicher Hinweis zum Problem. */
export function favoritesProblemText(problem: FavoritesProblem): string {
  return problem === 'readError'
    ? 'Die Merkliste konnte gerade nicht gelesen werden. Damit nichts verloren geht, ist Merken vorübergehend nicht möglich. Bitte versuche es gleich noch einmal.'
    : 'Die Merkliste wurde von einer neueren Version der App gespeichert. Damit nichts verloren geht, kann sie hier nicht geändert werden. Bitte aktualisiere die App.';
}

export type FavoritesStore = ReturnType<typeof createFavoritesStore>;

export function createFavoritesStore(storage: FavoritesStorage, now: () => Date = () => new Date()) {
  let state: FavoritesState = { loaded: false, items: [], problem: null };
  const listeners = new Set<() => void>();
  let loading: Promise<void> | null = null;
  let writes: Promise<void> = Promise.resolve();
  /** Erhöht sich bei `clear()`; vorher begonnene Änderungen werden dann verworfen. */
  let generation = 0;

  function setState(items: Favorite[], problem: FavoritesProblem | null = state.problem) {
    state = { loaded: true, items, problem };
    listeners.forEach((l) => l());
  }

  function persist(items: Favorite[]) {
    const text = serializeFavorites(items);
    // Nacheinander schreiben, damit ein älterer Stand nie einen neueren überschreibt.
    writes = writes.then(() => storage.setItem(FAVORITES_STORAGE_KEY, text)).catch(() => undefined);
    return writes;
  }

  /** Liest einmal; nach einem Lesefehler beim nächsten Aufruf erneut. Wirft nie. */
  function load(): Promise<void> {
    if (!loading) {
      loading = storage.getItem(FAVORITES_STORAGE_KEY).then(
        (raw) => {
          const file = readFavoritesFile(raw);
          setState(sortNewestFirst(file.items), file.unsupportedVersion ? 'unsupportedVersion' : null);
        },
        () => {
          loading = null;
          setState(state.items, 'readError');
        },
      );
    }
    return loading;
  }

  /** Nur ändern, wenn der gespeicherte Stand sicher gelesen wurde (nach Lesefehler: noch ein Versuch). */
  async function canWrite(): Promise<boolean> {
    await load();
    if (state.problem === 'readError') await load();
    return state.problem === null;
  }

  function has(type: FavoriteType, id: string): boolean {
    return state.items.some((f) => f.type === type && f.id === id);
  }

  async function add(input: FavoriteInput): Promise<boolean> {
    const gen = generation;
    if (!(await canWrite()) || gen !== generation) return false;
    const item = normalizeInput(input, now().toISOString());
    if (!item || has(item.type, item.id)) return false;
    const items = [item, ...state.items].slice(0, MAX_FAVORITES);
    setState(items);
    await persist(items);
    return true;
  }

  async function remove(type: FavoriteType, id: string): Promise<void> {
    const gen = generation;
    if (!(await canWrite()) || gen !== generation) return;
    if (!has(type, id)) return;
    const items = state.items.filter((f) => !(f.type === type && f.id === id));
    setState(items);
    await persist(items);
  }

  /** Merkt bzw. entfernt. Ergebnis: ob der Eintrag danach gemerkt ist. */
  async function toggle(input: FavoriteInput): Promise<boolean> {
    if (!(await canWrite())) return has(input.type, String(input.id).trim());
    const id = String(input.id).trim();
    if (has(input.type, id)) {
      await remove(input.type, id);
      return false;
    }
    return add(input);
  }

  /**
   * Löscht die ganze Merkliste – nur auf ausdrücklichen Wunsch („Gespeicherte Daten löschen“).
   * Gilt auch, wenn die Liste von einer anderen App-Version stammt oder nicht lesbar war.
   * Wirft, wenn der Speicher das Löschen ablehnt.
   */
  async function clear(): Promise<void> {
    generation++;
    // Laufende Schreibvorgänge zuerst abschließen, damit sie die Liste nicht wiederherstellen.
    await writes;
    const done = storage.removeItem
      ? storage.removeItem(FAVORITES_STORAGE_KEY)
      : storage.setItem(FAVORITES_STORAGE_KEY, serializeFavorites([]));
    writes = done.catch(() => undefined);
    await done;
    loading = Promise.resolve();
    setState([], null);
  }

  return {
    load,
    add,
    remove,
    toggle,
    clear,
    has,
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function sortNewestFirst(items: Favorite[]): Favorite[] {
  return [...items].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

/** Gemeinsamer Speicher der App – alle Screens sehen dieselbe Liste. */
export const favoritesStore = createFavoritesStore(AsyncStorage);

export function useFavorites(store: FavoritesStore = favoritesStore) {
  useEffect(() => {
    store.load();
  }, [store]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  const keys = useMemo(() => new Set(state.items.map((f) => favoriteKey(f.type, f.id))), [state.items]);
  const isFavorite = useCallback(
    (type: FavoriteType, id: string | number) => keys.has(favoriteKey(type, String(id))),
    [keys],
  );

  return {
    loaded: state.loaded,
    /** Gesetzt, wenn Merken gerade gesperrt ist (siehe `favoritesProblemText`). */
    problem: state.problem,
    /** Erneut lesen (nach einem Lesefehler). */
    retry: store.load,
    /** Neueste zuerst. */
    list: state.items,
    isFavorite,
    toggle: store.toggle,
    remove: store.remove,
  };
}
