/**
 * Kennzahlen und Rangliste der Bundestagsabgeordneten.
 *
 * Grundsatz: Gezählt wird nur, OB jemand abstimmt und antwortet – nie, WIE jemand abstimmt.
 * Die Gesamtnote ist damit eine Aktivitätsnote und keine politische Bewertung.
 */

export type MemberFigures = {
  id: number;
  mandateId: number;
  name: string;
  lastName: string;
  fraction: string | null;
  /** Namentliche Abstimmungen während des Mandats. */
  votesEligible: number;
  /** Davon mit abgegebener Stimme (Ja, Nein oder Enthaltung). */
  votesCast: number;
  /** Bürgerfragen auf abgeordnetenwatch.de und beantwortete davon. */
  questions: number;
  answered: number;
};

export type RankingMetric = 'score' | 'participation' | 'answers';

export const METRIC_LABELS: Record<RankingMetric, string> = {
  score: 'Gesamtnote',
  participation: 'Teilnahme',
  answers: 'Antworten',
};

/** Unter diesen Fallzahlen wäre ein Anteil nicht aussagekräftig. */
export const MIN_VOTES = 10;
export const MIN_QUESTIONS = 5;

/**
 * Untergrenze: Wer an weniger als der Hälfte der Abstimmungen teilgenommen hat, bekommt keine Note und
 * keinen Platz. Die Quelle unterscheidet nicht zwischen Krankheit, Mutterschutz und unentschuldigtem Fehlen –
 * niemand soll deshalb als Schlusslicht erscheinen. Die Zahl selbst bleibt im Profil sichtbar.
 */
export const MIN_PARTICIPATION = 0.5;

export function belowParticipationFloor(m: MemberFigures): boolean {
  const p = participation(m);
  return p !== null && p < MIN_PARTICIPATION;
}

/** Gewichte der Gesamtnote. Abstimmen ist Kernaufgabe des Mandats, Antworten freiwillig. */
export const WEIGHT_PARTICIPATION = 0.7;
export const WEIGHT_ANSWERS = 0.3;

/** Anteil 0–1 der Abstimmungen mit abgegebener Stimme, oder null bei zu wenigen Abstimmungen. */
export function participation(m: MemberFigures): number | null {
  if (m.votesEligible < MIN_VOTES) return null;
  return clamp(m.votesCast / m.votesEligible);
}

/** Anteil 0–1 der beantworteten Bürgerfragen, oder null bei zu wenigen Fragen. */
export function answerRate(m: MemberFigures): number | null {
  if (m.questions < MIN_QUESTIONS) return null;
  return clamp(m.answered / m.questions);
}

/** Gesamtnote 0–10 (eine Nachkommastelle), nur wenn beide Kennzahlen vorliegen. */
export function score(m: MemberFigures): number | null {
  const p = participation(m);
  const a = answerRate(m);
  if (p === null || a === null || p < MIN_PARTICIPATION) return null;
  return Math.round((WEIGHT_PARTICIPATION * p + WEIGHT_ANSWERS * a) * 100) / 10;
}

export function metricValue(m: MemberFigures, metric: RankingMetric): number | null {
  if (metric === 'score') return score(m);
  if (metric === 'participation') return participation(m);
  return answerRate(m);
}

export function formatMetric(value: number | null, metric: RankingMetric): string {
  if (value === null) return '–';
  if (metric === 'score') return value.toFixed(1).replace('.', ',');
  return `${Math.round(value * 100)} %`;
}

/** Wert als Anteil 0–1 für Balkengrafiken. */
export function metricFraction(value: number | null, metric: RankingMetric): number {
  if (value === null) return 0;
  return clamp(metric === 'score' ? value / 10 : value);
}

export type RankedMember = { member: MemberFigures; value: number; rank: number };

/**
 * Sortiert absteigend. Gleiche (angezeigte) Werte teilen sich einen Platz; innerhalb eines Platzes
 * alphabetisch nach Nachnamen. Personen ohne Wert erscheinen nicht in der Rangliste, ebenso wenig
 * Personen unter der Teilnahme-Untergrenze (außer bei der Sortierung nach Antworten).
 */
export function rank(members: MemberFigures[], metric: RankingMetric): RankedMember[] {
  const shown = (v: number) => (metric === 'score' ? Math.round(v * 10) : Math.round(v * 100));
  const rows = members
    .map((member) => ({ member, value: metricValue(member, metric) }))
    .filter((r): r is { member: MemberFigures; value: number } => r.value !== null)
    .filter((r) => metric === 'answers' || !belowParticipationFloor(r.member))
    .sort(
      (a, b) => shown(b.value) - shown(a.value) || a.member.lastName.localeCompare(b.member.lastName, 'de'),
    );
  let current = 0;
  return rows.map((row, index) => {
    if (index === 0 || shown(row.value) !== shown(rows[index - 1].value)) current = index + 1;
    return { ...row, rank: current };
  });
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n));
}
