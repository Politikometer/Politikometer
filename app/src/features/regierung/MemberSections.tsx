/**
 * Abschnitte der Detailseite eines Regierungsmitglieds (Kanzler/in oder Ministerin/Minister):
 * Abgeordnetenprofil, Aktivitäten im Parlament, Gesetzentwürfe, Herkunft der Daten.
 */
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import type { GovernmentOffice } from '@/domain/government';
import type { GovernmentRole } from '@/data/sources/dip/government';
import { DIP_LICENSE, DIP_PORTAL_URL, DIP_PUBLISHER } from '@/data/sources/dip/config';
import {
  useBundestagProfileLink,
  useDipGovernmentPerson,
  useGovernmentActivities,
  useGovernmentBills,
  useRessortBills,
} from '@/features/regierung/hooks';
import { ActivityItem, ProceedingItem } from '@/features/regierung/items';
import { PagedItems, SourceError } from '@/features/regierung/PagedItems';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { SourceNote } from '@/ui/components/SourceNote';
import { Loading, OfflineMessage } from '@/ui/components/StatusViews';
import { formatDate } from '@/ui/format';
import { spacing } from '@/ui/theme';

function dipSource(retrievedAt: string) {
  return { publisher: DIP_PUBLISHER, url: DIP_PORTAL_URL, license: DIP_LICENSE, retrievedAt };
}

function sinceText(office: GovernmentOffice): string {
  const since = formatDate(office.inOfficeSince);
  return since ? `seit dem Amtsantritt am ${since}` : 'in der Parlamentsdokumentation';
}

function ProfileLink({ office }: { office: GovernmentOffice }) {
  const router = useRouter();
  const query = useBundestagProfileLink(office);
  // Nur bei eindeutiger Zuordnung; sonst (auch bei Fehlern) bewusst weglassen.
  if (!query.data) return null;
  const id = query.data.politicianId;
  return (
    <Card>
      <AppText>
        {office.name} ist auch Mitglied des Bundestages. Im Abgeordnetenprofil stehen unter anderem
        die namentlichen Abstimmungen.
      </AppText>
      <Button
        label="Abgeordnetenprofil öffnen"
        variant="secondary"
        hint={`Öffnet das Profil von ${office.name}`}
        onPress={() => router.push({ pathname: '/politiker/[id]', params: { id: String(id) } })}
      />
      <SourceNote
        source={{
          publisher: 'abgeordnetenwatch.de',
          url: `https://www.abgeordnetenwatch.de/profile/${id}`,
          license: 'CC0 1.0',
          retrievedAt: query.data.retrievedAt,
        }}
        linkLabel="Profil bei abgeordnetenwatch.de"
      />
    </Card>
  );
}

function ActivitiesSection({ office, role }: { office: GovernmentOffice; role: GovernmentRole }) {
  const person = useDipGovernmentPerson(office, role);
  const query = useGovernmentActivities(person.data?.ids, office.inOfficeSince);
  const pages = query.data?.pages ?? [];
  const items = pages.flatMap((p) => p.items);
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="heading">Im Bundestag</AppText>
      <AppText variant="muted">
        Reden, Antworten und weitere Beiträge von {office.name} {sinceText(office)}, wie sie die
        Parlamentsdokumentation erfasst. Neueste zuerst. Die Art des Beitrags ist die amtliche
        Bezeichnung. Auftritte im Bundesrat sind enthalten und gekennzeichnet.
      </AppText>
      {person.isPending && person.fetchStatus === 'paused' ? <OfflineMessage /> : null}
      {person.isPending && person.fetchStatus === 'fetching' ? <Loading label="Person wird zugeordnet …" /> : null}
      {person.isError ? <SourceError error={person.error} onRetry={() => person.refetch()} /> : null}
      {person.data ? (
        <PagedItems
          items={items}
          total={pages[0]?.total ?? 0}
          isPending={query.isPending}
          isPaused={query.fetchStatus === 'paused'}
          isError={query.isError}
          error={query.error}
          refetch={() => query.refetch()}
          hasNextPage={query.hasNextPage}
          isFetchingNextPage={query.isFetchingNextPage}
          fetchNextPage={() => query.fetchNextPage()}
          renderItem={(a) => <ActivityItem activity={a} />}
          keyOf={(a) => a.id}
          loadingLabel="Aktivitäten werden geladen …"
          emptyText="Für diesen Zeitraum sind noch keine Aktivitäten erfasst."
          itemsLabel="Aktivitäten"
        />
      ) : null}
      {pages[0] ? (
        <SourceNote source={dipSource(pages[0].retrievedAt)} linkLabel="Parlamentsdokumentation DIP öffnen" />
      ) : null}
    </View>
  );
}

