import { Stack } from 'expo-router';

import { MemberSections } from '@/features/regierung/MemberSections';
import { Portrait } from '@/features/regierung/Portrait';
import { formatParty } from '@/features/regierung/format';
import { useChancellor } from '@/features/regierung/hooks';
import { SourceError } from '@/features/regierung/PagedItems';
import { StaleSnapshotHint } from '@/features/regierung/SnapshotNote';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { InfoRow } from '@/ui/components/InfoRow';
import { Screen } from '@/ui/components/Screen';
import { ReportErrorLink } from '@/ui/components/ReportErrorLink';
import { SourceNote } from '@/ui/components/SourceNote';
import { Loading, OfflineMessage } from '@/ui/components/StatusViews';
import { formatDate } from '@/ui/format';

export default function ChancellorScreen() {
  const query = useChancellor();
  const office = query.data;

  return (
    <Screen>
      {office ? <Stack.Screen options={{ title: office.title }} /> : null}
      {query.isPending && query.fetchStatus === 'paused' ? <OfflineMessage /> : null}
      {query.isPending && query.fetchStatus !== 'paused' ? <Loading label="Amtsinhaber wird ermittelt …" /> : null}
      {query.isError ? (
        <SourceError error={query.error} onRetry={() => query.refetch()} hasCachedData={!!office} />
      ) : null}

      {office ? (
        <>
          <Card>
            <Portrait
              qid={office.wikidataId}
              name={office.name}
              party={office.party ? (office.party.shortName ?? office.party.name) : null}
            />
            <AppText variant="title">{office.name}</AppText>
            <AppText variant="muted">{office.title} der Bundesrepublik Deutschland</AppText>
            <InfoRow label="Im Amt seit" value={formatDate(office.inOfficeSince)} />
            <InfoRow label="Partei" value={formatParty(office.party)} />
            <SourceNote source={office.source} linkLabel="Eintrag bei Wikidata ansehen" />
            <StaleSnapshotHint retrievedAt={office.source.retrievedAt} />
            <ReportErrorLink context={{ page: 'regierung', id: office.wikidataId, name: office.name }} />
          </Card>

          <MemberSections office={office} role={{ kind: 'chancellor' }} />
        </>
      ) : null}
    </Screen>
  );
}
