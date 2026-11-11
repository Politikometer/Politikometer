import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import type { GovernmentOffice, PagedList } from '@/domain/government';
import { findMember, GovernmentRepository } from '@/data/repositories/government-repository';
import type { GovernmentRole } from '@/data/sources/dip/government';

const repository = new GovernmentRepository();

const HOUR = 60 * 60 * 1000;
const PERSON_STALE = 24 * HOUR;
/** Die DIP-Gegenprüfung des Kabinetts wird täglich live wiederholt. */
const CABINET_STALE = 24 * HOUR;
/**
 * Stand der mitgelieferten Regierungsdatei: Teil der Abfrageschlüssel, damit nach einem
 * App-Update kein gespeicherter älterer Stand angezeigt wird.
 */
const SNAPSHOT = repository.snapshotRetrievedAt;
const ACTIVITY_STALE = 6 * HOUR;

/** Nächste Seite nur, wenn die Quelle einen neuen cursor liefert und noch Einträge fehlen. */
function nextPageParam<T>(lastPage: PagedList<T>, pages: PagedList<T>[]): string | undefined {
  const loaded = pages.reduce((n, p) => n + p.items.length, 0);
  return lastPage.nextCursor && loaded < lastPage.total ? lastPage.nextCursor : undefined;
}

/** Kanzler/in aus der mitgelieferten Datei – ohne Netz, auch offline sofort verfügbar. */
export function useChancellor() {
  return useQuery({
    queryKey: ['regierung', 'bundeskanzler', SNAPSHOT],
    queryFn: () => repository.getChancellor(),
    staleTime: Infinity,
    networkMode: 'always',
  });
}

/**
 * Abfrageschlüssel des mit DIP gegengeprüften Kabinetts (Übersicht und Detailseiten teilen ihn).
 * Kanzler/in und Bundesministerinnen und -minister aus der mitgelieferten Datei, DIP live.
 */
const CABINET_KEY = ['regierung', 'kabinett', 'dip-geprueft', SNAPSHOT] as const;

export function useCabinet() {
  return useQuery({
    queryKey: CABINET_KEY,
    queryFn: () => repository.getVerifiedCabinet(),
    staleTime: CABINET_STALE,
  });
}

/**
 * Ein Mitglied des Kabinetts – aus derselben Abfrage wie die Übersicht (geteilter Cache).
 * `data` ist null, wenn die Person laut Quelle derzeit nicht zum Kabinett gehört.
 */
export function useCabinetMember(wikidataId: string) {
  return useQuery({
    queryKey: CABINET_KEY,
    queryFn: () => repository.getVerifiedCabinet(),
    staleTime: CABINET_STALE,
    select: (cabinet) => findMember(cabinet, wikidataId),
  });
}

/** Person in DIP (Kanzler/in oder Ministerin/Minister mit Ressort). */
export function useDipGovernmentPerson(office: GovernmentOffice | undefined, role: GovernmentRole) {
  return useQuery({
    queryKey: ['regierung', 'dip-person', office?.wikidataId, office?.name, role],
    queryFn: () => repository.getDipGovernmentPerson(office!.name, role),
    enabled: !!office,
    staleTime: PERSON_STALE,
  });
}

export function useBundestagProfileLink(office: GovernmentOffice | undefined) {
  return useQuery({
    queryKey: ['regierung', 'aw-profil', office?.wikidataId],
    queryFn: () => repository.findBundestagProfile(office!),
    enabled: !!office,
    staleTime: PERSON_STALE,
  });
}

export function useActivities(dipPersonId: string | undefined, since: string | null | undefined) {
  return useInfiniteQuery({
    queryKey: ['regierung', 'aktivitaeten', dipPersonId, since ?? null],
    queryFn: ({ pageParam }) => repository.getActivities(dipPersonId!, since ?? null, pageParam ?? null),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextPageParam,
    enabled: !!dipPersonId && since !== undefined,
    staleTime: ACTIVITY_STALE,
  });
}

/** Aktivitäten aller DIP-Einträge eines Regierungsmitglieds seit Amtsantritt. */
export function useGovernmentActivities(dipPersonIds: string[] | undefined, since: string | null | undefined) {
  return useInfiniteQuery({
    queryKey: ['regierung', 'aktivitaeten', dipPersonIds?.join(','), since ?? null],
    queryFn: ({ pageParam }) =>
      repository.getGovernmentActivities(dipPersonIds!, since ?? null, pageParam ?? null),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextPageParam,
    enabled: !!dipPersonIds?.length && since !== undefined,
    staleTime: ACTIVITY_STALE,
  });
}

export function useGovernmentBills(since: string | null | undefined) {
  return useInfiniteQuery({
    queryKey: ['regierung', 'gesetzentwuerfe', since ?? null],
    queryFn: ({ pageParam }) => repository.getGovernmentBills(since ?? null, pageParam ?? null),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextPageParam,
    enabled: since !== undefined,
    staleTime: ACTIVITY_STALE,
  });
}

/** Gesetzentwürfe der Bundesregierung, für die dieses Ressort laut DIP federführend ist. */
export function useRessortBills(ressort: string | null | undefined, since: string | null | undefined) {
  return useInfiniteQuery({
    queryKey: ['regierung', 'gesetzentwuerfe-ressort', ressort, since ?? null],
    queryFn: ({ pageParam }) => repository.getRessortBills(ressort!, since ?? null, pageParam ?? null),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextPageParam,
    enabled: !!ressort && since !== undefined,
    staleTime: ACTIVITY_STALE,
  });
}
