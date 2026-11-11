import { StyleSheet } from 'react-native';

import { AppPressable } from '@/ui/components/AppPressable';
import { AppText } from '@/ui/components/AppText';
import { cleanShareUrl, shareContent, type ShareContent } from '@/ui/share';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/ui/theme';

/**
 * „Teilen“: öffnet das Teilen-Menü des Geräts mit Titel und Link zur Originalquelle.
 * Generisch für Profile, Abstimmungen, Gesetze, Regierungsmitglieder.
 * Ohne sicheren (https-)Link wird nichts angezeigt.
 */
export function ShareButton(props: ShareContent & { label?: string }) {
  const { colors } = useTheme();
  const { label = 'Teilen', ...content } = props;
  if (!cleanShareUrl(content.url)) return null;
  return (
    <AppPressable
      onPress={() => shareContent(content)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Öffnet das Teilen-Menü deines Geräts mit Titel und Link zur Originalquelle"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft, opacity: pressed ? 0.85 : 1 },
      ]}>
      <AppText importantForAccessibility="no" style={[styles.label, { color: colors.primary }]}>
        {label}
      </AppText>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexGrow: 1,
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontWeight: '600', textAlign: 'center' },
});
