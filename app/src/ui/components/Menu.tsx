import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppPressable } from '@/ui/components/AppPressable';
import { AppText } from '@/ui/components/AppText';
import { cardShadow, MIN_TOUCH, radius, spacing, useTheme } from '@/ui/theme';

/** Mehrere Menüzeilen in einer gemeinsamen Fläche, getrennt durch feine Linien. */
export function MenuGroup({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const { colors } = theme;
  const rows = Children.toArray(children);
  return (
    <View
      style={[
        styles.group,
        { backgroundColor: colors.surface, borderColor: theme.dark ? colors.border : 'transparent' },
        cardShadow(theme),
      ]}>
      {rows.map((row, index) => (
        <View key={index}>
          {index > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
          {row}
        </View>
      ))}
    </View>
  );
}

type RowProps = {
  title: string;
  subtitle?: string;
  onPress: () => void;
  /** Zusatz für Screenreader, z. B. „Öffnet die Liste“. */
  hint?: string;
};

/** Ganze Zeile antippbar; Screenreader lesen Titel und Untertitel als eine Einheit. */
export function MenuRow({ title, subtitle, onPress, hint }: RowProps) {
  const { colors } = useTheme();
  return (
    <AppPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle].filter(Boolean).join(', ')}
      accessibilityHint={hint}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.primarySoft : 'transparent' }]}>
      <View style={styles.text}>
        <AppText style={styles.title}>{title}</AppText>
        {subtitle ? <AppText variant="small">{subtitle}</AppText> : null}
      </View>
      <AppText style={[styles.chevron, { color: colors.textMuted }]} importantForAccessibility="no">
        ›
      </AppText>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: radius.lg, borderWidth: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.md + 4 },
  row: {
    minHeight: MIN_TOUCH + 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.sm + 6,
    borderRadius: radius.lg,
  },
  text: { flex: 1, gap: 2 },
  title: { fontWeight: '600' },
  chevron: { fontSize: 24, lineHeight: 28 },
});
