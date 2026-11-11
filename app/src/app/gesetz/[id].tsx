import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { matchPolls, type Legislation } from '@/domain/legislation';
import { entryIntoForceLines } from '@/features/gesetze/entry-into-force';
import { isProceedingId, useLegislation, useTermPolls } from '@/features/gesetze/hooks';
import { LegislationExplainer } from '@/features/gesetze/LegislationExplainer';
import { PollLink } from '@/features/gesetze/PollLink';
import { StepTimeline } from '@/features/gesetze/StepTimeline';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { ExplainLink } from '@/ui/components/ExplainLink';
import { ExternalLink } from '@/ui/components/ExternalLink';
import { FavoriteButton } from '@/ui/components/FavoriteButton';
import { InfoRow } from '@/ui/components/InfoRow';
import { Screen } from '@/ui/components/Screen';
import { ShareButton } from '@/ui/components/ShareButton';
import { ReportErrorLink } from '@/ui/components/ReportErrorLink';
import { SourceNote } from '@/ui/components/SourceNote';
import { QueryStatus } from '@/ui/components/StatusViews';
import { formatDate } from '@/ui/format';
import { usePullToRefresh } from '@/ui/pull-to-refresh';
import { spacing } from '@/ui/theme';

/** Namentliche Abstimmungen – nur bei eindeutiger Zuordnung über die Drucksache des Gesetzentwurfs. */
function PollsSection({ legislation }: { legislation: Legislation }) {
  const query = useTermPolls();
  // Fehler oder fehlende Zuordnung: bewusst nichts anzeigen (die Angabe ist eine Ergänzung).
  if (!query.data) return null;
  const polls = matchPolls(legislation, query.data.polls);
  if (polls.length === 0) return null;
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="heading">Namentliche Abstimmung</AppText>
      <AppText variant="muted">
        Zu diesem Gesetzentwurf gab es im Bundestag {polls.length === 1 ? 'eine namentliche Abstimmung' : `${polls.length} namentliche Abstimmungen`}.
        Dort steht, wie jede und jeder Abgeordnete gestimmt hat.
      </AppText>
      {polls.map((p) => (
        <PollLink key={p.id} poll={p} />
      ))}
      <SourceNote
        source={{
          publisher: 'abgeordnetenwatch.de',
          url: 'https://www.abgeordnetenwatch.de/bundestag/abstimmungen',
          license: 'CC0 1.0',
          retrievedAt: query.data.retrievedAt,
        }}
      />
    </View>
  );
}

function Overview({ l }: { l: Legislation }) {
  return (
    <Card>
      <AppText variant="small">
        {[l.type, l.electoralPeriod ? `${l.electoralPeriod}. Wahlperiode` : null].filter(Boolean).join(' · ')}
      </AppText>
      <AppText variant="title">{l.title}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <FavoriteButton type="proceeding" id={l.id} title={l.title} subtitle={l.status ?? l.type} />
        <ShareButton title={l.title} url={l.source.url} subtitle={l.status} publisher="DIP" />
      </View>
      <InfoRow label="Initiative" value={l.initiative.join(', ')} />
      <InfoRow label="Beratungsstand" value={l.status} />
      <ExplainLink topic="beratungsstand" small />
      <InfoRow label="Letztes Dokument vom" value={formatDate(l.lastDocumentDate)} />
      {l.promulgations.map((p, i) => (
        <View key={i} style={{ gap: spacing.xs }}>
          <InfoRow
            label="Verkündet"
            value={[formatDate(p.date), p.citation].filter(Boolean).join(' · ') || null}
          />
          {p.url ? <ExternalLink small url={p.url} label={`${p.citation ?? 'Verkündung'} öffnen`} /> : null}
        </View>
      ))}
      <InfoRow
        label="Inkrafttreten"
        value={entryIntoForceLines(l.entryIntoForce ?? []).join('\n') || null}
      />
      <InfoRow label="Zustimmungsbedürftigkeit" value={l.consent.join('; ') || null} />
      {l.consent.length ? (
        <ExplainLink topic="gesetzgebung" label="Was heißt zustimmungsbedürftig?" small />
      ) : null}
      <InfoRow label="Sachgebiete" value={l.subjects.join(', ') || null} />
    </Card>
  );
}

export default function LegislationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const query = useLegislation(id);
  const refresh = usePullToRefresh(query.refetch);
  const l = query.data;

  return (
    <Screen refresh={l ? refresh : undefined}>
      <Stack.Screen options={{ title: 'Gesetz verfolgen' }} />
      {!isProceedingId(id) ? (
        <Card accessibilityRole="alert">
          <AppText>
            Dieser Vorgang ist nicht bekannt. Vielleicht ist der Link veraltet. Über die Startseite
            findest du Gesetze zum Beispiel unter „Letzte Sitzungswoche“.
          </AppText>
          <Button label="Zur Startseite" onPress={() => router.dismissTo('/')} />
        </Card>
      ) : (
        <QueryStatus query={query} loadingLabel="Gesetzgebungsvorgang wird geladen …" />
      )}

      {l ? (
        <>
          <Overview l={l} />

          {l.summary ? (
            <Card>
              <AppText variant="heading">Kurzbeschreibung</AppText>
              <AppText>{l.summary}</AppText>
              <AppText variant="small">Amtliche Kurzbeschreibung aus der Parlamentsdokumentation.</AppText>
            </Card>
          ) : null}

          <View style={{ gap: spacing.sm }}>
            <AppText variant="heading">Ablauf</AppText>
            <AppText variant="muted">
              Alle Schritte in zeitlicher Reihenfolge, älteste zuerst, mit der amtlichen Bezeichnung
              und dem zugehörigen Dokument.
            </AppText>
            {l.steps.length === 0 ? (
              <Card>
                <AppText>Für diesen Vorgang sind noch keine Schritte erfasst.</AppText>
              </Card>
            ) : (
              <StepTimeline steps={l.steps} />
            )}
            {l.missingSteps > 0 ? (
              <AppText variant="small">
                {l.missingSteps} weitere Schritte sind hier nicht geladen. Den vollständigen Ablauf
                zeigt der Eintrag im DIP.
              </AppText>
            ) : null}
          </View>

          <PollsSection legislation={l} />

          <SourceNote source={l.source} linkLabel="Vorgang im DIP ansehen" />
          <ReportErrorLink context={{ page: 'gesetz', id: l.id, name: l.title }} />
        </>
      ) : null}

      <LegislationExplainer />
    </Screen>
  );
}
