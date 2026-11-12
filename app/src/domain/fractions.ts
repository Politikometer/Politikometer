/**
 * Erkennungsfarben der Fraktionen – die üblichen Farben aus Wahlgrafiken, keine Wertung.
 * Die Farbe ist nie der einzige Träger der Information: Der Fraktionsname steht immer daneben.
 */
const COLORS: { match: RegExp; color: string }[] = [
  { match: /CDU|CSU/i, color: '#2B2B2B' },
  { match: /SPD/i, color: '#E3000F' },
  { match: /GR(Ü|UE)NE/i, color: '#1AA037' },
  { match: /AFD/i, color: '#009EE0' },
  { match: /LINKE/i, color: '#BE3075' },
  { match: /FDP/i, color: '#FFD600' },
  { match: /BSW/i, color: '#7D254F' },
];

export const NEUTRAL_FRACTION_COLOR = '#8A8F98';

/** Entfernt unsichtbare Trennzeichen, die manche Quellen in Namen einfügen. */
export function normalizeFraction(name: string | null | undefined): string {
  return (name ?? '').replace(/­/g, '').trim();
}

export function fractionColor(name: string | null | undefined, dark = false): string {
  // Schwarz wäre auf dunklem Grund unsichtbar – dort ein helles Grau, wie in Wahlgrafiken üblich.
  if (dark && /CDU|CSU/i.test(normalizeFraction(name))) return '#C9CDD4';
  const clean = normalizeFraction(name);
  return COLORS.find((c) => c.match.test(clean))?.color ?? NEUTRAL_FRACTION_COLOR;
}
