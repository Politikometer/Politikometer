/**
 * Datenmodell für Gesetzgebung („Gesetz verfolgen“) und den Wochenüberblick.
 * Screens arbeiten nur mit diesen Typen – nie mit den Formaten der Quellen.
 * Alle Bezeichnungen (Schritte, Beratungsstand, Beschlüsse) sind amtlich und unverändert.
 */
import type { SourceRef } from '@/domain/model';

/** Amtliches Dokument zu einem Schritt, z. B. „BT-Drs. 21/7869“ oder „BT-PlPr. 21/102, S. 12903A–12909A“. */
export type OfficialDocument = {
  kind: 'Drucksache' | 'Plenarprotokoll' | 'Dokument';
  label: string;
  /** Amtliche Nummer, z. B. „21/7869“. */
  number: string | null;
  /** Herausgeber laut Quelle („Bundestag“, „Bundesrat“, …). */
  publisher: string | null;
  /** Amtlicher Typ der Drucksache, z. B. „Gesetzentwurf“. */
  documentType: string | null;
  url: string | null;
};

/** Beschluss in einem Schritt, z. B. „Annahme in Ausschussfassung“ (namentliche Abstimmung, 303:210:52). */
export type StepDecision = {
  text: string;
  method: string | null;
  result: string | null;
  majority: string | null;
};

/** Ein Schritt im Ablauf eines Gesetzgebungsvorgangs (DIP: Vorgangsposition). */
export type LegislationStep = {
  id: string;
  proceedingId: string;
  /** ISO-Datum des zugehörigen Dokuments. */
  date: string;
  /** Amtliche Bezeichnung, z. B. „Gesetzentwurf“, „1. Beratung“, „2. Durchgang“. */
  title: string;
  /** „Bundestag“, „Bundesrat“, „Bundesversammlung“, „Europakammer des Bundesrates“. */
  body: string | null;
  /** Beratung erstreckt sich über mehrere Protokolle bzw. Nachtrag laut Quelle. */
  note: 'Fortsetzung' | 'Nachtrag' | null;
  /** Urheber, z. B. „Bundesregierung“ oder ein Ausschuss. */
  authors: string[];
  /** Ausschüsse, an die überwiesen wurde. */
  committees: { name: string; lead: boolean }[];
  decisions: StepDecision[];
  /** Kurzer amtlicher Hinweis zum Schritt, z. B. „Empfehlung: Annahme der Vorlage …“. */
  summary: string | null;
  document: OfficialDocument | null;
};

export type Promulgation = {
  /** Verkündungsdatum. */
  date: string | null;
  signedOn: string | null;
  /** z. B. „BGBl I 2026, 309“. */
  citation: string | null;
  gazette: string | null;
  url: string | null;
};

export type EntryIntoForce = {
  date: string;
  /** Amtliche Erläuterung laut DIP, z. B. „Artikel 5“ oder „im Übrigen“. */
  note: string | null;
};

/** Ein Gesetzgebungsvorgang mit allen Schritten. */
export type Legislation = {
  id: string;
  title: string;
  /** Amtlicher Vorgangstyp, z. B. „Gesetzgebung“. */
  type: string;
  /** Amtlicher Beratungsstand, z. B. „Verabschiedet“. */
  status: string | null;
  initiative: string[];
  electoralPeriod: number | null;
  /** Datum des letzten zugehörigen Dokuments. */
  lastDocumentDate: string | null;
  /** Amtliche Kurzbeschreibung als reiner Text. */
  summary: string | null;
  subjects: string[];
  /** Zustimmungsbedürftigkeit laut Quelle, z. B. „Nein, laut Verkündung (BGBl I)“. */
  consent: string[];
  promulgations: Promulgation[];
  /** Je Datum, welcher Teil in Kraft tritt (amtliche Erläuterung, z. B. „Artikel 5“, „im Übrigen“); nach Datum. */
  entryIntoForce: EntryIntoForce[];
  /** Chronologisch (älteste zuerst). */
  steps: LegislationStep[];
  /** Weitere Schritte, die wegen der Abrufgrenze nicht geladen wurden (sehr lange Vorgänge). */
  missingSteps: number;
  source: SourceRef;
};

