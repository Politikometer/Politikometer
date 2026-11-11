/**
 * Regierung: setzt den mitgelieferten Stand aus Wikidata (wer hat das Amt?), DIP (was geschieht
 * im Parlament?) und abgeordnetenwatch (gibt es ein Abgeordnetenprofil?) zum internen Datenmodell
 * zusammen.
 *
 * Wer Bundeskanzler/in ist und wer dem Bundeskabinett angehört, steht in der mit der App
 * ausgelieferten Datei `assets/data/regierung.json`. Sie wird beim Entwickeln mit
 * `npm run regierung` aus Wikidata erzeugt (Auswertung in `wikidata/snapshot.ts` und
 * `wikidata/cabinet.ts`). Die App selbst fragt Wikidata nicht ab – es gehen keine IP-Adressen
 * der Nutzenden an die Wikimedia Foundation (USA).
 *
 * LIVE bleiben: die Gegenprüfung jedes Mitglieds in DIP („Bundesmin.“, „Bundeskanzl.“, …), die
 * Aktivitäten und Gesetzentwürfe aus DIP und die Profil-Links zu abgeordnetenwatch.de.
 */
import {
  AmbiguousDataError,
  type Cabinet,
  type CabinetEntry,
  type CabinetMember,
  type DipGovernmentPerson,
  type GovernmentOffice,
  type GovernmentSnapshot,
  type PagedList,
  type ParliamentaryActivity,
  type Proceeding,
} from '@/domain/government';
import { BundestagRepository } from '@/data/repositories/bundestag-repository';
import type { FetchJsonOptions } from '@/data/http/fetch-json';
import { AbgeordnetenwatchClient } from '@/data/sources/abgeordnetenwatch/client';
import { stripPeriodSuffix } from '@/data/sources/abgeordnetenwatch/mappers';
import { searchPoliticiansByName } from '@/data/sources/abgeordnetenwatch/politician-search';
import type { AwPolitician } from '@/data/sources/abgeordnetenwatch/schemas';
import { DipClient } from '@/data/sources/dip/client';
import {
  DipGovernmentClient,
  latestPeriod,
  matchGovernmentPerson,
  type GovernmentRole,
} from '@/data/sources/dip/government';
import { mapActivity, mapPage, mapProceeding, matchChancellor } from '@/data/sources/dip/mappers';
import { governmentSnapshot } from '@/data/sources/local/government-snapshot';
import { sourceRef as wikidataSource } from '@/data/sources/wikidata/mappers';

/** Amtliche Werte der DIP-Filter für Gesetzentwürfe der Bundesregierung. */
export const GOVERNMENT_BILLS_FILTER = { initiative: 'Bundesregierung', type: 'Gesetzgebung' } as const;

export type BundestagProfileLink = { politicianId: number; retrievedAt: string };

/** „Friedrich Merz“ → { first: „Friedrich“, last: „Merz“ }. */
export function splitName(name: string): { first: string; last: string } | null {
  return nameSplits(name)[0] ?? null;
}

/**
 * Alle Aufteilungen in Vor- und Nachname, häufigste zuerst:
 * „Reem Alabali Radovan“ → [Reem Alabali | Radovan], [Reem | Alabali Radovan].
 */
