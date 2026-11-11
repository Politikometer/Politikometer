/**
 * Detailseite eines Mitglieds der Bundesregierung.
 * Parameter: Wikidata-ID der Person (z. B. „Q1806261“) – die Kennung, über die wir das Kabinett
 * ermitteln. Sie ist dauerhaft; DIP-Kennungen sind dagegen je Amt verschieden und werden abgeleitet.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { dipRoleOfMember, officeOfMember } from '@/data/repositories/government-repository';
import { formatParty } from '@/features/regierung/format';
import { useCabinetMember } from '@/features/regierung/hooks';
import { MemberSections } from '@/features/regierung/MemberSections';
import { SourceError } from '@/features/regierung/PagedItems';
import { StaleSnapshotHint } from '@/features/regierung/SnapshotNote';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { FavoriteButton } from '@/ui/components/FavoriteButton';
import { InfoRow } from '@/ui/components/InfoRow';
import { Screen } from '@/ui/components/Screen';
import { ShareButton } from '@/ui/components/ShareButton';
import { ReportErrorLink } from '@/ui/components/ReportErrorLink';
import { SourceNote } from '@/ui/components/SourceNote';
import { Loading, OfflineMessage } from '@/ui/components/StatusViews';
import { formatDate } from '@/ui/format';
import { spacing } from '@/ui/theme';

export default function MinisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ qid: string }>();
  const qid = typeof params.qid === 'string' && /^Q\d+$/.test(params.qid) ? params.qid : '';
  const query = useCabinetMember(qid);
  const member = query.data;

  if (!qid) {
    return (
      <Screen>
        <Card accessibilityRole="alert">
          <AppText>
            Diese Seite gibt es nicht. Vielleicht ist der Link veraltet. Über die Startseite findest du
            alle Mitglieder der Bundesregierung.
          </AppText>
          <Button label="Zur Startseite" onPress={() => router.dismissTo('/')} />
        </Card>
      </Screen>
    );
  }

  const office = member ? officeOfMember(member) : null;
  return (
    <Screen>
      {member ? <Stack.Screen options={{ title: member.name }} /> : null}
      {query.isPending && query.fetchStatus === 'paused' ? <OfflineMessage /> : null}
      {query.isPending && query.fetchStatus !== 'paused' ? <Loading label="Angaben werden geladen …" /> : null}
      {query.isError ? (
        <SourceError error={query.error} onRetry={() => query.refetch()} hasCachedData={!!member} />
      ) : null}
      {query.isSuccess && member === null ? (
        <Card>
          <AppText>
            Diese Person gehört laut Quelle derzeit nicht zur Bundesregierung oder ist dort nicht
            eindeutig einem Amt zugeordnet.
          </AppText>
        </Card>
      ) : null}

      {member && office ? (
        <>
          <Card>
            <AppText variant="title">{member.name}</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <FavoriteButton type="minister" id={member.wikidataId} title={member.name} subtitle={office.title} />
              <ShareButton title={member.name} url={member.source.url} subtitle={office.title} publisher="Wikidata" />
            </View>
            {member.offices.map((o) => (
              <View key={o.wikidataId} style={{ gap: spacing.xs }}>
                <AppText variant="muted">{o.title}</AppText>
                <InfoRow label="Im Amt seit" value={formatDate(o.since) ?? 'keine eindeutige Angabe'} />
              </View>
            ))}
            <InfoRow label="Partei" value={formatParty(member.party)} />
            <SourceNote source={member.source} linkLabel="Eintrag bei Wikidata ansehen" />
            <StaleSnapshotHint retrievedAt={member.source.retrievedAt} />
            <ReportErrorLink context={{ page: 'regierung', id: member.wikidataId, name: member.name }} />
          </Card>

          <MemberSections
            office={office}
            role={dipRoleOfMember(member)}
            ressort={member.offices[0]?.ministry ?? null}
          />
        </>
      ) : null}
    </Screen>
  );
}
