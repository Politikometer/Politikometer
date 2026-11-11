import { useRouter } from 'expo-router';

import { getExplainTopic, type ExplainTopicId } from '@/content/erklaerungen';
import { AppPressable } from '@/ui/components/AppPressable';
import { AppText } from '@/ui/components/AppText';
import { MIN_TOUCH, useTheme } from '@/ui/theme';

type Props = {
  /** Stabile Themen-ID, siehe `EXPLAIN_TOPIC_IDS` in `src/content/erklaerungen.ts`. */
  topic: ExplainTopicId;
  /** Sichtbarer Text; Standard ist eine konkrete Frage zum Thema (siehe `EXPLAIN_LINK_LABELS`). */
  label?: string;
  small?: boolean;
};

/**
 * Standardtext je Thema: konkrete Frage statt „Was bedeutet das?“, damit der Link auch
 * aus dem Zusammenhang gerissen verständlich ist (WCAG 2.4.4).
 */
export const EXPLAIN_LINK_LABELS: Record<ExplainTopicId, string> = {
  bundestag: 'Was macht der Bundestag?',
  gesetzgebung: 'Wie entsteht ein Gesetz?',
  beratungsstand: 'Was bedeutet der Beratungsstand?',
  wahl: 'Was heißt Direktmandat?',
  'wahlrecht-2023': 'Was ist die Wahlrechtsreform 2023?',
  fraktion: 'Was ist eine Fraktion?',
  abstimmung: 'Was ist eine namentliche Abstimmung?',
  regierung: 'Wie ist die Bundesregierung aufgebaut?',
  bundesrat: 'Was macht der Bundesrat?',
  drucksache: 'Was ist eine Drucksache?',
  datenquellen: 'Woher kommen die Daten?',
};

/**
 * Kontextlink zu einer Erklärseite (/erklaert/<thema>), offline verfügbar.
 * Beispiel: `<ExplainLink topic="wahl" />` neben „Direktmandat“.
 */
export function ExplainLink({ topic, label = EXPLAIN_LINK_LABELS[topic], small }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const title = getExplainTopic(topic)?.title;
  return (
    <AppPressable
      focusRadius={4}
      onPress={() => router.push({ pathname: '/erklaert/[thema]', params: { thema: topic } })}
      accessibilityRole="link"
      accessibilityLabel={title && title !== label ? `${label} Erklärung: ${title}` : label}
      accessibilityHint="Öffnet eine Erklärseite in der App"
      style={{ minHeight: MIN_TOUCH, justifyContent: 'center', alignSelf: 'flex-start' }}>
      <AppText
        variant={small ? 'small' : 'body'}
        style={{ color: colors.primary, textDecorationLine: 'underline' }}>
        {label}
      </AppText>
    </AppPressable>
  );
}
