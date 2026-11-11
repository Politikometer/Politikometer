/**
 * Datenmodell für Regierungsämter (Bundeskanzler/in, Bundesministerinnen und -minister).
 * Screens arbeiten nur mit diesen Typen – nie mit den Formaten der Quellen.
 */
import type { SourceRef } from '@/domain/model';

/** Ein Regierungsamt mit der Person, die es derzeit innehat. */
export type GovernmentOffice = {
  /** Amtsbezeichnung, passend zur Person, z. B. „Bundeskanzler“ oder „Bundeskanzlerin“. */
  title: string;
  /** Wikidata-ID der Person, z. B. „Q566257“. */
  wikidataId: string;
  name: string;
  /** ISO-Datum (JJJJ-MM-TT) des Amtsantritts laut Quelle. */
  inOfficeSince: string | null;
  /** Parteizugehörigkeit – nur als Angabe, ohne Wertung. */
  party: { name: string; shortName: string | null } | null;
  source: SourceRef;
};

/** Ein Amt im Kabinett, z. B. „Bundesministerin der Finanzen“ oder „Vizekanzler“. */
export type CabinetOffice = {
  /** Amtsbezeichnung laut Quelle, passend zum in der Quelle angegebenen Geschlecht. */
  title: string;
  /** Wikidata-ID des Amtes. */
  wikidataId: string;
  /** Geleitete Behörde laut Quelle, z. B. „Bundesministerium der Finanzen“. */
  ministry: string | null;
  /** ISO-Datum des Amtsantritts; null, wenn die Quelle keine eindeutige Angabe hat. */
  since: string | null;
};

/** Ein Mitglied der Bundesregierung mit allen derzeitigen Ämtern im Kabinett. */
export type CabinetMember = {
  kind: 'member';
  /** Wikidata-ID der Person. */
  wikidataId: string;
  name: string;
  /** Erstes Amt = Hauptamt (Ministerium vor Zusatzamt wie „Vizekanzler“). */
  offices: CabinetOffice[];
  /** Kanzlerin bzw. Kanzler (leitet die Bundesregierung, Art. 65 Grundgesetz). */
  isHeadOfGovernment: boolean;
  party: { name: string; shortName: string | null } | null;
  source: SourceRef;
};

/** Ein Amt, für das die Quelle derzeit keine eindeutige Person nennt – wir raten nicht. */
export type UnclearCabinetOffice = {
  kind: 'unclear';
  title: string;
  wikidataId: string;
  reason: string;
  source: SourceRef;
};

export type CabinetEntry = CabinetMember | UnclearCabinetOffice;

/** Das amtierende Bundeskabinett. */
export type Cabinet = {
  wikidataId: string;
  /** Name laut Quelle, z. B. „Kabinett Merz“. */
  name: string | null;
  since: string | null;
  /** Kanzler/in zuerst, danach alphabetisch nach Ressort. */
  entries: CabinetEntry[];
  source: SourceRef;
};

/**
 * Mitgelieferter Stand der Bundesregierung (Datei `assets/data/regierung.json`), erzeugt beim
 * Entwickeln aus Wikidata (CC0) – die App fragt Wikidata nicht selbst ab. Die Gegenprüfung mit
 * DIP findet weiterhin live auf dem Gerät statt.
 */
export type GovernmentSnapshot = {
  /** Version des Dateiformats. */
  format: 1;
  /** ISO-Zeitstempel des Abrufs bei Wikidata („Stand“). */
  retrievedAt: string;
  /** Stichtag (JJJJ-MM-TT), an dem ausgewertet wurde, wer im Amt ist. */
  evaluatedFor: string;
  source: { publisher: 'Wikidata'; url: string; license: 'CC0 1.0' };
  /** Amtierende/r Bundeskanzler/in laut Wikidata (Q183, Eigenschaft P6). */
  chancellor: GovernmentOffice;
  cabinet: Cabinet;
};

/**
 * Zuordnung eines Regierungsmitglieds in der Parlamentsdokumentation DIP.
 * DIP führt eine Person teils mehrfach (je Amt und als Abgeordnete/r) – daher mehrere IDs.
 */
export type DipGovernmentPerson = { ids: string[] };

/** Kammer, in der eine Aktivität dokumentiert ist. */
export type Chamber = 'Bundestag' | 'Bundesrat';

/** Eine dokumentierte Aktivität einer Person im Parlament (Rede, Antwort, …). */
export type ParliamentaryActivity = {
  id: string;
  /** Amtliche Aktivitätsart, z. B. „Rede“ oder „Antwort“ – unverändert aus der Quelle. */
  kind: string;
  /** ISO-Datum (JJJJ-MM-TT). */
  date: string;
  chamber: Chamber | null;
  /** Titel der zugehörigen Vorgänge (Themen), höchstens einige wenige. */
  topics: string[];
  /** Anzahl weiterer zugehöriger Vorgänge, die nicht in `topics` stehen. */
  moreTopicsCount: number;
  /** Amtliche Fundstelle, z. B. „BT-Plenarprotokoll 21/101, S. 12642C“. */
  documentLabel: string | null;
  /** Link auf das Originaldokument (PDF). */
  documentUrl: string | null;
  source: SourceRef;
};

/** Ein parlamentarischer Vorgang, z. B. ein Gesetzentwurf. */
export type Proceeding = {
  id: string;
  title: string;
  /** ISO-Datum (JJJJ-MM-TT) laut Quelle. */
  date: string | null;
  /** Amtlicher Beratungsstand, z. B. „Überwiesen“ oder „Verkündet“. */
  status: string | null;
  /** Amtlicher Vorgangstyp, z. B. „Gesetzgebung“. */
  type: string;
  /** Initiative laut Quelle, z. B. [„Bundesregierung“]. */
  initiative: string[];
  source: SourceRef;
};

/** Ein Ausschnitt einer längeren Liste, die seitenweise geladen wird. */
export type PagedList<T> = {
  items: T[];
  /** Gesamtzahl der Treffer laut Quelle. */
  total: number;
  /** Zum Laden der nächsten Seite; `null`, wenn alles geladen ist. */
  nextCursor: string | null;
  retrievedAt: string;
};

/** Die Quelle liefert keine eindeutige Antwort – wir raten nicht. */
export class AmbiguousDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AmbiguousDataError';
  }
}
