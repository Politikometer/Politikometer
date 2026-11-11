/**
 * Wikidata-Kennungen und Links (Lizenz der Daten: CC0 1.0).
 *
 * Die App selbst fragt Wikidata NICHT ab (keine Übermittlung von Nutzer-IP-Adressen an die
 * Wikimedia Foundation, USA). Die Abfragen laufen nur beim Entwickeln im Build-Skript
 * `tools/regierung/build.mjs`; die App liest das Ergebnis aus `assets/data/regierung.json`.
 * Hier stehen deshalb nur Kennungen und Links für Menschen – keine Abfrage-Endpunkte.
 */

/** Link auf einen Eintrag (für Menschen lesbar, z. B. „Eintrag bei Wikidata ansehen“). */
export const WIKIDATA_ENTITY_URL = 'https://www.wikidata.org/wiki/';

/** Wikidata-Kennungen, die wir verwenden. */
export const WD = {
  germany: 'Q183',
  /** Eigenschaft „Regierungschef“. */
  headOfGovernment: 'P6',
  /** Eigenschaft „Mitglied der Partei“. */
  memberOfParty: 'P102',
  /** Eigenschaft „Geschlecht“. */
  sex: 'P21',
  /** Eigenschaft „Kurzname“. */
  shortName: 'P1813',
  /** Qualifikator „Startzeitpunkt“. */
  startTime: 'P580',
  /** Qualifikator „Endzeitpunkt“. */
  endTime: 'P582',
  female: 'Q6581072',
  male: 'Q6581097',
  /** Amt „Bundeskanzler der Bundesrepublik Deutschland“. */
  chancellorOffice: 'Q4970706',
  /** „parteilos“ als Wert von P102. */
  independent: 'Q327591',
} as const;
