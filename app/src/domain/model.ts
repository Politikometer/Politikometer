/**
 * Einheitliches internes Datenmodell.
 * Screens arbeiten nur mit diesen Typen – nie mit den Formaten einzelner Quellen.
 */

/** Herkunft einer Angabe. Hängt an jedem Datensatz, der angezeigt wird. */
export type SourceRef = {
  publisher: string;
  /** Link auf die Originalquelle (für Menschen lesbar, nicht die API-URL). */
  url: string;
  license: string;
  /** ISO-Zeitstempel des Abrufs. */
  retrievedAt: string;
  /**
   * true: Die Angabe stammt aus einer mit der App ausgelieferten Datei (z. B. Bundesregierung aus
   * Wikidata), nicht aus einem Abruf auf dem Gerät. `retrievedAt` ist dann der Stand dieser Datei.
   */
  snapshot?: boolean;
};

export type Constituency = {
  number: number;
  name: string;
  /** Bundesland, falls bekannt. */
  state?: string;
};

/** Wie das Mandat zustande kam. */
export type HowElected = 'direct' | 'list' | 'moved_up' | 'unknown';

export type ParliamentTerm = {
  id: number;
  label: string;
};

export type Mandate = {
  id: number;
  politicianId: number;
  politicianName: string;
  parliament: string;
  termLabel: string;
  /** Aktuelle Fraktion, z. B. „SPD“. */
  fraction: string | null;
  howElected: HowElected;
  /** Wahlkreis, in dem die Person kandidiert hat (auch bei Listenmandat). */
  constituency: Constituency | null;
  electoralList: string | null;
  listPosition: number | null;
  start: string | null;
  end: string | null;
  /** Hinweis der Quelle, z. B. zum Nachrücken. */
  note: string | null;
  source: SourceRef;
};

export type Politician = {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
  title: string | null;
  party: string | null;
  birthYear: number | null;
  occupation: string | null;
  education: string | null;
  residence: string | null;
  /** Fragen von Bürgerinnen und Bürgern auf abgeordnetenwatch.de. */
  citizenQuestions: { asked: number; answered: number } | null;
  wikidataId: string | null;
  source: SourceRef;
};

export type VoteChoice = 'yes' | 'no' | 'abstain' | 'no_show';

export type DocumentLink = { label: string; url: string };

/** Eine namentliche Abstimmung im Parlament. */
export type Poll = {
  id: number;
  title: string;
  date: string | null;
  /** Angenommen (true), abgelehnt (false) oder unbekannt (null). */
  accepted: boolean | null;
  topics: string[];
  /** Beschreibung als reiner Text (von abgeordnetenwatch.de verfasst). */
  description: string | null;
  /** Links auf offizielle Dokumente, z. B. Bundestags-Drucksachen. */
  documents: DocumentLink[];
  source: SourceRef;
};

/** Wie eine Person bei einer Abstimmung gestimmt hat. */
export type PollVote = {
  poll: Poll;
  choice: VoteChoice;
  /** Angegebener Grund für eine nicht abgegebene Stimme, falls vorhanden. */
  reasonNoShow: string | null;
};

export type VoteCounts = Record<VoteChoice, number>;

export type PollResult = {
  poll: Poll;
  totals: VoteCounts;
  byFraction: { fraction: string; counts: VoteCounts }[];
  retrievedAt: string;
};

/** Kandidatur bei einer Wahl. */
export type Candidacy = {
  id: number;
  politicianId: number;
  name: string;
  /** Für die Sortierung; ohne Personendaten gleich dem vollen Namen. */
  lastName: string;
  party: string | null;
  electionLabel: string;
  constituency: Constituency | null;
  electoralList: string | null;
  listPosition: number | null;
  source: SourceRef;
};

/** Eine Person mit ihrem Mandat – für Listen. */
export type Representative = {
  politician: Politician;
  mandate: Mandate;
};

/** Kompakter Eintrag für die Liste aller Abgeordneten (bewusst klein, weil der Cache auf dem Gerät liegt). */
export type MemberListEntry = {
  mandateId: number;
  politicianId: number;
  fullName: string;
  firstName: string;
  lastName: string;
  /** Aktuelle Fraktion, z. B. „SPD“ oder „fraktionslos“. */
  fraction: string | null;
  howElected: HowElected;
  constituency: Constituency | null;
  /** Bundesland der Landesliste, z. B. „Bayern“. */
  listState: string | null;
  source: SourceRef;
};
