import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { radius, spacing, useTheme } from '@/ui/theme';

export function Card({ children, style, ...rest }: ViewProps & { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: spacing.md,
          gap: spacing.sm,
        },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}
