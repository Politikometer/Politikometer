import { useRouter } from 'expo-router';
import { View } from 'react-native';

import type { CabinetMember, UnclearCabinetOffice } from '@/domain/government';
import { useCabinet } from '@/features/regierung/hooks';
import { SourceError } from '@/features/regierung/PagedItems';
import { SnapshotUpdateNote, StaleSnapshotHint } from '@/features/regierung/SnapshotNote';
import { AppText } from '@/ui/components/AppText';
import { Avatar } from '@/ui/components/Avatar';
import { Card } from '@/ui/components/Card';
import { ListButton } from '@/ui/components/ListButton';
import { Screen } from '@/ui/components/Screen';
import { SourceNote } from '@/ui/components/SourceNote';
import { Loading, OfflineMessage } from '@/ui/components/StatusViews';
import { formatDate } from '@/ui/format';
import { spacing } from '@/ui/theme';

function MemberRow({ member }: { member: CabinetMember }) {
  const router = useRouter();
  const since = formatDate(member.offices[0]?.since);
  const party = member.party ? (member.party.shortName ?? member.party.name) : null;
  return (
    <ListButton
      title={member.name}
      subtitle={member.offices.map((o) => o.title).join(' · ')}
      detail={[since ? `im Amt seit ${since}` : null, party ? `Partei: ${party}` : null].filter(Boolean).join(' · ')}
      hint={`Öffnet die Seite von ${member.name}`}
      leading={<Avatar qid={member.wikidataId} name={member.name} fraction={party} />}
      onPress={() =>
        member.isHeadOfGovernment
          ? router.push('/regierung/bundeskanzler')
          : router.push({ pathname: '/regierung/minister/[qid]', params: { qid: member.wikidataId } })
      }
    />
  );
}

function UnclearRow({ entry }: { entry: UnclearCabinetOffice }) {
  return (
    <Card>
      <AppText style={{ fontWeight: '600' }}>{entry.title}</AppText>
      <AppText>
        Keine eindeutige Angabe. {entry.reason} Wir zeigen deshalb hier keine Person an, statt zu raten.
      </AppText>
      <SourceNote source={entry.source} linkLabel="Amt bei Wikidata ansehen" />
    </Card>
  );
}

export default function GovernmentScreen() {
  const query = useCabinet();
  const cabinet = query.data;
  const since = formatDate(cabinet?.since);

  return (
    <Screen refresh={cabinet ? { refreshing: query.isRefetching, onRefresh: () => query.refetch() } : undefined}>
      <AppText variant="title">Bundesregierung</AppText>
      <AppText variant="muted">
        Zur Bundesregierung gehören die Bundeskanzlerin oder der Bundeskanzler und die
        Bundesministerinnen und Bundesminister (Artikel 62 Grundgesetz). Die Kanzlerin oder der
        Kanzler steht zuerst, weil sie oder er die Regierung leitet. Alle anderen stehen alphabetisch
        nach Ressort.
      </AppText>

      {query.isPending && query.fetchStatus === 'paused' ? <OfflineMessage /> : null}
      {query.isPending && query.fetchStatus !== 'paused' ? <Loading label="Bundesregierung wird ermittelt …" /> : null}
      {query.isError ? (
        <SourceError error={query.error} onRetry={() => query.refetch()} hasCachedData={!!cabinet} />
      ) : null}
      {!query.isPending && query.fetchStatus === 'paused' && cabinet ? (
        <AppText variant="small" accessibilityLiveRegion="polite">
          Keine Internetverbindung – angezeigt wird der zuletzt gespeicherte Stand.
        </AppText>
      ) : null}

      {cabinet ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="heading">
            {[cabinet.name, since ? `seit ${since}` : null].filter(Boolean).join(', ')}
          </AppText>
          {cabinet.entries.map((e) =>
            e.kind === 'member' ? (
              <MemberRow key={e.wikidataId} member={e} />
            ) : (
              <UnclearRow key={e.wikidataId} entry={e} />
            ),
          )}
          <SourceNote source={cabinet.source} linkLabel="Kabinett bei Wikidata ansehen" />
          <StaleSnapshotHint retrievedAt={cabinet.source.retrievedAt} />
          <SnapshotUpdateNote retrievedAt={cabinet.source.retrievedAt} />
        </View>
      ) : null}

      <Card>
        <AppText variant="heading">Woher kommen diese Daten?</AppText>
        <AppText>
          Wer welches Amt hat, seit wann und welcher Partei die Person angehört, stammt aus Wikidata,
          einer offenen Wissensdatenbank (Lizenz CC0). Diese Angaben sind als Datei in der App
          enthalten und werden mit Updates der App aktualisiert – die App fragt Wikidata nicht selbst
          ab. Wir verwenden nur Angaben, die dort eindeutig sind: Ist für ein Amt ein Ende eingetragen
          oder werden mehrere Personen genannt, steht dort „Keine eindeutige Angabe“. Weil Wikidata von
          allen bearbeitet werden kann, prüfen wir jede Person zusätzlich live in der
          Parlamentsdokumentation DIP von Bundestag und Bundesrat: Nur wenn DIP sie als
          Bundeskanzlerin oder Bundeskanzler bzw. Bundesministerin oder Bundesminister führt, zeigen
          wir sie an. Die Partei ist eine reine
          Angabe, keine Einordnung.
        </AppText>
      </Card>
    </Screen>
  );
}