function CabinetDecidesNote() {
  return (
    <Card>
      <AppText>
        Gesetzentwürfe der Bundesregierung beschließt das Bundeskabinett als Ganzes – also alle
        Ministerinnen und Minister gemeinsam mit der Kanzlerin oder dem Kanzler, nicht eine Person
        allein. Über Gesetze entscheiden danach Bundestag und Bundesrat.
      </AppText>
    </Card>
  );
}

type BillsQuery = ReturnType<typeof useGovernmentBills>;

function BillsList({ query, emptyText }: { query: BillsQuery; emptyText: string }) {
  const pages = query.data?.pages ?? [];
  const items = pages.flatMap((p) => p.items);
  return (
    <>
      <PagedItems
        items={items}
        total={pages[0]?.total ?? 0}
        isPending={query.isPending}
        isPaused={query.fetchStatus === 'paused'}
        isError={query.isError}
        error={query.error}
        refetch={() => query.refetch()}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        fetchNextPage={() => query.fetchNextPage()}
        renderItem={(p) => <ProceedingItem proceeding={p} />}
        keyOf={(p) => p.id}
        loadingLabel="Gesetzentwürfe werden geladen …"
        emptyText={emptyText}
        itemsLabel="Gesetzentwürfe"
      />
      {pages[0] ? (
        <SourceNote source={dipSource(pages[0].retrievedAt)} linkLabel="Parlamentsdokumentation DIP öffnen" />
      ) : null}
    </>
  );
}

function GovernmentBillsSection({ office }: { office: GovernmentOffice }) {
  const query = useGovernmentBills(office.inOfficeSince);
  const since = formatDate(office.inOfficeSince);
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="heading">Gesetzentwürfe der Bundesregierung</AppText>
      <AppText variant="muted">
        Gesetzgebungsvorgänge, die die Bundesregierung eingebracht hat
        {since ? ` und zu denen es seit dem ${since} Dokumente gibt` : ''}. Neueste zuerst, mit dem
        amtlichen Beratungsstand.
      </AppText>
      <CabinetDecidesNote />
      <BillsList query={query} emptyText="Für diesen Zeitraum sind keine Gesetzentwürfe der Bundesregierung erfasst." />
    </View>
  );
}

function RessortBillsSection({ office, ressort }: { office: GovernmentOffice; ressort: string }) {
  const query = useRessortBills(ressort, office.inOfficeSince);
  const since = formatDate(office.inOfficeSince);
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="heading">Gesetzentwürfe aus dem Ressort</AppText>
      <AppText variant="muted">
        Gesetzentwürfe der Bundesregierung, für die laut Parlamentsdokumentation „{ressort}“
        federführend ist – das heißt, dieses Ministerium hat den Entwurf ausgearbeitet
        {since ? `. Gezeigt werden Vorgänge mit Dokumenten seit dem ${since}` : ''}. Neueste zuerst,
        mit dem amtlichen Beratungsstand.
      </AppText>
      <CabinetDecidesNote />
      <BillsList query={query} emptyText="Für diesen Zeitraum sind keine Gesetzentwürfe aus diesem Ressort erfasst." />
    </View>
  );
}

function DataExplainer() {
  return (
    <Card>
      <AppText variant="heading">Woher kommen diese Daten?</AppText>
      <AppText>
        Wer das Amt innehat, seit wann und welcher Partei die Person angehört, stammt aus Wikidata,
        einer offenen Wissensdatenbank (Lizenz CC0). Diese Angaben sind als Datei in der App enthalten
        und werden mit Updates der App aktualisiert. Reden, Antworten und Gesetzentwürfe stammen live
        aus dem Dokumentations- und Informationssystem für Parlamentsmaterialien (DIP) von Bundestag
        und Bundesrat. Die Einträge werden nicht ausgewählt oder bewertet, sondern vollständig und nach
        Datum angezeigt. Die Daten aus DIP werden regelmäßig neu abgerufen.
      </AppText>
    </Card>
  );
}

/**
 * Alles unterhalb der Kopfkarte. Kanzler/in: alle Gesetzentwürfe der Bundesregierung.
 * Ministerin/Minister: Gesetzentwürfe des eigenen Ressorts (federführend laut DIP), falls bekannt.
 */
export function MemberSections({
  office,
  role,
  ressort,
}: {
  office: GovernmentOffice;
  role: GovernmentRole;
  ressort?: string | null;
}) {
  return (
    <>
      <ProfileLink office={office} />
      <ActivitiesSection office={office} role={role} />
      {role.kind === 'chancellor' ? (
        <GovernmentBillsSection office={office} />
      ) : ressort ? (
        <RessortBillsSection office={office} ressort={ressort} />
      ) : (
        <Card>
          <AppText>
            Für dieses Amt nennt die Quelle kein eigenes Ministerium. Gesetzentwürfe nach Ressort
            werden deshalb nicht angezeigt.
          </AppText>
        </Card>
      )}
      <DataExplainer />
    </>
  );
}
