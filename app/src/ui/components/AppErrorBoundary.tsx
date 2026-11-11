import type { ErrorBoundaryProps } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { ReportErrorLink } from '@/ui/components/ReportErrorLink';
import { spacing, useTheme } from '@/ui/theme';

/**
 * Wird angezeigt, wenn eine Seite beim Anzeigen abstürzt – statt eines leeren Bildschirms.
 * Die technische Fehlermeldung wird bewusst nicht gezeigt (für Nutzer nicht hilfreich, kann
 * Inhalte aus Antworten der Quellen enthalten). Braucht keine Provider, damit sie auch dann
 * funktioniert, wenn der Fehler im Grundgerüst der App liegt.
 */
export function AppErrorBoundary({ retry }: ErrorBoundaryProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        backgroundColor: colors.background,
      }}>
      <AppText variant="title" accessibilityRole="header">
        Etwas ist schiefgelaufen
      </AppText>
      <AppText accessibilityRole="alert">
        Diese Seite konnte nicht angezeigt werden. Deine Merkliste und die gespeicherten Daten sind davon nicht
        betroffen.
      </AppText>
      <Button label="Erneut versuchen" onPress={() => void retry()} />
      <AppText variant="muted">
        Tritt der Fehler wieder auf, schließe die App und öffne sie neu. Hilft das nicht, freuen wir uns über eine
        kurze Nachricht, auf welcher Seite es passiert ist.
      </AppText>
      <ReportErrorLink context={{ page: 'allgemein' }} label="Fehler melden" />
    </View>
  );
}
