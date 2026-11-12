import { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { allPhotoCredits, PHOTOS_RETRIEVED_AT } from '@/data/sources/local/photos';
import { AppPressable } from '@/ui/components/AppPressable';
import { AppText } from '@/ui/components/AppText';
import { formatDate } from '@/ui/format';
import { openLink } from '@/ui/open-link';
import { MIN_TOUCH, spacing, useTheme } from '@/ui/theme';

/** Urheber und Lizenz jedes mitgelieferten Porträts – Pflichtangabe der Creative-Commons-Lizenzen. */
export default function PhotoCreditsScreen() {
  const { colors } = useTheme();
  const rows = useMemo(
    () =>
      allPhotoCredits()
        .map((c) => ({ ...c, name: c.credit.name ?? `Person ${c.key}` }))
        .sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [],
  );

  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => r.key}
      ListHeaderComponent={
        <View style={styles.header}>
          <AppText variant="title">Bildnachweise</AppText>
          <AppText>
            Die Porträts stammen von Wikimedia Commons und stehen unter freien Lizenzen. Sie wurden verkleinert und
            auf das Gesicht zugeschnitten, sonst nicht verändert. Stand: {formatDate(PHOTOS_RETRIEVED_AT)}.
          </AppText>
          <AppText variant="small">
            Wo kein frei lizenziertes Foto vorliegt, zeigt die App die Anfangsbuchstaben des Namens.
          </AppText>
        </View>
      }
      renderItem={({ item }) => (
        <AppPressable
          onPress={() => openLink(item.credit.page)}
          accessibilityRole="link"
          accessibilityLabel={`${item.name}: Foto von ${item.credit.author}, Lizenz ${item.credit.license}`}
          accessibilityHint="Öffnet die Bildseite bei Wikimedia Commons"
          style={styles.row}>
          <AppText style={styles.name}>{item.name}</AppText>
          <AppText variant="small">
            Foto: {item.credit.author} · {item.credit.license}
          </AppText>
          <AppText variant="small" style={{ color: colors.primary, textDecorationLine: 'underline' }}>
            Bildseite bei Wikimedia Commons
          </AppText>
        </AppPressable>
      )}
      ItemSeparatorComponent={() => <View style={[styles.line, { backgroundColor: colors.border }]} />}
      initialNumToRender={15}
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md },
  header: { gap: spacing.sm, marginBottom: spacing.md },
  row: { minHeight: MIN_TOUCH, paddingVertical: spacing.sm, gap: 2, justifyContent: 'center' },
  name: { fontWeight: '600' },
  line: { height: StyleSheet.hairlineWidth },
});
