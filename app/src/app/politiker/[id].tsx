import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { describeHowElected, howElectedExplainLabel } from '@/domain/representatives';
import { CitizenQuestions } from '@/features/bundestag/CitizenQuestions';
import { usePoliticianProfile, useVotes } from '@/features/bundestag/hooks';
import { VoteList } from '@/features/bundestag/VoteList';
import { VotingExplainer } from '@/features/bundestag/VotingExplainer';
import { FiguresCard } from '@/features/rangliste/FiguresCard';
import { photoCredit } from '@/data/sources/local/photos';
import { AppText } from '@/ui/components/AppText';
import { Avatar } from '@/ui/components/Avatar';
import { ExternalLink } from '@/ui/components/ExternalLink';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { FavoriteButton } from '@/ui/components/FavoriteButton';
import { ExplainLink } from '@/ui/components/ExplainLink';
import { InfoRow } from '@/ui/components/InfoRow';
import { Screen } from '@/ui/components/Screen';
import { ShareButton } from '@/ui/components/ShareButton';
import { SourceNote } from '@/ui/components/SourceNote';
import { ReportErrorLink } from '@/ui/components/ReportErrorLink';
import { QueryStatus } from '@/ui/components/StatusViews';
import { formatDate } from '@/ui/format';
import { spacing } from '@/ui/theme';

const PREVIEW_COUNT = 5;

function VotesSection({ mandateId }: { mandateId: number }) {
  const router = useRouter();
  const query = useVotes(mandateId);
  const data = query.data;
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="heading">Abstimmungsverhalten</AppText>
      <QueryStatus query={query} loadingLabel="Abstimmungen werden geladen …" />
      {data ? (
        <>
          <AppText variant="muted">
            Teilgenommen an {data.votes.filter((v) => v.choice !== 'no_show').length} von{' '}
            {data.votes.length} namentlichen Abstimmungen während des Mandats ({data.termLabel}).
          </AppText>
          {data.votes.length ? (
            <VoteList votes={data.votes.slice(0, PREVIEW_COUNT)} mandateId={mandateId} />
          ) : (
            <Card>
              <AppText>Für dieses Mandat sind noch keine namentlichen Abstimmungen erfasst.</AppText>
            </Card>
          )}
          {data.votes.length > PREVIEW_COUNT ? (
            <Button
              label={`Alle ${data.votes.length} Abstimmungen anzeigen`}
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: '/abstimmungen/[mandateId]',
                  params: { mandateId: String(mandateId) },
                })
              }
            />
          ) : null}
          <SourceNote
            source={{
              publisher: 'abgeordnetenwatch.de',
              url: 'https://www.abgeordnetenwatch.de/bundestag/abstimmungen',
              license: 'CC0 1.0',
              retrievedAt: data.retrievedAt,
            }}
            linkLabel="Alle Abstimmungen bei abgeordnetenwatch.de"
          />
        </>
      ) : null}
      <VotingExplainer />
    </View>
  );
}

export default function PoliticianScreen() {
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const query = usePoliticianProfile(Number(id));
  const data = query.data;
  const subtitle = data
    ? [data.politician.party, data.mandate ? 'Mitglied des Bundestages' : null].filter(Boolean).join(' · ')
    : '';

  return (
    <Screen>
      {data ? <Stack.Screen options={{ title: data.politician.fullName }} /> : null}
      <QueryStatus query={query} loadingLabel="Profil wird geladen …" />

      {data ? (
        <>
          <View style={styles.head}>
            <Avatar
              politicianId={data.politician.id}
              name={data.politician.fullName}
              fraction={data.mandate?.fraction ?? data.politician.party}
              size={96}
            />
            <View style={styles.headText}>
              <AppText variant="title">
                {[data.politician.title, data.politician.fullName].filter(Boolean).join(' ')}
              </AppText>
              <AppText variant="muted">{subtitle}</AppText>
            </View>
          </View>
          <PhotoCreditLine politicianId={data.politician.id} />

          <View style={styles.actions}>
            <FavoriteButton
              type="politician"
              id={data.politician.id}
              title={data.politician.fullName}
              subtitle={subtitle || null}
            />
            <ShareButton
              title={data.politician.fullName}
              subtitle={subtitle || null}
              url={data.politician.source.url}
              publisher={data.politician.source.publisher}
            />
          </View>

          {data.mandate ? (
            <Card>
              <AppText variant="heading">Mandat</AppText>
              <InfoRow label="Parlament" value={`Bundestag (${data.mandate.termLabel.replace(/^Bundestag\s*/, '')})`} />
              <InfoRow label="Fraktion" value={data.mandate.fraction} />
              <ExplainLink topic="fraktion" small />
              <InfoRow label="Wie gewählt" value={describeHowElected(data.mandate.howElected)} />
              <ExplainLink topic="wahl" label={howElectedExplainLabel(data.mandate.howElected)} small />
              <InfoRow
                label="Wahlkreis"
                value={
                  data.mandate.constituency
                    ? `${data.mandate.constituency.number} – ${data.mandate.constituency.name}`
                    : null
                }
              />
              <InfoRow
                label="Landesliste"
                value={
                  data.mandate.electoralList
                    ? `${data.mandate.electoralList}${data.mandate.listPosition ? `, Platz ${data.mandate.listPosition}` : ''}`
                    : null
                }
              />
              <InfoRow label="Im Mandat seit" value={formatDate(data.mandate.start)} />
              <InfoRow label="Hinweis" value={data.mandate.note} />
              <SourceNote source={data.mandate.source} />
            </Card>
          ) : (
            <Card>
              <AppText>Für die aktuelle Wahlperiode ist kein Bundestagsmandat verzeichnet.</AppText>
            </Card>
          )}

          {data.mandate && !data.mandate.end ? <FiguresCard politicianId={data.politician.id} /> : null}

          <Card>
            <AppText variant="heading">Zur Person</AppText>
            <InfoRow label="Partei" value={data.politician.party} />
            <InfoRow label="Geburtsjahr" value={data.politician.birthYear} />
            <InfoRow label="Beruf (eigene Angabe)" value={data.politician.occupation} />
            <InfoRow label="Ausbildung (eigene Angabe)" value={data.politician.education} />
            <InfoRow label="Wohnort" value={data.politician.residence} />
            <SourceNote source={data.politician.source} />
            <ReportErrorLink
              context={{ page: 'profil', id: data.politician.id, name: data.politician.fullName }}
            />
          </Card>

          <CitizenQuestions
            politician={data.politician}
            questionsUrl={data.questionsUrl}
            canAsk={!!data.mandate && !data.mandate.end}
          />

          {data.mandate ? (
            <VotesSection mandateId={data.mandate.id} />
          ) : null}

          <AppText variant="small">
            Ausschüsse, Nebentätigkeiten sowie Reden und Anfragen folgen in einer der nächsten
            Versionen.
          </AppText>
        </>
      ) : null}
    </Screen>
  );
}

/** Urheber und Lizenz des Porträts – Pflichtangabe der Creative-Commons-Lizenzen. */
function PhotoCreditLine({ politicianId }: { politicianId: number }) {
  const credit = photoCredit(politicianId);
  if (!credit) return null;
  return (
    <View>
      <AppText variant="small">
        Foto: {credit.author} · {credit.license} · verkleinert und zugeschnitten
      </AppText>
      <ExternalLink url={credit.page} label="Bildseite bei Wikimedia Commons" />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headText: { flex: 1, gap: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
