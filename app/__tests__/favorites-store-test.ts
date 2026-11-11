import {
  createFavoritesStore,
  FAVORITES_STORAGE_KEY,
  MAX_FAVORITES,
  parseFavorites,
  serializeFavorites,
  type FavoritesStorage,
} from '@/state/favorites';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function memoryStorage(initial: string | null = null): FavoritesStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== null) data.set(FAVORITES_STORAGE_KEY, initial);
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => {
      data.set(k, v);
    },
  };
}

const fixedNow = () => new Date('2026-10-31T10:00:00.000Z');
const merz = { type: 'politician' as const, id: '118559', title: 'Friedrich Merz', subtitle: 'CDU · Mitglied des Bundestages' };

describe('Favoriten-Speicher', () => {
  it('merkt einen Eintrag und speichert nur ID, Name, Zusatzzeile und Datum', async () => {
    const storage = memoryStorage();
    const store = createFavoritesStore(storage, fixedNow);
    await expect(store.toggle(merz)).resolves.toBe(true);
    expect(store.has('politician', '118559')).toBe(true);
    const saved = JSON.parse(storage.data.get(FAVORITES_STORAGE_KEY)!);
    expect(saved).toEqual({
      version: 1,
      items: [{ ...merz, savedAt: '2026-10-31T10:00:00.000Z' }],
    });
  });

  it('entfernt beim zweiten Antippen und mit remove()', async () => {
    const storage = memoryStorage();
    const store = createFavoritesStore(storage, fixedNow);
    await store.toggle(merz);
    await expect(store.toggle(merz)).resolves.toBe(false);
    expect(store.getSnapshot().items).toEqual([]);
    await store.add({ type: 'proceeding', id: '321456', title: 'Gesetz X', subtitle: null });
    await store.remove('proceeding', '321456');
    expect(JSON.parse(storage.data.get(FAVORITES_STORAGE_KEY)!).items).toEqual([]);
  });

  it('lädt gespeicherte Einträge und benachrichtigt Abonnenten', async () => {
    const storage = memoryStorage(
      serializeFavorites([{ ...merz, savedAt: '2026-10-01T08:00:00.000Z' }]),
    );
    const store = createFavoritesStore(storage, fixedNow);
    const listener = jest.fn();
    store.subscribe(listener);
    expect(store.getSnapshot().loaded).toBe(false);
    await store.load();
    expect(listener).toHaveBeenCalled();
    expect(store.getSnapshot()).toEqual({
      loaded: true,
      items: [{ ...merz, savedAt: '2026-10-01T08:00:00.000Z' }],
      problem: null,
    });
  });

  it('sortiert neueste zuerst und doppelt nichts', async () => {
    let t = 0;
    const store = createFavoritesStore(memoryStorage(), () => new Date(Date.UTC(2026, 9, 1 + t++)));
    await store.add(merz);
    await store.add({ type: 'minister', id: 'Q123', title: 'Ministerin A', subtitle: null });
    await expect(store.add(merz)).resolves.toBe(false);
    expect(store.getSnapshot().items.map((f) => f.id)).toEqual(['Q123', '118559']);
  });

  it('lehnt ungültige Eingaben ab (falsche ID, leerer Name)', async () => {
    const store = createFavoritesStore(memoryStorage(), fixedNow);
    await expect(store.add({ type: 'minister', id: '123', title: 'X', subtitle: null })).resolves.toBe(false);
    await expect(store.add({ type: 'politician', id: 'abc', title: 'X', subtitle: null })).resolves.toBe(false);
    await expect(store.add({ type: 'politician', id: '1', title: '   ', subtitle: null })).resolves.toBe(false);
    expect(store.getSnapshot().items).toEqual([]);
  });

  // Geändert (31.10.2026, Befund tester): Früher wurde nach einem Lesefehler trotzdem geschrieben –
  // dabei ging die gespeicherte Liste verloren. Jetzt: nicht werfen, aber Merken sperren.
  it('übersteht einen dauerhaften Lesefehler, sperrt aber das Schreiben', async () => {
    const setItem = jest.fn(() => Promise.resolve());
    const store = createFavoritesStore({ getItem: () => Promise.reject(new Error('kaputt')), setItem }, fixedNow);
    await store.load();
    expect(store.getSnapshot()).toEqual({ loaded: true, items: [], problem: 'readError' });
    await expect(store.add(merz)).resolves.toBe(false);
    await expect(store.toggle(merz)).resolves.toBe(false);
    await store.remove('politician', '118559');
    expect(setItem).not.toHaveBeenCalled();
  });

  it('liest nach einem Lesefehler erneut und merkt dann ohne Verlust', async () => {
    const storage = memoryStorage(serializeFavorites([{ ...merz, savedAt: '2026-10-01T08:00:00.000Z' }]));
    let fail = true;
    const store = createFavoritesStore(
      {
        getItem: (k) => (fail ? ((fail = false), Promise.reject(new Error('einmal'))) : storage.getItem(k)),
        setItem: storage.setItem,
      },
      fixedNow,
    );
    await store.load();
    expect(store.getSnapshot().problem).toBe('readError');
    await expect(store.add({ type: 'proceeding', id: '333140', title: 'Designrecht', subtitle: null })).resolves.toBe(true);
    expect(store.getSnapshot().problem).toBeNull();
    expect(JSON.parse(storage.data.get(FAVORITES_STORAGE_KEY)!).items.map((f: { id: string }) => f.id)).toEqual([
      '333140',
      '118559',
    ]);
  });

  it('überschreibt eine Liste einer neueren App-Version nicht', async () => {
    const newer = JSON.stringify({ version: 2, items: [{ irgendwas: 1 }] });
    const storage = memoryStorage(newer);
    const store = createFavoritesStore(storage, fixedNow);
    await store.load();
    expect(store.getSnapshot().problem).toBe('unsupportedVersion');
    await expect(store.add(merz)).resolves.toBe(false);
    expect(storage.data.get(FAVORITES_STORAGE_KEY)).toBe(newer);
  });

  it('darf völlig unlesbaren Text überschreiben (ist ohnehin verloren)', async () => {
    const storage = memoryStorage('{nicht json');
    const store = createFavoritesStore(storage, fixedNow);
    await expect(store.add(merz)).resolves.toBe(true);
    expect(store.getSnapshot().problem).toBeNull();
  });
});

