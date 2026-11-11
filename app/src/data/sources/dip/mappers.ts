/** Übersetzt DIP-Daten ins interne Datenmodell. */
import type { Chamber, PagedList, ParliamentaryActivity, Proceeding } from '@/domain/government';
import {
  compareSteps,
  type Legislation,
  type LegislationStep,
  type OfficialDocument,
  type PlenarySession,
  type WeekProceeding,
} from '@/domain/legislation';
import type { SourceRef } from '@/domain/model';
import { htmlToText } from '@/data/sources/abgeordnetenwatch/html';

import { DIP_LICENSE, DIP_PORTAL_URL, DIP_PUBLISHER } from './config';
import type {
  DipAktivitaet,
  DipList,
  DipPerson,
  DipPlenarprotokoll,
  DipVorgang,
  DipVorgangDetail,
  DipVorgangsposition,
} from './schemas';

/** Wie viele Vorgangstitel einer Aktivität wir direkt nennen. */
export const MAX_TOPICS = 2;

/** Nachbau der Link-Erzeugung des DIP-Portals: /<art>/<titel-als-slug>/<id>. */
export function slugify(title: string): string {
  return title
    .split(' ')
    .slice(0, 10)
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9äöüß-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function portalUrl(kind: 'vorgang' | 'aktivität' | 'plenarprotokoll', title: string, id: string): string {
  const slug = encodeURIComponent(slugify(title) || kind);
  return `${DIP_PORTAL_URL}/${encodeURI(kind)}/${slug}/${id}`;
}

export function sourceRef(url: string, retrievedAt: string): SourceRef {
  return { publisher: DIP_PUBLISHER, url, license: DIP_LICENSE, retrievedAt };
}

function chamberOf(herausgeber: string | null | undefined): Chamber | null {
  if (herausgeber === 'BT') return 'Bundestag';
  if (herausgeber === 'BR') return 'Bundesrat';
  return null;
}

/**
 * Amtliche Fundstelle in der von den DIP-Nutzungsbedingungen verlangten Form,
 * z. B. „BT-PlPr. 21/101, S. 12642C“ oder „BT-Drs. 21/1234“.
 */
export function documentLabel(f: DipAktivitaet['fundstelle']): string | null {
  if (!f?.dokumentnummer) return null;
  const prefix = f.herausgeber === 'BR' ? 'BR' : f.herausgeber === 'BT' ? 'BT' : f.herausgeber;
  const kind = f.dokumentart === 'Plenarprotokoll' ? 'PlPr.' : f.dokumentart === 'Drucksache' ? 'Drs.' : null;
  const head = [prefix && kind ? `${prefix}-${kind}` : kind ?? prefix, f.dokumentnummer]
    .filter(Boolean)
    .join(' ');
  return f.seite ? `${head}, S. ${f.seite}` : head;
}

export function mapActivity(a: DipAktivitaet, retrievedAt: string): ParliamentaryActivity {
  const related = a.vorgangsbezug ?? [];
  // Doppelte Titel (z. B. mehrere gleichnamige Entschließungsanträge) nur einmal nennen.
  const uniqueTitles = [...new Set(related.map((v) => v.titel.replace(/\s+/g, ' ').trim()))];
  const total = Math.max(a.vorgangsbezug_anzahl ?? related.length, related.length);
  const topics = uniqueTitles.slice(0, MAX_TOPICS);
  const shownRelated = related.filter((v) => topics.includes(v.titel.replace(/\s+/g, ' ').trim())).length;
  return {
    id: a.id,
    kind: a.aktivitaetsart,
    date: a.datum,
    chamber: chamberOf(a.fundstelle?.herausgeber),
    topics: topics.length ? topics : a.abstract ? [a.abstract] : [],
    moreTopicsCount: Math.max(0, total - shownRelated),
    documentLabel: documentLabel(a.fundstelle),
    documentUrl: a.fundstelle?.pdf_url ?? null,
    source: sourceRef(portalUrl('aktivität', a.titel, a.id), retrievedAt),
  };
}

export function mapProceeding(v: DipVorgang, retrievedAt: string): Proceeding {
  return {
    id: v.id,
    title: v.titel,
    date: v.datum ?? null,
    status: v.beratungsstand ?? null,
    type: v.vorgangstyp,
    initiative: v.initiative ?? [],
    source: sourceRef(portalUrl('vorgang', v.titel, v.id), retrievedAt),
  };
}

/** Ändert sich der cursor nicht mehr (oder kommt nichts mehr), ist alles geladen. */
export function nextCursor(res: DipList<unknown>, requestCursor: string | null | undefined): string | null {
  if (res.documents.length === 0) return null;
  return res.cursor && res.cursor !== requestCursor ? res.cursor : null;
}

export function mapPage<S, T>(
  res: DipList<S>,
  requestCursor: string | null | undefined,
  map: (item: S) => T,
  retrievedAt: string,
): PagedList<T> {
  return {
    items: res.documents.map(map),
    total: res.numFound,
    nextCursor: nextCursor(res, requestCursor),
    retrievedAt,
  };
}

function normalizeName(name: string): string {
  return name.toLocaleLowerCase('de').replace(/[-‐]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function fullName(p: DipPerson): string {
  return [p.vorname, p.namenszusatz, p.nachname].filter(Boolean).join(' ');
}

/** Hat die Person laut DIP die Funktion Bundeskanzler/in (amtlich abgekürzt „Bundeskanzl.“)? */
export function isChancellor(p: DipPerson): boolean {
  return (p.funktion ?? []).some((f) => /^bundeskanzl/i.test(f.trim()));
}

/** Alle DIP-Personen mit genau diesem Namen und der Funktion Bundeskanzler/in. */
export function matchChancellor(persons: DipPerson[], name: string): DipPerson[] {
  const wanted = normalizeName(name);
  return persons.filter((p) => isChancellor(p) && normalizeName(fullName(p)) === wanted);
}

// ---------- Gesetzgebung („Gesetz verfolgen“, Wochenüberblick) ----------

const BODIES: Record<string, string> = {
  BT: 'Bundestag',
  BR: 'Bundesrat',
  BV: 'Bundesversammlung',
  EK: 'Europakammer des Bundesrates',
};

/** „BT“ → „Bundestag“ usw.; unbekannte Kürzel unverändert. */
export function bodyName(code: string | null | undefined): string | null {
  if (!code) return null;
  return BODIES[code] ?? code;
}

function pageRange(f: NonNullable<DipVorgangsposition['fundstelle']>): string | null {
  if (f.anfangsseite == null) return f.seite ?? null;
  const from = `${f.anfangsseite}${f.anfangsquadrant ?? ''}`;
  const to = f.endseite != null ? `${f.endseite}${f.endquadrant ?? ''}` : null;
  return to && to !== from ? `${from}–${to}` : from;
}

/**
 * Fundstelle eines Schritts in der Form der DIP-Nutzungsbedingungen,
 * z. B. „BT-Drs. 21/7869“ oder „BT-PlPr. 21/102, S. 12903A–12909A“.
 */
export function positionDocument(f: DipVorgangsposition['fundstelle']): OfficialDocument | null {
  if (!f?.dokumentnummer) return null;
  const kind =
    f.dokumentart === 'Drucksache' ? 'Drucksache' : f.dokumentart === 'Plenarprotokoll' ? 'Plenarprotokoll' : 'Dokument';
  const abbr = kind === 'Drucksache' ? 'Drs.' : kind === 'Plenarprotokoll' ? 'PlPr.' : null;
  const prefix = f.herausgeber && abbr ? `${f.herausgeber}-${abbr}` : (abbr ?? f.herausgeber ?? '');
  const head = [prefix, f.dokumentnummer].filter(Boolean).join(' ');
  const pages = kind === 'Plenarprotokoll' ? pageRange(f) : null;
  return {
    kind,
    label: pages ? `${head}, S. ${pages}` : head,
    number: f.dokumentnummer,
    publisher: bodyName(f.herausgeber),
    documentType: f.drucksachetyp ?? null,
    url: f.pdf_url ?? null,
  };
}

export function mapStep(p: DipVorgangsposition): LegislationStep {
  return {
    id: p.id,
    proceedingId: p.vorgang_id,
    date: p.datum,
    title: p.vorgangsposition,
    body: bodyName(p.zuordnung),
    note: p.fortsetzung ? 'Fortsetzung' : p.nachtrag ? 'Nachtrag' : null,
    authors: [...new Set((p.urheber ?? []).map((u) => u.titel))],
    committees: (p.ueberweisung ?? []).map((u) => ({ name: u.ausschuss, lead: !!u.federfuehrung })),
    decisions: (p.beschlussfassung ?? []).map((b) => ({
      text: b.beschlusstenor,
      method: b.abstimmungsart ?? null,
      result: b.abstimm_ergebnis_bemerkung ?? null,
      majority: b.mehrheit ?? null,
    })),
    summary: htmlToText(p.abstract),
    document: positionDocument(p.fundstelle),
  };
}

export function mapLegislation(
  v: DipVorgangDetail,
  positions: DipVorgangsposition[],
  missingSteps: number,
  retrievedAt: string,
): Legislation {
  return {
    id: v.id,
    title: v.titel,
    type: v.vorgangstyp,
    status: v.beratungsstand ?? null,
    initiative: v.initiative ?? [],
    electoralPeriod: v.wahlperiode ?? null,
    lastDocumentDate: v.datum ?? null,
    summary: htmlToText(v.abstract),
    subjects: v.sachgebiet ?? [],
    consent: v.zustimmungsbeduerftigkeit ?? [],
    promulgations: (v.verkuendung ?? []).map((p) => ({
      date: p.verkuendungsdatum ?? null,
      signedOn: p.ausfertigungsdatum ?? null,
      citation: p.fundstelle ?? null,
      gazette: p.verkuendungsblatt_bezeichnung ?? null,
      url: p.pdf_url ?? null,
    })),
    entryIntoForce: (v.inkrafttreten ?? [])
      .filter((i): i is { datum: string; erlaeuterung?: string | null } => !!i.datum)
      .map((i) => ({ date: i.datum, note: i.erlaeuterung?.trim() || null }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    steps: positions.filter((p) => p.vorgang_id === v.id).map(mapStep).sort(compareSteps),
    missingSteps,
    source: sourceRef(portalUrl('vorgang', v.titel, v.id), retrievedAt),
  };
}

/** Vorgänge mit ihren Schritten im Zeitraum (Schritte chronologisch). */
export function mapWeekProceedings(
  vorgaenge: DipVorgang[],
  positions: DipVorgangsposition[],
  retrievedAt: string,
): WeekProceeding[] {
  const stepsById = new Map<string, LegislationStep[]>();
  for (const p of positions) {
    stepsById.set(p.vorgang_id, [...(stepsById.get(p.vorgang_id) ?? []), mapStep(p)]);
  }
  const seen = new Set<string>();
  return vorgaenge
    .filter((v) => !seen.has(v.id) && seen.add(v.id))
    .map((v) => ({
      id: v.id,
      title: v.titel,
      status: v.beratungsstand ?? null,
      initiative: v.initiative ?? [],
      steps: (stepsById.get(v.id) ?? []).sort(compareSteps),
      source: sourceRef(portalUrl('vorgang', v.titel, v.id), retrievedAt),
    }));
}

export function mapPlenarySession(p: DipPlenarprotokoll, retrievedAt: string): PlenarySession {
  return {
    id: p.id,
    date: p.datum,
    body: bodyName(p.herausgeber),
    title: p.titel,
    remark: p.sitzungsbemerkung?.trim() || null,
    document: {
      kind: 'Plenarprotokoll',
      label: `${p.herausgeber}-PlPr. ${p.dokumentnummer}`,
      number: p.dokumentnummer,
      publisher: bodyName(p.herausgeber),
      documentType: null,
      url: p.fundstelle?.pdf_url ?? null,
    },
    source: sourceRef(portalUrl('plenarprotokoll', p.titel, p.id), retrievedAt),
  };
}
