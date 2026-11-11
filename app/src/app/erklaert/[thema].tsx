import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import {
  EXPLAIN_STAND,
  getExplainTopic,
  type ExplainItem,
  type ExplainSection,
} from '@/content/erklaerungen';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { ExplainLink } from '@/ui/components/ExplainLink';
import { ExternalLink } from '@/ui/components/ExternalLink';
import { Screen } from '@/ui/components/Screen';
import { spacing } from '@/ui/theme';

export default function ExplainTopicScreen() {
  const router = useRouter();
  const { thema } = useLocalSearchParams<{ thema?: string }>();
  const topic = getExplainTopic(thema);

  if (!topic) {
    return (
      <Screen>
        <AppText variant="title">Erklärung nicht gefunden</AppText>
        <AppText>Zu diesem Link gibt es keine Erklärseite. Alle Themen findest du in der Übersicht.</AppText>
        <Button label="Zur Übersicht" onPress={() => router.replace('/erklaert')} />
      </Screen>
    );
  }

  const related = topic.related
    .map((id) => getExplainTopic(id))
    .filter((t) => t !== undefined);

  return (
    <Screen>
      <Stack.Screen options={{ title: topic.shortTitle }} />
      <View style={{ gap: spacing.sm }}>
        <AppText variant="title">{topic.title}</AppText>
        <AppText variant="muted">{topic.summary}</AppText>
      </View>

      {topic.sections.map((s) => (
        <Section key={s.heading} section={s} />
      ))}

      {related.length ? (
        <Card>
          <AppText variant="heading">Mehr dazu</AppText>
          {related.map((t) => (
            <ExplainLink key={t.id} topic={t.id} label={t.title} />
          ))}
        </Card>
      ) : null}

      <Card>
        <AppText variant="heading">Zum Weiterlesen</AppText>
        {topic.sources.map((src) => (
          <ExternalLink key={src.url} url={src.url} label={src.label} />
        ))}
      </Card>

      <AppText variant="small">
        Stand: {EXPLAIN_STAND}. Eigene, vereinfachte Erklärung. Verbindlich sind das Grundgesetz und
        die Gesetze selbst.
      </AppText>
    </Screen>
  );
}

function Section({ section }: { section: ExplainSection }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="heading">{section.heading}</AppText>
      {section.paragraphs?.map((p) => (
        <AppText key={p}>{p}</AppText>
      ))}
      {section.items ? (
        <View style={{ gap: spacing.sm }}>
          {section.items.map((item, i) => (
            <ListItem
              key={`${item.term ?? ''}${item.text}`}
              item={item}
              marker={section.ordered ? `${i + 1}.` : '•'}
              ordered={!!section.ordered}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ListItem({ item, marker, ordered }: { item: ExplainItem; marker: string; ordered: boolean }) {
  // Screenreader lesen den Punkt als eine Einheit; Aufzählungszeichen werden nicht vorgelesen,
  // Nummern schon („Schritt 1“).
  const label = [ordered ? `Schritt ${marker.replace('.', '')}` : null, item.term, item.text]
    .filter(Boolean)
    .join(': ');
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{ flexDirection: 'row', gap: spacing.sm }}>
      <AppText style={{ minWidth: ordered ? 24 : 12 }}>{marker}</AppText>
      <AppText style={{ flex: 1 }}>
        {item.term ? <AppText style={{ fontWeight: '700' }}>{item.term}: </AppText> : null}
        {item.text}
      </AppText>
    </View>
  );
}
