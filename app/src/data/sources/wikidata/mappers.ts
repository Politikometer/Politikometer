/** Wertet Wikidata-Aussagen aus – ohne zu raten: Ist etwas nicht eindeutig, wird das gemeldet. */
import type { SourceRef } from '@/domain/model';

import { WD, WIKIDATA_ENTITY_URL } from './ids';
import {
  entityIdValue,
  monolingualValue,
  timeValue,
  type WdClaim,
  type WdLabelsResponse,
  type WdSnak,
} from './schemas';

export const PUBLISHER = 'Wikidata';
export const LICENSE = 'CC0 1.0';

/**
 * Quelle eines Wikidata-Eintrags. Wikidata-Angaben stammen immer aus der mitgelieferten Datei
 * `assets/data/regierung.json` (Build-Skript), deshalb `snapshot: true` („Stand“ statt „abgerufen“).
 */
export function sourceRef(entityId: string, retrievedAt: string): SourceRef {
  return {
    publisher: PUBLISHER,
    url: `${WIKIDATA_ENTITY_URL}${entityId}`,
    license: LICENSE,
    retrievedAt,
    snapshot: true,
  };
}

export function entityIdOf(snak: WdSnak | undefined): string | null {
  const parsed = entityIdValue.safeParse(snak?.datavalue?.value);
  return parsed.success ? parsed.data.id : null;
}

/**
 * Wikidata-Zeit („+2025-05-06T00:00:00Z“) → „2025-05-06“.
 * Nur bei taggenauer Angabe (precision ≥ 11); sonst null, damit kein falsches Datum entsteht.
 */
export function wdTimeToDate(snak: WdSnak | undefined): string | null {
  const parsed = timeValue.safeParse(snak?.datavalue?.value);
  if (!parsed.success) return null;
  const { time, precision } = parsed.data;
  if (typeof precision === 'number' && precision < 11) return null;
  const match = /^\+?(\d{4}-\d{2}-\d{2})T/.exec(time);
  return match ? match[1] : null;
}

function qualifier(claim: WdClaim, property: string): WdSnak | undefined {
  return claim.qualifiers?.[property]?.[0];
}

/** Gilt die Aussage am Stichtag? Ohne Endzeitpunkt gilt sie fort. */
export function isCurrent(claim: WdClaim, today: string): boolean {
  if (claim.rank === 'deprecated') return false;
  const endSnak = qualifier(claim, WD.endTime);
  // „unbekannter Endzeitpunkt“ (somevalue) heißt: beendet, Datum unbekannt.
  if (endSnak && endSnak.snaktype === 'somevalue') return false;
  const end = wdTimeToDate(endSnak);
  if (end && end <= today) return false;
  const start = wdTimeToDate(qualifier(claim, WD.startTime));
  if (start && start > today) return false;
  return true;
}

export type CurrentHolder = { entityId: string; since: string | null };

/**
 * Wählt die aktuell gültige Aussage (z. B. den amtierenden Regierungschef).
 * Gibt es mehrere, entscheidet der Rang „bevorzugt“. Bleibt es mehrdeutig, enthält das
 * Ergebnis mehrere Einträge – die aufrufende Stelle entscheidet dann, nicht zu raten.
 */
export function selectCurrent(claims: WdClaim[], today: string): CurrentHolder[] {
  const current = claims.filter((c) => isCurrent(c, today) && entityIdOf(c.mainsnak));
  const preferred = current.filter((c) => c.rank === 'preferred');
  const chosen = current.length > 1 && preferred.length ? preferred : current;
  return chosen.map((c) => ({
    entityId: entityIdOf(c.mainsnak)!,
    since: wdTimeToDate(qualifier(c, WD.startTime)),
  }));
}

export function labelOf(res: WdLabelsResponse, id: string): string | null {
  return res.entities[id]?.labels?.de?.value ?? null;
}

/** Deutscher Kurzname (z. B. „CDU“) aus den Aussagen zu P1813. */
export function germanShortName(claims: WdClaim[]): string | null {
  for (const c of claims) {
    if (c.rank === 'deprecated') continue;
    const parsed = monolingualValue.safeParse(c.mainsnak.datavalue?.value);
    if (parsed.success && parsed.data.language === 'de') return parsed.data.text;
  }
  return null;
}

/** Amtsbezeichnung passend zum in Wikidata angegebenen Geschlecht. */
export function chancellorTitle(sexClaims: WdClaim[]): string {
  const female = sexClaims.some((c) => c.rank !== 'deprecated' && entityIdOf(c.mainsnak) === WD.female);
  return female ? 'Bundeskanzlerin' : 'Bundeskanzler';
}
