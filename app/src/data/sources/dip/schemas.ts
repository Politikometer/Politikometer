/**
 * Schemas für die DIP-API (OpenAPI 1.5: https://search.dip.bundestag.de/api/v1/openapi.yaml).
 * Nur die Felder, die wir nutzen. Unbekannte Felder werden ignoriert.
 * Abweichungen der echten Antworten von der OpenAPI-Datei sind berücksichtigt
 * (z. B. ist `funktion` bei Personen ein Array statt eines Textes).
 */
import { z } from 'zod';

/** Text oder Liste von Texten → immer Liste. */
const stringOrList = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v : [v]));

export const personSchema = z.object({
  id: z.string(),
  nachname: z.string(),
  vorname: z.string(),
  namenszusatz: z.string().nullish(),
  titel: z.string(),
  funktion: stringOrList.nullish(),
  wahlperiode: z.array(z.number()).nullish(),
  aktualisiert: z.string(),
});

export const fundstelleSchema = z.object({
  id: z.string().nullish(),
  dokumentart: z.string().nullish(),
  dokumentnummer: z.string().nullish(),
  datum: z.string().nullish(),
  /** „BT“ oder „BR“ (laut OpenAPI auch „BV“, „EK“). */
  herausgeber: z.string().nullish(),
  pdf_url: z.string().nullish(),
  seite: z.string().nullish(),
});

export const vorgangsbezugSchema = z.object({
  id: z.string(),
  titel: z.string(),
  vorgangstyp: z.string().nullish(),
  vorgangsposition: z.string().nullish(),
});

export const aktivitaetSchema = z.object({
  id: z.string(),
  aktivitaetsart: z.string(),
  dokumentart: z.string().nullish(),
  wahlperiode: z.number().nullish(),
  datum: z.string(),
  titel: z.string(),
  person_id: z.string().nullish(),
  abstract: z.string().nullish(),
  fundstelle: fundstelleSchema.nullish(),
  vorgangsbezug: z.array(vorgangsbezugSchema).nullish(),
  vorgangsbezug_anzahl: z.number().nullish(),
});

export const vorgangSchema = z.object({
  id: z.string(),
  titel: z.string(),
  vorgangstyp: z.string(),
  beratungsstand: z.string().nullish(),
  wahlperiode: z.number().nullish(),
  initiative: z.array(z.string()).nullish(),
  datum: z.string().nullish(),
  aktualisiert: z.string().nullish(),
  /** Kurze amtliche Zusammenfassung, teils mit einfachem HTML (<br />, <strong>). */
  abstract: z.string().nullish(),
});

/** Verkündung eines Gesetzes im Verkündungsblatt (z. B. „BGBl I 2026, 309“). */
export const verkuendungSchema = z.object({
  ausfertigungsdatum: z.string().nullish(),
  verkuendungsdatum: z.string().nullish(),
  fundstelle: z.string().nullish(),
  verkuendungsblatt_bezeichnung: z.string().nullish(),
  pdf_url: z.string().nullish(),
});

/** Einzelner Vorgang (/vorgang/{id}) mit Angaben, die die Liste nicht immer enthält. */
export const vorgangDetailSchema = vorgangSchema.extend({
  sachgebiet: z.array(z.string()).nullish(),
  zustimmungsbeduerftigkeit: z.array(z.string()).nullish(),
  verkuendung: z.array(verkuendungSchema).nullish(),
  inkrafttreten: z.array(z.object({ datum: z.string().nullish(), erlaeuterung: z.string().nullish() })).nullish(),
});

/** Fundstelle eines Vorgangsschritts: Drucksache oder Plenarprotokoll (mit Seiten). */
export const positionFundstelleSchema = fundstelleSchema.extend({
  drucksachetyp: z.string().nullish(),
  urheber: z.array(z.string()).nullish(),
  anfangsseite: z.number().nullish(),
  endseite: z.number().nullish(),
  anfangsquadrant: z.string().nullish(),
  endquadrant: z.string().nullish(),
});

export const beschlussfassungSchema = z.object({
  beschlusstenor: z.string(),
  abstimmungsart: z.string().nullish(),
  abstimm_ergebnis_bemerkung: z.string().nullish(),
  mehrheit: z.string().nullish(),
  dokumentnummer: z.string().nullish(),
});

/** Vorgangsposition = ein Schritt im Ablauf eines Vorgangs (/vorgangsposition). */
export const vorgangspositionSchema = z.object({
  id: z.string(),
  vorgangsposition: z.string(),
  /** „BT“, „BR“, „BV“ oder „EK“. */
  zuordnung: z.string().nullish(),
  fortsetzung: z.boolean().nullish(),
  nachtrag: z.boolean().nullish(),
  vorgangstyp: z.string().nullish(),
  titel: z.string(),
  dokumentart: z.string().nullish(),
  vorgang_id: z.string(),
  datum: z.string(),
  abstract: z.string().nullish(),
  fundstelle: positionFundstelleSchema.nullish(),
  urheber: z.array(z.object({ titel: z.string() })).nullish(),
  ueberweisung: z
    .array(z.object({ ausschuss: z.string(), federfuehrung: z.boolean().nullish() }))
    .nullish(),
  beschlussfassung: z.array(beschlussfassungSchema).nullish(),
});

/** Plenarprotokoll = Protokoll einer Sitzung von Bundestag oder Bundesrat (/plenarprotokoll). */
export const plenarprotokollSchema = z.object({
  id: z.string(),
  dokumentnummer: z.string(),
  wahlperiode: z.number().nullish(),
  /** „BT“ oder „BR“. */
  herausgeber: z.string(),
  datum: z.string(),
  titel: z.string(),
  sitzungsbemerkung: z.string().nullish(),
  fundstelle: z.object({ pdf_url: z.string().nullish() }).nullish(),
});

export const listResponse = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    numFound: z.number(),
    cursor: z.string(),
    documents: z.array(item),
  });

export type DipVorgangDetail = z.infer<typeof vorgangDetailSchema>;
export type DipVorgangsposition = z.infer<typeof vorgangspositionSchema>;
export type DipPlenarprotokoll = z.infer<typeof plenarprotokollSchema>;
export type DipPerson = z.infer<typeof personSchema>;
export type DipAktivitaet = z.infer<typeof aktivitaetSchema>;
export type DipVorgang = z.infer<typeof vorgangSchema>;
export type DipList<T> = { numFound: number; cursor: string; documents: T[] };
