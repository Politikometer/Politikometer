/**
 * Erzeugt den mitgelieferten Stand der Bundesregierung aus Wikidata-Rohdaten.
 *
 * Wird NUR vom Build-Skript `tools/regierung/build.mjs` (beim Entwickeln) und von den Tests
 * benutzt – nie in der App. Die Abfragen selbst (HTTP, Endpunkte, Kennung) stehen im Skript;
 * hier steht nur, WAS abgefragt und WIE ausgewertet wird. So prüfen die Tests mit echten
 * Antworten (Fixtures) genau die Logik, die die Datei erzeugt.
 *
 * Bundeskanzler/in: Q183 „Deutschland“, Eigenschaft P6 „Regierungschef“, gültige Aussage ohne
 * Endzeitpunkt; bei Mehrdeutigkeit kein Ergebnis (wir raten nicht).
 * Bundeskabinett: drei SPARQL-Abfragen, Auswertung in `cabinet.ts`:
 * 1. amtierendes Kabinett = Regierungsorgan Deutschlands (Q183/P208) mit Beginn und ohne Ende,
 * 2. dessen Mitglieder (P527 mit Rolle) und Ämter mit Kabinettsbezug (P39/P5054),
 * 3. alle Amtsaussagen (P39) zu diesen Ämtern seit Kabinettsbeginn (Ende, Vorgänger, Nachfolger).
 */
import { AmbiguousDataError, type Cabinet, type GovernmentOffice, type GovernmentSnapshot } from '@/domain/government';
import { localIsoDate } from '@/domain/legislation';

import { buildCabinet, rolesOf, selectCurrentCabinets } from './cabinet';
import { WD, WIKIDATA_ENTITY_URL } from './ids';
import { chancellorTitle, germanShortName, LICENSE, labelOf, PUBLISHER, selectCurrent, sourceRef } from './mappers';
import type { WdClaim, WdLabelsResponse } from './schemas';
import { cabinetsQuery, holdersQuery, membershipQuery, type SparqlBinding } from './sparql';

/** Lesender Zugriff auf Wikidata – im Build-Skript per HTTP, in Tests aus Fixtures. */
export type WikidataReader = {
  /** SPARQL-Abfrage (Endpunkt steht im Build-Skript) → Ergebniszeilen. */
  select(query: string): Promise<SparqlBinding[]>;
  /** Action-API wbgetclaims → Aussagen der Eigenschaft. */
  getClaims(entityId: string, property: string): Promise<WdClaim[]>;
  /** Action-API wbgetentities → deutsche Bezeichnungen. */
  getLabels(ids: string[]): Promise<WdLabelsResponse>;
};

/** Amtierendes Bundeskabinett. Wirft, wenn das Kabinett selbst nicht eindeutig ist. */
export async function fetchCabinet(reader: WikidataReader, now: Date): Promise<Cabinet> {
  const retrievedAt = now.toISOString();
  const today = localIsoDate(now);
  const cabinets = selectCurrentCabinets(await reader.select(cabinetsQuery(WD.germany)), today);
  if (cabinets.length !== 1 || !cabinets[0].since) {
    throw new AmbiguousDataError(
      cabinets.length === 0
        ? 'Die Quelle nennt derzeit kein amtierendes Bundeskabinett.'
        : cabinets.length > 1
          ? 'Die Quelle nennt derzeit mehr als ein amtierendes Bundeskabinett.'
          : 'Die Quelle nennt keinen Beginn des Bundeskabinetts.',
    );
  }
  const cabinet = cabinets[0];
  const membershipRows = await reader.select(membershipQuery(cabinet.id));
  const roles = rolesOf(membershipRows);
  if (roles.length === 0) throw new AmbiguousDataError('Die Quelle nennt keine Mitglieder des Bundeskabinetts.');
  const holderRows = await reader.select(holdersQuery(roles, cabinet.id, cabinet.since!));
  return buildCabinet({ cabinet, membershipRows, holderRows, today, retrievedAt });
}

/** Amtierende/r Bundeskanzler/in. Wirft, wenn die Quelle nicht eindeutig ist. */
export async function fetchChancellor(reader: WikidataReader, now: Date): Promise<GovernmentOffice> {
  const retrievedAt = now.toISOString();
  const today = localIsoDate(now);
  const holders = selectCurrent(await reader.getClaims(WD.germany, WD.headOfGovernment), today);
  if (holders.length !== 1) {
    throw new AmbiguousDataError(
      holders.length === 0
        ? 'Die Quelle nennt derzeit keine amtierende Person.'
        : 'Die Quelle nennt derzeit mehr als eine amtierende Person.',
    );
  }
  const { entityId, since } = holders[0];

  const partyClaims = await reader.getClaims(entityId, WD.memberOfParty);
  const sexClaims = await reader.getClaims(entityId, WD.sex);
  const parties = selectCurrent(partyClaims, today);
  // Partei nur angeben, wenn eindeutig.
  const partyId = parties.length === 1 ? parties[0].entityId : null;

  const labels = await reader.getLabels(partyId ? [entityId, partyId] : [entityId]);
  const shortNameClaims = partyId ? await reader.getClaims(partyId, WD.shortName) : [];
  const name = labelOf(labels, entityId);
  if (!name) throw new AmbiguousDataError('Der Name der Person fehlt in der Quelle.');
  const partyName = partyId ? labelOf(labels, partyId) : null;

  return {
    title: chancellorTitle(sexClaims),
    wikidataId: entityId,
    name,
    inOfficeSince: since,
    party: partyName ? { name: partyName, shortName: germanShortName(shortNameClaims) } : null,
    source: sourceRef(entityId, retrievedAt),
  };
}

/**
 * Kanzler/in und Kabinett zusammen. Wirft, wenn eine der beiden Angaben nicht eindeutig ist
 * oder beide nicht dieselbe Person als Regierungschef/in nennen – dann bleibt die bisherige
 * Datei unverändert (lieber ein älterer, eindeutiger Stand als ein geratener).
 */
export async function buildGovernmentSnapshot(reader: WikidataReader, now: Date): Promise<GovernmentSnapshot> {
  const chancellor = await fetchChancellor(reader, now);
  const cabinet = await fetchCabinet(reader, now);
  const heads = cabinet.entries.filter((e) => e.kind === 'member' && e.isHeadOfGovernment);
  if (heads.length !== 1 || heads[0].wikidataId !== chancellor.wikidataId) {
    throw new AmbiguousDataError(
      'Kabinett und Regierungschef/in passen in der Quelle nicht eindeutig zusammen.',
    );
  }
  return {
    format: 1,
    retrievedAt: now.toISOString(),
    evaluatedFor: localIsoDate(now),
    source: { publisher: PUBLISHER, url: `${WIKIDATA_ENTITY_URL}${cabinet.wikidataId}`, license: LICENSE },
    chancellor,
    cabinet,
  };
}
