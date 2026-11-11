import { Text, type TextProps } from 'react-native';

import { fontSize, useTheme } from '@/ui/theme';

type Variant = 'title' | 'heading' | 'body' | 'muted' | 'small';

type Props = TextProps & { variant?: Variant };

/** Text, der mit der Systemschriftgröße skaliert. Überschriften werden Screenreadern als solche gemeldet. */
export function AppText({ variant = 'body', style, ...rest }: Props) {
  const { colors } = useTheme();
  const isHeading = variant === 'title' || variant === 'heading';
  return (
    <Text
      accessibilityRole={isHeading ? 'header' : undefined}
      style={[
        {
          color: variant === 'muted' || variant === 'small' ? colors.textMuted : colors.text,
          fontSize: fontSize[variant === 'muted' ? 'body' : variant],
          lineHeight: Math.round(fontSize[variant === 'muted' ? 'body' : variant] * 1.4),
          fontWeight: isHeading ? '700' : '400',
        },
        style,
      ]}
      {...rest}
    />
  );
}