describe('parseFavorites (kaputte Daten, Versionen)', () => {
  const valid = { ...merz, savedAt: '2026-10-01T08:00:00.000Z' };

  it.each([
    ['leer', null],
    ['kein JSON', '{nicht json'],
    ['Liste statt Objekt', JSON.stringify([valid])],
    ['ohne Version', JSON.stringify({ items: [valid] })],
    ['items kein Array', JSON.stringify({ version: 1, items: 'x' })],
  ])('%s → leere Liste', (_name, raw) => {
    expect(parseFavorites(raw)).toEqual([]);
  });

  it('ignoriert eine unbekannte (neuere) Version', () => {
    expect(parseFavorites(JSON.stringify({ version: 2, items: [valid] }))).toEqual([]);
  });

  it('verwirft einzelne kaputte Einträge und Doppelte, behält gültige', () => {
    const raw = JSON.stringify({
      version: 1,
      items: [
        valid,
        valid,
        { ...valid, id: '1', type: 'unbekannt' },
        { ...valid, id: '2', savedAt: 'gestern' },
        { ...valid, id: '3', title: '' },
        { ...valid, id: 'Q5', type: 'politician' },
        { ...valid, type: 'minister', id: 'Q567', extra: 'wird nicht übernommen' },
        42,
        null,
      ],
    });
    const items = parseFavorites(raw);
    expect(items.map((f) => `${f.type}:${f.id}`)).toEqual(['politician:118559', 'minister:Q567']);
    expect(items[1]).not.toHaveProperty('extra');
  });

  it('begrenzt die Anzahl', () => {
    const many = Array.from({ length: MAX_FAVORITES + 10 }, (_, i) => ({ ...valid, id: String(i + 1) }));
    expect(parseFavorites(JSON.stringify({ version: 1, items: many }))).toHaveLength(MAX_FAVORITES);
  });
});