export function nameSplits(name: string): { first: string; last: string }[] {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const splits: { first: string; last: string }[] = [];
  for (let lastWords = 1; lastWords < parts.length; lastWords++) {
    splits.push({ first: parts.slice(0, -lastWords).join(' '), last: parts.slice(-lastWords).join(' ') });
  }
  return splits;
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function findMember(cabinet: Cabinet, wikidataId: string): CabinetMember | null {
  const found = cabinet.entries.find((e) => e.kind === 'member' && e.wikidataId === wikidataId);
  return found?.kind === 'member' ? found : null;
}

/** Kabinettsmitglied → Amt für die Detailseite (Hauptamt zuerst). */
export function officeOfMember(member: CabinetMember): GovernmentOffice {
  const main = member.offices[0];
  return {
    title: main?.title ?? 'Mitglied der Bundesregierung',
    wikidataId: member.wikidataId,
    name: member.name,
    inOfficeSince: main?.since ?? null,
    party: member.party,
    source: member.source,
  };
}

/** Wie die Person in DIP gesucht wird: als Kanzler/in oder als Ministerin/Minister. */
export function dipRoleOfMember(member: CabinetMember): GovernmentRole {
  if (member.isHeadOfGovernment) return { kind: 'chancellor' };
  // Staatsministerin/Staatsminister im Kabinettsrang: DIP führt sie als „Staatsmin.“.
  const main = member.offices[0]?.title ?? '';
  return /^Staatsminister/.test(main) ? { kind: 'minister', staatsminister: true } : { kind: 'minister' };
}

/** Grund, wenn DIP ein Regierungsamt laut Wikidata nicht bestätigt. */
export const UNCONFIRMED_REASON =
  'Die Parlamentsdokumentation des Bundestages (DIP) bestätigt dieses Amt für die in Wikidata genannte Person nicht.';

/**
 * Ersetzt Kabinettsmitglieder, die DIP nicht als Regierungsmitglied führt, durch
 * „keine eindeutige Angabe“ (je Amt). Schutz vor falschen Einträgen in Wikidata.
 */
export function confirmCabinetWithDip(
  cabinet: Cabinet,
  dipPersons: Parameters<typeof matchGovernmentPerson>[0],
): Cabinet {
  const period = latestPeriod(dipPersons);
  const retrievedAt = cabinet.source.retrievedAt;
  const entries: CabinetEntry[] = cabinet.entries.flatMap((e): CabinetEntry[] => {
    if (e.kind !== 'member') return [e];
    if (matchGovernmentPerson(dipPersons, e.name, dipRoleOfMember(e), period).length > 0) return [e];
    if (e.offices.length === 0) {
      return [
        {
          kind: 'unclear',
          title: 'Mitglied der Bundesregierung',
          wikidataId: `${cabinet.wikidataId}-${e.wikidataId}`,
          reason: UNCONFIRMED_REASON,
          source: cabinet.source,
        },
      ];
    }
    return e.offices.map((o) => ({
      kind: 'unclear' as const,
      title: o.title,
      wikidataId: o.wikidataId,
      reason: UNCONFIRMED_REASON,
      source: wikidataSource(o.wikidataId, retrievedAt),
    }));
  });
  return { ...cabinet, entries };
}

export class GovernmentRepository {
  constructor(
    /** Mitgelieferter Stand aus Wikidata (`assets/data/regierung.json`). */
    private readonly snapshot: GovernmentSnapshot = governmentSnapshot,
    private readonly dip: DipClient = new DipClient(),
    private readonly aw: AbgeordnetenwatchClient = new AbgeordnetenwatchClient(),
    private readonly awHttp: FetchJsonOptions | undefined = undefined,
    private readonly now: () => Date = () => new Date(),
    private readonly bundestag: BundestagRepository = new BundestagRepository(aw, now),
    private readonly dipGov: DipGovernmentClient = new DipGovernmentClient(),
  ) {}

  /** Stand der mitgelieferten Regierungsdaten (ISO-Zeitstempel des Abrufs bei Wikidata). */
  get snapshotRetrievedAt(): string {
    return this.snapshot.retrievedAt;
  }

  /** Amtierendes Bundeskabinett laut mitgeliefertem Wikidata-Stand (ohne Netz). */
  async getCabinet(): Promise<Cabinet> {
    return this.snapshot.cabinet;
  }

  /** Amtierende/r Bundeskanzler/in laut mitgeliefertem Wikidata-Stand (ohne Netz). */
  async getChancellor(): Promise<GovernmentOffice> {
    return this.snapshot.chancellor;
  }

  /**
   * Kabinett laut mitgeliefertem Wikidata-Stand, LIVE gegengeprüft mit DIP (eine Anfrage für alle
   * Nachnamen): Mitglieder,
   * deren Regierungsfunktion DIP nicht bestätigt, erscheinen als „keine eindeutige Angabe“.
   * Ist DIP nicht erreichbar, wirft die Abfrage (es werden keine ungeprüften Personen gezeigt).
   */
  async getVerifiedCabinet(): Promise<Cabinet> {
    const cabinet = await this.getCabinet();
    const names = cabinet.entries.flatMap((e) =>
      e.kind === 'member' ? [splitName(e.name)?.last ?? e.name] : [],
    );
    if (names.length === 0) return cabinet;
    const res = await this.dipGov.searchPersonsAny(names);
    return confirmCabinetWithDip(cabinet, res.documents);
  }

  /**
   * Alle DIP-Einträge der Person (gleicher Name, Funktion im Bund). Wirft, wenn nicht eindeutig.
   * Bei Kanzler/in muss ein Eintrag mit der Funktion „Bundeskanzl.“ dabei sein.
   */
  async getDipGovernmentPerson(name: string, role: GovernmentRole): Promise<DipGovernmentPerson> {
    const parts = splitName(name);
    const res = await this.dipGov.searchPersons(parts ? parts.last : name);
    const matches = matchGovernmentPerson(res.documents, name, role);
    if (matches.length === 0) {
      throw new AmbiguousDataError(
        'Die Person konnte in der Parlamentsdokumentation nicht eindeutig zugeordnet werden.',
      );
    }
    return { ids: matches.map((p) => p.id).sort() };
  }

  /** Aktivitäten aller DIP-Einträge der Person seit `since`, neueste zuerst. */
  async getGovernmentActivities(
    dipPersonIds: string[],
    since: string | null,
    cursor: string | null,
  ): Promise<PagedList<ParliamentaryActivity>> {
    const retrievedAt = this.now().toISOString();
    const res = await this.dipGov.getActivitiesOfPersons(dipPersonIds, { since, cursor });
    return mapPage(res, cursor, (a) => mapActivity(a, retrievedAt), retrievedAt);
  }

  /** Gesetzentwürfe der Bundesregierung mit diesem federführenden Ressort seit `since`. */
  async getRessortBills(ressort: string, since: string | null, cursor: string | null): Promise<PagedList<Proceeding>> {
    const retrievedAt = this.now().toISOString();
    const res = await this.dipGov.getProceedingsOfRessort({ ...GOVERNMENT_BILLS_FILTER, ressort, since, cursor });
    return mapPage(res, cursor, (v) => mapProceeding(v, retrievedAt), retrievedAt);
  }

  /** Personen-ID in DIP. Nur bei genau einem Treffer mit Name und Funktion „Bundeskanzl.“. */
  async getDipPersonId(name: string): Promise<string> {
    const parts = splitName(name);
    const res = await this.dip.searchPersons(parts ? parts.last : name);
    const matches = matchChancellor(res.documents, name);
    if (matches.length !== 1) {
      throw new AmbiguousDataError(
        'Die Person konnte in der Parlamentsdokumentation nicht eindeutig zugeordnet werden.',
      );
    }
    return matches[0].id;
  }

  /** Aktivitäten der Person im Parlament seit `since`, neueste zuerst. */
  async getActivities(
    dipPersonId: string,
    since: string | null,
    cursor: string | null,
  ): Promise<PagedList<ParliamentaryActivity>> {
    const retrievedAt = this.now().toISOString();
    const res = await this.dip.getActivitiesOfPerson(dipPersonId, { since, cursor });
    return mapPage(res, cursor, (a) => mapActivity(a, retrievedAt), retrievedAt);
  }

  /** Gesetzgebungsvorgänge mit Initiative „Bundesregierung“ seit `since`, neueste zuerst. */
  async getGovernmentBills(since: string | null, cursor: string | null): Promise<PagedList<Proceeding>> {
    const retrievedAt = this.now().toISOString();
    const res = await this.dip.getProceedings({ ...GOVERNMENT_BILLS_FILTER, since, cursor });
    return mapPage(res, cursor, (v) => mapProceeding(v, retrievedAt), retrievedAt);
  }

  /**
   * Abgeordnetenprofil der Person in der aktuellen Wahlperiode – nur wenn eindeutig:
   * genau eine Person mit gleichem Namen, deren Wikidata-ID (oder ersatzweise Partei) passt,
   * und mit laufendem Mandat. Sonst null.
   */
  async findBundestagProfile(office: GovernmentOffice): Promise<BundestagProfileLink | null> {
    const splits = nameSplits(office.name);
    if (splits.length === 0) return null;
    const wanted = normalizeName(office.name);
    // Aufteilungen nacheinander probieren (meist reicht die erste Anfrage), bis Treffer kommen.
    let matches: AwPolitician[] = [];
    for (const parts of splits) {
      const people = await searchPoliticiansByName(parts.first, parts.last, this.awHttp);
      matches = people.filter((p) => {
        if (normalizeName(p.label) !== wanted) return false;
        if (p.qid_wikidata) return p.qid_wikidata === office.wikidataId;
        const awParty = p.party ? stripPeriodSuffix(p.party.label) : null;
        return !!awParty && awParty === office.party?.shortName;
      });
      if (matches.length > 0) break;
    }
    // Mehr als ein Treffer: nicht raten.
    if (matches.length !== 1) return null;

    const term = await this.bundestag.getCurrentTerm();
    const mandates = await this.aw.getMandatesOfPolitician(term.id, matches[0].id);
    if (!mandates.data.some((m) => !m.end_date)) return null;
    return { politicianId: matches[0].id, retrievedAt: this.now().toISOString() };
  }
}
