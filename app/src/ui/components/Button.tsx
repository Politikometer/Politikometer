import { StyleSheet } from 'react-native';

import { AppPressable } from '@/ui/components/AppPressable';
import { AppText } from '@/ui/components/AppText';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/ui/theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
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
  const primary = variant === 'primary';
  // Deaktiviert: Fläche und Rahmen gedämpft, Beschriftung in textMuted (≥ 4,5:1) statt Transparenz.
  const background = disabled ? 'transparent' : primary ? colors.primary : 'transparent';
  const border = disabled ? colors.border : colors.primary;
  const textColor = disabled ? colors.textMuted : primary ? colors.onPrimary : colors.primary;
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
          opacity: !disabled && pressed ? 0.85 : 1,
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
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontWeight: '600', textAlign: 'center' },
});
