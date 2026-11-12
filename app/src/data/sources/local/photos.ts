import { PHOTO_EXTRA, PHOTO_INDEX, PHOTO_KEY_BY_QID } from '@/data/sources/local/photo-index';

/** Bildnachweis zu einem mitgelieferten Porträt (Wikimedia Commons). */
export type PhotoCredit = {
  /** Name der abgebildeten Person. */
  name?: string;
  author: string;
  license: string;
  licenseUrl: string | null;
  /** Seite des Bildes bei Wikimedia Commons. */
  page: string;
};

type CreditsFile = { retrievedAt: string; credits: Record<string, PhotoCredit> };

const file = require('../../../../assets/data/fotos.json') as CreditsFile;

/** Bildquelle für `<Image source>` oder null, wenn es kein frei lizenziertes Foto gibt. */
export function photoSource(politicianId: number): number | null {
  return PHOTO_INDEX[politicianId] ?? null;
}

function sourceByKey(key: string | undefined): number | null {
  if (!key) return null;
  return PHOTO_EXTRA[key] ?? PHOTO_INDEX[Number(key)] ?? null;
}

/** Wie `photoSource`, aber über die Wikidata-Kennung – für Mitglieder der Bundesregierung. */
export function photoSourceByQid(qid: string): number | null {
  return sourceByKey(PHOTO_KEY_BY_QID[qid]);
}

export function photoCredit(politicianId: number): PhotoCredit | null {
  if (!PHOTO_INDEX[politicianId]) return null;
  return file.credits[String(politicianId)] ?? null;
}

export function photoCreditByQid(qid: string): PhotoCredit | null {
  const key = PHOTO_KEY_BY_QID[qid];
  if (!sourceByKey(key)) return null;
  return file.credits[key] ?? null;
}

/** Alle Bildnachweise. `key` ist die abgeordnetenwatch-Kennung oder (ohne Mandat) die Wikidata-Kennung. */
export function allPhotoCredits(): { key: string; credit: PhotoCredit }[] {
  return Object.entries(file.credits)
    .filter(([key]) => sourceByKey(key))
    .map(([key, credit]) => ({ key, credit }));
}

export const PHOTOS_RETRIEVED_AT = file.retrievedAt;
