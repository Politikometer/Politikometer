
import { AppPressable } from '@/ui/components/AppPressable';
import { AppText } from '@/ui/components/AppText';
import { openReportMail, type ReportContext } from '@/ui/report-error';
import { MIN_TOUCH, useTheme } from '@/ui/theme';

/** Kleiner Link „Fehler in diesen Angaben melden“ – öffnet eine E-Mail mit vorausgefülltem Betreff. */
export function ReportErrorLink({
  context,
  label = 'Fehler in diesen Angaben melden',
}: {
  context: ReportContext;
  label?: string;
}) {
  const { colors } = useTheme();
  return (
    <AppPressable
      focusRadius={4}
      onPress={() => openReportMail(context)}
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityHint="Öffnet dein E-Mail-Programm mit vorausgefülltem Betreff. Es wird nichts automatisch gesendet."
      style={{ minHeight: MIN_TOUCH, justifyContent: 'center' }}>
      <AppText variant="small" style={{ color: colors.primary, textDecorationLine: 'underline' }}>
        {label}
      </AppText>
    </AppPressable>
  );
}