/** Kompakte namentliche Abstimmung – zum Verknüpfen mit Gesetzen. */
export type PollSummary = {
  id: number;
  title: string;
  date: string | null;
  accepted: boolean | null;
  /** Bundestagsdrucksachen, auf die die Abstimmung verweist, z. B. [„21/7869“]. */
  drucksachen: string[];
  source: SourceRef;
};

/** Ein Vorgang im Wochenüberblick mit den Schritten, die im Zeitraum liegen. */
export type WeekProceeding = {
  id: string;
  title: string;
  status: string | null;
  initiative: string[];
  /** Schritte im Zeitraum, chronologisch. */
  steps: LegislationStep[];
  source: SourceRef;
};

export type PlenarySession = {
  id: string;
  date: string;
  body: string | null;
  /** z. B. „Protokoll der 103. Sitzung des 21. Deutschen Bundestages“. */
  title: string;
  /** z. B. „Sondersitzung“. */
  remark: string | null;
  document: OfficialDocument;
  source: SourceRef;
};

export type WeekWindow = {
  /** ISO-Daten, beide einschließlich. */
  start: string;
  end: string;
  /**
   * `recentSittingWeek`: Bundestag hat in den letzten 7 Tagen getagt → ab Montag dieser Sitzungswoche bis heute.
   * `lastSittingWeek`: sonst die ganze Kalenderwoche (Mo–So) der letzten Sitzung.
   */
  kind: 'recentSittingWeek' | 'lastSittingWeek' | 'noSessionFound';
};

export type WeekOverview = {
  window: WeekWindow;
  /** Plenarsitzungen von Bundestag und Bundesrat im Zeitraum, chronologisch. */
  sessions: PlenarySession[];
  /** Nach amtlichem Beratungsstand (alphabetisch), darin chronologisch. */
  legislationGroups: { status: string; items: WeekProceeding[] }[];
  legislationTotal: number;
  /** Nicht alle Vorgänge geladen (Abrufgrenze erreicht) – `legislationTotal` ist dann größer als die Anzahl gezeigter. */
  truncated: boolean;
  /** Alle Vorgänge geladen, aber nicht alle Schritte im Zeitraum (Abrufgrenze erreicht). */
  stepsTruncated?: boolean;
  retrievedAt: string;
  source: SourceRef;
};

// ---------- reine Hilfsfunktionen ----------

const BTD_URL = /\/btd\/(\d{1,2})\/\d+\/(\d+)\.pdf/i;

/**
 * Bundestagsdrucksache aus einem Link auf dserver.bundestag.de,
 * z. B. „…/btd/21/078/2107869.pdf“ → „21/7869“.
 */
export function drucksacheFromUrl(url: string): string | null {
  const m = BTD_URL.exec(url);
  if (!m) return null;
  const [, period, file] = m;
  if (!file.startsWith(period)) return null;
  const nr = Number(file.slice(period.length));
  return Number.isInteger(nr) && nr > 0 ? `${period}/${nr}` : null;
}

/** Nummern der Bundestagsdrucksachen „Gesetzentwurf“ eines Vorgangs. */
export function billDrucksachen(l: Pick<Legislation, 'steps'>): string[] {
  const nrs = l.steps
    .filter(
      (s) =>
        s.document?.kind === 'Drucksache' &&
        s.document.publisher === 'Bundestag' &&
        s.title.startsWith('Gesetzentwurf') &&
        s.document.number,
    )
    .map((s) => s.document!.number!);
  return [...new Set(nrs)];
}

