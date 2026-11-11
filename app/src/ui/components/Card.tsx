import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { cardShadow, radius, spacing, useTheme } from '@/ui/theme';

/** Ruhige Fläche: hell mit weichem Schatten statt Rahmen, dunkel mit feinem Rahmen. */
export function Card({ children, style, ...rest }: ViewProps & { children: ReactNode }) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: theme.dark ? colors.border : 'transparent',
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: spacing.md + 4,
          gap: spacing.sm,
        },
        cardShadow(theme),
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}
