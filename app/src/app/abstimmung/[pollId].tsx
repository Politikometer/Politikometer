import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import {
  countTotal,
  describeAccepted,
  findPersonVote,
  formatCounts,
  parseRouteId,
  VOTE_LABELS,
  VOTE_ORDER,
} from '@/domain/votes';
import { usePollResult, useVotes } from '@/features/bundestag/hooks';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { ExternalLink } from '@/ui/components/ExternalLink';
import { InfoRow } from '@/ui/components/InfoRow';
import { Screen } from '@/ui/components/Screen';
import { ShareButton } from '@/ui/components/ShareButton';
import { SourceNote } from '@/ui/components/SourceNote';
import { InvalidLinkMessage, QueryStatus } from '@/ui/components/StatusViews';
import { formatDate } from '@/ui/format';
import { spacing } from '@/ui/theme';

export default function PollScreen() {
  // Aus der Adresse kommen nur Kennungen. Name und Stimme werden aus der Quelle geladen –
  // ein präparierter Link kann so niemandem eine Stimme zuschreiben.
  const params = useLocalSearchParams<{ pollId?: string; mandate?: string }>();
  const pollId = parseRouteId(params.pollId);
  const query = usePollResult(pollId);
  const data = query.data;
  const personVote = findPersonVote(useVotes(parseRouteId(params.mandate)).data, pollId);

  if (pollId === null) {
    return (
      <Screen>
        <InvalidLinkMessage />
      </Screen>
    );
  }

  return (
    <Screen>
      <QueryStatus query={query} />

      {data ? (
        <>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="small">
              Namentliche Abstimmung im Bundestag
              {data.poll.date ? ` · ${formatDate(data.poll.date)}` : ''}
            </AppText>
            <AppText variant="title">{data.poll.title}</AppText>
          </View>

          <ShareButton
            title={data.poll.title}
            subtitle={`Namentliche Abstimmung im Bundestag${data.poll.date ? ` am ${formatDate(data.poll.date)}` : ''}`}
            url={data.poll.source.url}
            publisher={data.poll.source.publisher}
          />

          {personVote ? (
            <Card>
              <AppText variant="heading">Stimme von {personVote.personName}</AppText>
              <AppText>
                {VOTE_LABELS[personVote.vote.choice]}
                {personVote.vote.reasonNoShow ? ` (${personVote.vote.reasonNoShow})` : ''}
              </AppText>
            </Card>
          ) : null}

          <Card>
            <AppText variant="heading">Ergebnis</AppText>
            <InfoRow label="Beschluss" value={describeAccepted(data.poll.accepted) ?? 'nicht angegeben'} />
            {VOTE_ORDER.map((k) => (
              <InfoRow key={k} label={VOTE_LABELS[k]} value={data.totals[k]} />
            ))}
            <AppText variant="small">
              Insgesamt {countTotal(data.totals)} Abgeordnete. Ob eine Vorlage angenommen ist, hängt
              von der jeweils nötigen Mehrheit ab.
            </AppText>
          </Card>

          <Card>
            <AppText variant="heading">Nach Fraktionen</AppText>
            {data.byFraction.map((f) => (
              <View
                key={f.fraction}
                accessible
                accessibilityLabel={`${f.fraction}: ${formatCounts(f.counts)}`}>
                <AppText style={{ fontWeight: '600' }}>{f.fraction}</AppText>
                <AppText variant="muted">{formatCounts(f.counts)}</AppText>
              </View>
            ))}
            <AppText variant="small">Reihenfolge: alphabetisch.</AppText>
          </Card>

          {data.poll.documents.length ? (
            <Card>
              <AppText variant="heading">Offizielle Dokumente</AppText>
              {data.poll.documents.map((d) => (
                <ExternalLink key={d.url} url={d.url} label={d.label} />
              ))}
              <AppText variant="small">Quelle: Deutscher Bundestag</AppText>
            </Card>
          ) : null}

          {data.poll.description ? (
            <Card>
              <AppText variant="heading">Worum es ging</AppText>
              <AppText>{data.poll.description}</AppText>
              <AppText variant="small">Zusammenfassung von abgeordnetenwatch.de.</AppText>
            </Card>
          ) : null}

          {data.poll.topics.length ? (
            <AppText variant="small">Themen: {data.poll.topics.join(', ')}</AppText>
          ) : null}

          <SourceNote source={data.poll.source} />
        </>
      ) : null}
    </Screen>
  );
}
