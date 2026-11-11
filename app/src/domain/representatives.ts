import type { HowElected, Representative } from './model';

/** Alphabetisch nach Nachname, dann Vorname – deutsche Sortierregeln. */
export function sortByName(list: Representative[]): Representative[] {
  return [...list].sort((a, b) => compareByName(a.politician, b.politician));
}

/**
 * Teilt die Abgeordneten eines Wahlkreises in
 * – direkt gewählte (Wahlkreismandat) und
 * – alle anderen, die hier kandidiert haben (Landesliste oder nachgerückt).
 */
export function groupByHowElected(list: Representative[]): {
  direct: Representative[];
  other: Representative[];
} {
  const sorted = sortByName(list);
  return {
    direct: sorted.filter((r) => r.mandate.howElected === 'direct'),
    other: sorted.filter((r) => r.mandate.howElected !== 'direct'),
  };
}

export function describeHowElected(value: HowElected): string {
  switch (value) {
    case 'direct':
      return 'Direkt im Wahlkreis gewählt';
    case 'list':
      return 'Über die Landesliste gewählt';
    case 'moved_up':
      return 'Nachgerückt';
    default:
      return 'Art der Wahl nicht angegeben';
  }
}

/** Sichtbarer Text des Erklärlinks neben „Wie gewählt“ – passend zur Art der Wahl. */
export function howElectedExplainLabel(value: HowElected): string {
  switch (value) {
    case 'list':
      return 'Was heißt Wahl über die Landesliste?';
    case 'moved_up':
      return 'Was heißt nachgerückt?';
    case 'direct':
      return 'Was heißt Direktmandat?';
    default:
      return 'Wie kommt man in den Bundestag?';
  }
}

const LAST_FRACTIONS = new Set(['fraktionslos', 'ohne Angabe']);

/** Fraktionsnamen ohne Doppelte, alphabetisch; „fraktionslos“ steht am Ende. */
export function sortedFractions(names: (string | null | undefined)[]): string[] {
  const unique = [...new Set(names.filter((n): n is string => !!n))];
  return unique.sort(
    (a, b) =>
      Number(LAST_FRACTIONS.has(a)) - Number(LAST_FRACTIONS.has(b)) ||
      normalizeFractionForSort(a).localeCompare(normalizeFractionForSort(b), 'de', { sensitivity: 'base' }),
  );
}

function normalizeFractionForSort(name: string): string {
  return name.replace(/­/g, '');
}

/** Alphabetisch nach Nachname, dann Vorname – wie {@link sortByName}, für Listeneinträge. */
export function compareByName(
  a: { lastName: string; firstName: string },
  b: { lastName: string; firstName: string },
): number {
  return a.lastName.localeCompare(b.lastName, 'de') || a.firstName.localeCompare(b.firstName, 'de');
}

/** „Wahlkreis 14 – Rostock …“ bzw. „Landesliste Bayern“. */
export function describeSeat(entry: {
  howElected: HowElected;
  constituency: { number: number; name: string } | null;
  listState: string | null;
}): string | null {
  const wk = entry.constituency ? `Wahlkreis ${entry.constituency.number} – ${entry.constituency.name}` : null;
  const list = entry.listState ? `Landesliste ${entry.listState}` : null;
  if (entry.howElected === 'direct') return wk ?? list;
  return list ?? wk;
}
