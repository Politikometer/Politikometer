import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { getConstituency } from '@/data/sources/local/plz-lookup';
import { plzDataset } from '@/data/sources/local/plz-dataset';
import type { Representative } from '@/domain/model';
import { describeHowElected, groupByHowElected } from '@/domain/representatives';
import { useRepresentatives } from '@/features/bundestag/hooks';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { ExplainLink } from '@/ui/components/ExplainLink';
import { Avatar } from '@/ui/components/Avatar';
import { Card } from '@/ui/components/Card';
import { ListButton } from '@/ui/components/ListButton';
import { Screen } from '@/ui/components/Screen';
import { SourceNote } from '@/ui/components/SourceNote';
import { QueryStatus } from '@/ui/components/StatusViews';
import { usePullToRefresh } from '@/ui/pull-to-refresh';
import { spacing } from '@/ui/theme';

export default function ConstituencyScreen() {
  const router = useRouter();
  const { nr = '' } = useLocalSearchParams<{ nr?: string }>();
  const number = Number(nr);
  const constituency = getConstituency(number, plzDataset);
  const query = useRepresentatives(number);
  const refresh = usePullToRefresh(query.refetch);

  const openProfile = (r: Representative) =>
    router.push({ pathname: '/politiker/[id]', params: { id: String(r.politician.id) } });

  const renderPerson = (r: Representative) => (
    <ListButton
      key={r.mandate.id}
      title={r.politician.fullName}
      subtitle={r.mandate.fraction ?? r.politician.party}
      detail={describeHowElected(r.mandate.howElected)}
      hint="Öffnet das Profil"
      leading={
        <Avatar
          politicianId={r.politician.id}
          name={r.politician.fullName}
          fraction={r.mandate.fraction ?? r.politician.party}
        />
      }
      onPress={() => openProfile(r)}
    />
  );

  const groups = query.data ? groupByHowElected(query.data.representatives) : null;

  return (
    <Screen refresh={refresh}>
      <View>
        <AppText variant="small">
          Bundestagswahlkreis {constituency.number}
          {constituency.state ? ` · ${constituency.state}` : ''}
        </AppText>
        <AppText variant="title">{constituency.name}</AppText>
      </View>

      <QueryStatus query={query} />

      {groups ? (
        <>
          <Section title="Direkt gewählt">
            {groups.direct.length ? (
              groups.direct.map(renderPerson)
            ) : (
              <Card>
                <AppText>
                  Aus diesem Wahlkreis sitzt niemand mit Direktmandat im Bundestag. Seit der
                  Wahlrechtsreform 2023 erhält die Person mit den meisten Erststimmen nur dann ein
                  Mandat, wenn es durch das Zweitstimmenergebnis ihrer Partei gedeckt ist.
                </AppText>
                <ExplainLink topic="wahlrecht-2023" small />
              </Card>
            )}
          </Section>

          {groups.other.length ? (
            <Section
              title="Weitere Abgeordnete aus diesem Wahlkreis"
              intro="Sie haben hier kandidiert und sind über eine Landesliste in den Bundestag eingezogen oder nachgerückt.">
              {groups.other.map(renderPerson)}
            </Section>
          ) : null}

          <AppText variant="small">
            Reihenfolge: alphabetisch nach Nachnamen. {query.data!.term.label}.
          </AppText>
          <Button
            label="Alle Kandidierenden der letzten Wahl"
            variant="secondary"
            hint="Zeigt alle, die in diesem Wahlkreis kandidiert haben"
            onPress={() =>
              router.push({ pathname: '/kandidaten/[nr]', params: { nr: String(constituency.number) } })
            }
          />
          <SourceNote
            source={{
              publisher: 'abgeordnetenwatch.de',
              url: 'https://www.abgeordnetenwatch.de/bundestag',
              license: 'CC0 1.0',
              retrievedAt: query.data!.retrievedAt,
            }}
          />
        </>
      ) : null}
    </Screen>
  );
}

function Section({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="heading">{title}</AppText>
      {intro ? <AppText variant="muted">{intro}</AppText> : null}
      {children}
    </View>
  );
}
