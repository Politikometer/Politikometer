import { useLocalSearchParams } from 'expo-router';

import { parseRouteId } from '@/domain/votes';
import { useVotes } from '@/features/bundestag/hooks';
import { VoteList } from '@/features/bundestag/VoteList';
import { VotingExplainer } from '@/features/bundestag/VotingExplainer';
import { AppText } from '@/ui/components/AppText';
import { Screen } from '@/ui/components/Screen';
import { SourceNote } from '@/ui/components/SourceNote';
import { InvalidLinkMessage, QueryStatus } from '@/ui/components/StatusViews';
import { usePullToRefresh } from '@/ui/pull-to-refresh';

/** Alle namentlichen Abstimmungen eines Mandats. */
export default function VotesScreen() {
  // Der Name in der Überschrift stammt aus den geladenen Daten, nie aus der Adresse.
  const mandateId = parseRouteId(useLocalSearchParams<{ mandateId?: string }>().mandateId);
  const query = useVotes(mandateId);
  const refresh = usePullToRefresh(query.refetch);
  const data = query.data;

  if (mandateId === null) {
    return (
      <Screen>
        <InvalidLinkMessage />
      </Screen>
    );
  }

  return (
    <Screen refresh={refresh}>
      <AppText variant="title">{data?.personName ?? 'Abstimmungen'}</AppText>
      <QueryStatus query={query} />
      {data ? (
        <>
          <AppText variant="muted">
            {data.votes.length} namentliche Abstimmungen während des Mandats, neueste zuerst.
          </AppText>
          <VoteList votes={data.votes} mandateId={mandateId} />
          <SourceNote
            source={{
              publisher: 'abgeordnetenwatch.de',
              url: 'https://www.abgeordnetenwatch.de/bundestag/abstimmungen',
              license: 'CC0 1.0',
              retrievedAt: data.retrievedAt,
            }}
          />
        </>
      ) : null}
      <VotingExplainer />
    </Screen>
  );
}
