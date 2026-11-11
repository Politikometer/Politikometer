
import { AppPressable } from '@/ui/components/AppPressable';
import { AppText } from '@/ui/components/AppText';
import { openLink } from '@/ui/open-link';
import { MIN_TOUCH, useTheme } from '@/ui/theme';

/** Link, der im In-App-Browser öffnet. */
export function ExternalLink({ url, label, small }: { url: string; label: string; small?: boolean }) {
  const { colors } = useTheme();
  return (
    <AppPressable
      focusRadius={4}
      onPress={() => openLink(url)}
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityHint="Öffnet im Browser"
      style={{ minHeight: MIN_TOUCH, justifyContent: 'center' }}>
      <AppText
        variant={small ? 'small' : 'body'}
        style={{ color: colors.primary, textDecorationLine: 'underline' }}>
        {label}
      </AppText>
    </AppPressable>
  );
}
