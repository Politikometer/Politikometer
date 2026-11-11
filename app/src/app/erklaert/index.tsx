import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { EXPLAIN_STAND, EXPLAIN_TOPICS } from '@/content/erklaerungen';
import { AppText } from '@/ui/components/AppText';
import { ListButton } from '@/ui/components/ListButton';
import { Screen } from '@/ui/components/Screen';
import { spacing } from '@/ui/theme';

/** Übersicht „So funktioniert Politik“. Reihenfolge: vom Parlament über Wahl und Gesetz bis zu den Daten. */
export default function ExplainOverviewScreen() {
  const router = useRouter();
  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="title">So funktioniert Politik</AppText>
        <AppText>
          Kurze Erklärungen zu Begriffen, die in der App vorkommen. Die Texte sind vereinfacht und
          funktionieren auch ohne Internet.
        </AppText>
      </View>

      <View style={{ gap: spacing.sm }}>
        {EXPLAIN_TOPICS.map((t) => (
          <ListButton
            key={t.id}
            title={t.title}
            subtitle={t.summary}
            hint="Öffnet die Erklärung"
            onPress={() => router.push({ pathname: '/erklaert/[thema]', params: { thema: t.id } })}
          />
        ))}
      </View>

      <AppText variant="small">
        Stand: {EXPLAIN_STAND}. Eigene, vereinfachte Erklärungen. Verbindlich sind das Grundgesetz
        und die Gesetze selbst.
      </AppText>
    </Screen>
  );
}
