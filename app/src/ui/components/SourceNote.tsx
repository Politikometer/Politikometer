import { StyleSheet, View } from 'react-native';

import type { SourceRef } from '@/domain/model';
import { AppPressable } from '@/ui/components/AppPressable';
import { AppText } from '@/ui/components/AppText';
import { formatDate, formatDateTime } from '@/ui/format';
import { openLink } from '@/ui/open-link';
import { MIN_TOUCH, useTheme } from '@/ui/theme';

/**
 * Zeile mit Quelle, Lizenz und Zeitpunkt. Live abgerufen: „abgerufen am …“; aus einer mit der
 * App ausgelieferten Datei (`snapshot`): „Quelle: Wikidata (CC0 1.0), Stand: 05.11.2026“.
 */
export function sourceLine(source: SourceRef): string {
  if (source.snapshot) {
    const stand = formatDate(source.retrievedAt);
    return `Quelle: ${source.publisher} (${source.license})${stand ? `, Stand: ${stand}` : ''}`;
  }
  const retrieved = formatDateTime(source.retrievedAt);
  return `Quelle: ${source.publisher} · Lizenz: ${source.license}${retrieved ? ` · abgerufen am ${retrieved}` : ''}`;
}

/** Quelle, Lizenz und Abrufdatum bzw. Stand – steht unter jeder Information. */
export function SourceNote({ source, linkLabel }: { source: SourceRef; linkLabel?: string }) {
  const { colors } = useTheme();
  const label = linkLabel ?? `Original bei ${source.publisher} ansehen`;
  return (
    <View style={styles.box}>
      <AppText variant="small">{sourceLine(source)}</AppText>
      <AppPressable
        focusRadius={4}
        onPress={() => openLink(source.url)}
        accessibilityRole="link"
        accessibilityLabel={label}
        accessibilityHint="Öffnet die Originalquelle im Browser"
        style={styles.link}>
        <AppText variant="small" style={{ color: colors.primary, textDecorationLine: 'underline' }}>
          {label}
        </AppText>
      </AppPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 0 },
  link: { minHeight: MIN_TOUCH, justifyContent: 'center' },
});
