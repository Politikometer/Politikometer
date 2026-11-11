import { StyleSheet } from 'react-native';

import { AppPressable } from '@/ui/components/AppPressable';
import { AppText } from '@/ui/components/AppText';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/ui/theme';

type Props = {
  label: string;
  onPress: () => void;
  /**
   * primary: gefüllt (wichtigste Aktion). secondary: zart getönte Fläche ohne Rahmen.
   * onHero: für die farbige Fläche oben auf der Startseite.
   */
  variant?: 'primary' | 'secondary' | 'onHero';
  disabled?: boolean;
  hint?: string;
  /**
   * Abweichender Name für Screenreader, wenn der sichtbare Text allein mehrdeutig ist
   * (z. B. mehrere „Entfernen“). Muss den sichtbaren Text enthalten (WCAG 2.5.3).
   */
  accessibilityLabel?: string;
};

export function Button({ label, onPress, variant = 'primary', disabled, hint, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const fill = { primary: colors.primary, secondary: colors.primarySoft, onHero: colors.heroAction }[variant];
  const text = { primary: colors.onPrimary, secondary: colors.primary, onHero: colors.onHeroAction }[variant];
  // Deaktiviert: nur ein dezenter Rahmen, Beschriftung in textMuted (≥ 4,5:1) statt Transparenz.
  const background = disabled ? 'transparent' : fill;
  const border = disabled ? colors.border : fill;
  const textColor = disabled ? colors.textMuted : text;
  return (
    <AppPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: background,
          borderColor: border,
          opacity: !disabled && pressed ? 0.8 : 1,
        },
      ]}>
      <AppText style={[styles.label, { color: textColor }]}>
        {label}
      </AppText>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH + 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontWeight: '600', textAlign: 'center' },
});
