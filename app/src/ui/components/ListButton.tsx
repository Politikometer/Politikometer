import { StyleSheet, View } from 'react-native';

import { AppPressable } from '@/ui/components/AppPressable';
import { AppText } from '@/ui/components/AppText';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/ui/theme';

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
  const { colors } = useTheme();
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
          // Gedrückt deutlich sichtbar: Fläche in der Rahmenfarbe (Texte darauf ≥ 4,5:1).
          backgroundColor: pressed ? colors.border : colors.surface,
          borderColor: colors.border,
        },
      ]}>
      <View style={styles.text}>
        {/* Keine header-Rolle: Die ganze Zeile ist ein Knopf mit eigenem Namen. */}
        <AppText variant="heading" accessibilityRole="none" style={styles.title}>
          {title}
        </AppText>
        {subtitle ? <AppText variant="muted">{subtitle}</AppText> : null}
        {detail ? <AppText variant="small">{detail}</AppText> : null}
      </View>
      <AppText variant="heading" style={{ color: colors.primary }} importantForAccessibility="no">
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
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 19 },
});
