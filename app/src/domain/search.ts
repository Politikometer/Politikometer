/**
 * Namenssuche ohne Rücksicht auf Groß-/Kleinschreibung, Umlaute und Akzente.
 * „muller“, „müller“ und „mueller“ finden „Müller“; „strauss“ findet „Strauß“;
 * „koktürk“ findet „Köktürk“, „cansin“ findet „Cansın“.
 */

/** Buchstaben, die Unicode nicht in Grundbuchstabe + Akzent zerlegt. */
const SPECIAL_LETTERS: Record<string, string> = {
  ß: 'ss',
  ẞ: 'ss',
  ı: 'i',
  ł: 'l',
  ø: 'o',
  đ: 'd',
  æ: 'ae',
  œ: 'oe',
};

const GERMAN_UMLAUTS: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue' };

function base(text: string, expandUmlauts: boolean): string {
  let s = text.toLowerCase().replace(/­/g, ''); // weiches Trennzeichen
  if (expandUmlauts) s = s.replace(/[äöü]/g, (c) => GERMAN_UMLAUTS[c]);
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Akzente entfernen
    .replace(/[ßẞıłøđæœ]/g, (c) => SPECIAL_LETTERS[c])
    .replace(/[^a-z0-9]+/g, ' ') // Satzzeichen, Bindestriche, Anführungszeichen → Leerzeichen
    .trim();
}

/** Vereinfachte Form eines Textes für den Vergleich („Müller“ → „muller“). */
export function normalizeForSearch(text: string): string {
  return base(text, false);
}

/** Beide Schreibweisen eines Namens: „Müller“ → „muller“ und „mueller“. */
export function searchKeys(text: string): string[] {
  const plain = base(text, false);
  const expanded = base(text, true);
  return plain === expanded ? [plain] : [plain, expanded];
}

/**
 * Passt die Eingabe zum Text? Jedes Wort der Eingabe muss irgendwo vorkommen,
 * Reihenfolge egal („aken jan“ findet „Jan van Aken“). Leere Eingabe passt immer.
 */
export function matchesSearch(keys: string[], query: string): boolean {
  const words = normalizeForSearch(query).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  return keys.some((key) => words.every((w) => key.includes(w)));
}

/**
 * Bereitet eine Liste für schnelle, wiederholte Suche vor (Schlüssel werden einmal berechnet).
 * Die Reihenfolge der Liste bleibt erhalten.
 */
export function createSearch<T>(items: T[], getText: (item: T) => string): (query: string) => T[] {
  const indexed = items.map((item) => ({ item, keys: searchKeys(getText(item)) }));
  return (query) => {
    if (!normalizeForSearch(query)) return items;
    return indexed.filter((e) => matchesSearch(e.keys, query)).map((e) => e.item);
  };
}