/**
 * Namentliche Abstimmungen, die eindeutig zu diesem Gesetz gehören: Sie verweisen auf eine
 * Bundestagsdrucksache „Gesetzentwurf“ dieses Vorgangs. (Beschlussempfehlungen reichen nicht,
 * weil eine Beschlussempfehlung mehrere Vorlagen umfassen kann.) Chronologisch.
 */
export function matchPolls(l: Pick<Legislation, 'steps'>, polls: PollSummary[]): PollSummary[] {
  const bills = new Set(billDrucksachen(l));
  if (bills.size === 0) return [];
  return polls
    .filter((p) => p.drucksachen.some((d) => bills.has(d)))
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.id - b.id);
}

/** Chronologisch; bei gleichem Datum in der Reihenfolge der Erfassung (ID). */
export function compareSteps(a: LegislationStep, b: LegislationStep): number {
  return a.date.localeCompare(b.date) || Number(a.id) - Number(b.id);
}

/** Lokales Kalenderdatum als ISO-Text (JJJJ-MM-TT). */
export function localIsoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Tage zu einem ISO-Datum addieren (ohne Zeitzonen-Effekte). */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** Montag der Kalenderwoche eines ISO-Datums. */
export function mondayOf(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sonntag
  return addDays(iso, -((weekday + 6) % 7));
}

/**
 * Zeitraum des Wochenüberblicks – schneidet nie eine Sitzungswoche ab:
 * - Gab es in den letzten 7 Tagen (heute eingeschlossen) eine Bundestagssitzung → ab dem Montag der
 *   Sitzungswoche der frühesten dieser Sitzungen bis heute (höchstens knapp zwei Wochen).
 * - Sonst die Kalenderwoche (Mo–So) der letzten Bundestagssitzung.
 * - Ist keine Sitzung bekannt → die letzten 7 Tage, gekennzeichnet.
 */
export function weekWindow(today: string, bundestagSessionDates: string[]): WeekWindow {
  const start7 = addDays(today, -6);
  const past = bundestagSessionDates.filter((d) => d <= today).sort();
  const latest = past[past.length - 1];
  if (!latest) return { start: start7, end: today, kind: 'noSessionFound' };
  const recent = past.filter((d) => d >= start7);
  if (recent.length > 0) return { start: mondayOf(recent[0]), end: today, kind: 'recentSittingWeek' };
  const monday = mondayOf(latest);
  return { start: monday, end: addDays(monday, 6), kind: 'lastSittingWeek' };
}

export function inWindow(date: string | null | undefined, w: Pick<WeekWindow, 'start' | 'end'>): boolean {
  if (!date) return false;
  const day = date.slice(0, 10);
  return day >= w.start && day <= w.end;
}

/** Abstimmungen im Zeitraum, chronologisch (älteste zuerst). */
export function pollsInWindow(polls: PollSummary[], w: Pick<WeekWindow, 'start' | 'end'>): PollSummary[] {
  return polls
    .filter((p) => inWindow(p.date, w))
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.id - b.id);
}

export const UNKNOWN_STATUS = 'Ohne Angabe zum Beratungsstand';

/**
 * Gruppiert nach amtlichem Beratungsstand (Gruppen alphabetisch),
 * innerhalb einer Gruppe chronologisch nach dem ersten Schritt im Zeitraum, dann nach Titel.
 */
export function groupByStatus(items: WeekProceeding[]): { status: string; items: WeekProceeding[] }[] {
  const groups = new Map<string, WeekProceeding[]>();
  for (const item of items) {
    const key = item.status?.trim() || UNKNOWN_STATUS;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const firstDate = (p: WeekProceeding) => p.steps[0]?.date ?? '9999';
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'de'))
    .map(([status, list]) => ({
      status,
      items: [...list].sort(
        (a, b) => firstDate(a).localeCompare(firstDate(b)) || a.title.localeCompare(b.title, 'de'),
      ),
    }));
}
