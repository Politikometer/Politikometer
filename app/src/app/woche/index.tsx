import { Stack } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { pollsInWindow } from '@/domain/legislation';
import { useTermPolls } from '@/features/gesetze/hooks';
import { useWeekOverview } from '@/features/woche/hooks';
import {
  LegislationSection,
  PollsSection,
  SessionsSection,
  WindowCard,
} from '@/features/woche/sections';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { SourceNote } from '@/ui/components/SourceNote';
import { QueryStatus } from '@/ui/components/StatusViews';
import { usePullToRefresh } from '@/ui/pull-to-refresh';
import { spacing } from '@/ui/theme';

export default function WeekScreen() {
  const week = useWeekOverview();
  const polls = useTermPolls();
  const refetchBoth = useCallback(
    () => Promise.all([week.refetch(), polls.refetch()]),
    [week, polls],
  );
  const refresh = usePullToRefresh(refetchBoth);
  const data = week.data;

  return (
    <Screen refresh={data ? refresh : undefined}>
      <Stack.Screen options={{ title: 'Letzte Sitzungswoche' }} />
      <AppText variant="title">Letzte Sitzungswoche</AppText>
      <AppText variant="muted">
        Was im Bundestag zuletzt passiert ist: namentliche Abstimmungen, Gesetzgebung und Sitzungen der
        letzten Sitzungswoche bis heute. Darüber steht, welcher Zeitraum genau gezeigt wird.
      </AppText>
      <QueryStatus query={week} loadingLabel="Sitzungen und Vorgänge werden geladen …" />

      {data ? (
        <>
          <WindowCard window={data.window} />

          <View style={{ gap: spacing.sm }}>
            <AppText variant="heading">Namentliche Abstimmungen</AppText>
            <AppText variant="muted">
              Abstimmungen, bei denen festgehalten wird, wie jede und jeder Abgeordnete gestimmt hat.
              Älteste zuerst.
            </AppText>
            <QueryStatus query={polls} loadingLabel="Abstimmungen werden geladen …" />
            {polls.data ? (
              <>
                <PollsSection polls={pollsInWindow(polls.data.polls, data.window)} />
                <SourceNote
                  source={{
                    publisher: 'abgeordnetenwatch.de',
                    url: 'https://www.abgeordnetenwatch.de/bundestag/abstimmungen',
                    license: 'CC0 1.0',
                    retrievedAt: polls.data.retrievedAt,
                  }}
                />
              </>
            ) : null}
          </View>

          <View style={{ gap: spacing.sm }}>
            <AppText variant="heading">Gesetzgebung</AppText>
            <AppText variant="muted">
              Alle Gesetzgebungsvorgänge, zu denen es im Zeitraum ein Dokument gibt – zum Beispiel
              einen neuen Gesetzentwurf, eine Beratung im Bundestag oder im Bundesrat. Unter jedem
              Eintrag steht, welche Schritte im Zeitraum lagen.
            </AppText>
            <LegislationSection data={data} />
          </View>

          <View style={{ gap: spacing.sm }}>
            <AppText variant="heading">Plenarsitzungen</AppText>
            <AppText variant="muted">
              Sitzungen von Bundestag und Bundesrat mit dem amtlichen Protokoll. Älteste zuerst.
            </AppText>
            <SessionsSection sessions={data.sessions} />
          </View>

          <Card>
            <AppText variant="heading">Tagesordnung</AppText>
            <AppText>
              Die Parlamentsdokumentation stellt keine Tagesordnung bereit. Was beraten wurde, steht im
              jeweiligen Protokoll.
            </AppText>
          </Card>

          <SourceNote source={data.source} linkLabel="Parlamentsdokumentation DIP öffnen" />
        </>
      ) : null}
    </Screen>
  );
}
