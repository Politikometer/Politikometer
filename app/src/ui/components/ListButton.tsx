import { StyleSheet, View } from 'react-native';

import { AppPressable } from '@/ui/components/AppPressable';
import { AppText } from '@/ui/components/AppText';
import { cardShadow, MIN_TOUCH, radius, spacing, useTheme } from '@/ui/theme';

type Props = {
  title: string;
  subtitle?: string | null;
  detail?: string | null;
  onPress: () => void;
  /** Zusatz für Screenreader, z. B. „Öffnet das Profil“. */
  hint?: string;
};

/** Ganze Zeile antippbar; Screenreader lesen Titel und Untertitel als eine Einheit. */
export function ListButton({ title, subtitle, detail, onPress, hint }: Props) {
  const theme = useTheme();
  const { colors } = theme;
  const label = [title, subtitle, detail].filter(Boolean).join(', ');
  return (
    <AppPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={({ pressed }) => [
        styles.row,
        {
          // Gedrückt deutlich sichtbar: getönte Fläche (Texte darauf ≥ 4,5:1).
          backgroundColor: pressed ? colors.primarySoft : colors.surface,
          borderColor: theme.dark ? colors.border : 'transparent',
        },
        cardShadow(theme),
      ]}>
      <View style={styles.text}>
        {/* Keine header-Rolle: Die ganze Zeile ist ein Knopf mit eigenem Namen. */}
        <AppText variant="heading" accessibilityRole="none" style={styles.title}>
          {title}
        </AppText>
        {subtitle ? <AppText variant="muted">{subtitle}</AppText> : null}
        {detail ? <AppText variant="small">{detail}</AppText> : null}
      </View>
      <AppText style={[styles.chevron, { color: colors.textMuted }]} importantForAccessibility="no">
        ›
      </AppText>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH + 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 18 },
  chevron: { fontSize: 24, lineHeight: 28 },
});
