import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { describeError } from '@/ui/error-text';
import { spacing, useTheme } from '@/ui/theme';

export function Loading({ label = 'Daten werden geladen …' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText variant="muted">{label}</AppText>
    </View>
  );
}

export { describeError };

export function ErrorMessage({
  error,
  onRetry,
  hasCachedData,
}: {
  error: unknown;
  onRetry?: () => void;
  /** Zeigt an, dass ältere, gespeicherte Daten angezeigt werden. */
  hasCachedData?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Card
      style={{ backgroundColor: colors.errorSurface, borderColor: colors.error }}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <AppText style={{ color: colors.error, fontWeight: '600' }}>
        {hasCachedData ? 'Aktualisierung fehlgeschlagen' : 'Fehler beim Laden'}
      </AppText>
      <AppText>
        {describeError(error)}
        {hasCachedData ? ' Angezeigt werden die zuletzt gespeicherten Daten.' : ''}
      </AppText>
      {onRetry ? <Button label="Erneut versuchen" variant="secondary" onPress={onRetry} /> : null}
    </Card>
  );
}

/** Die Adresse enthält keine gültige Kennung (veralteter oder fehlerhafter Link). */
export function InvalidLinkMessage() {
  const router = useRouter();
  return (
    <Card accessibilityRole="alert">
      <AppText>Diese Seite gibt es nicht. Vielleicht ist der Link veraltet oder unvollständig.</AppText>
      <Button label="Zur Startseite" onPress={() => router.dismissTo('/')} />
    </Card>
  );
}

/** Kein Netz und noch keine gespeicherten Daten. */
export function OfflineMessage() {
  return (
    <Card accessibilityRole="alert" accessibilityLiveRegion="polite">
      <AppText style={{ fontWeight: '600' }}>Keine Internetverbindung</AppText>
      <AppText>
        Für diese Seite sind noch keine Daten auf deinem Gerät gespeichert. Sie werden geladen, sobald
        du wieder online bist.
      </AppText>
    </Card>
  );
}

type QueryLike = {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data: unknown;
  fetchStatus: 'fetching' | 'paused' | 'idle';
  refetch: () => unknown;
};

/**
 * Lade-, Offline- und Fehlerzustand einer Abfrage an einer Stelle.
 * Offline mit gespeicherten Daten: kurzer Hinweis, die Daten bleiben sichtbar.
 */
export function QueryStatus({ query, loadingLabel }: { query: QueryLike; loadingLabel?: string }) {
  const hasData = query.data !== undefined;
  if (query.fetchStatus === 'paused') {
    return hasData ? (
      <AppText variant="small" accessibilityLiveRegion="polite">
        Keine Internetverbindung – angezeigt wird der zuletzt gespeicherte Stand.
      </AppText>
    ) : (
      <OfflineMessage />
    );
  }
  if (query.isPending) return <Loading label={loadingLabel} />;
  if (query.isError) {
    return <ErrorMessage error={query.error} onRetry={() => query.refetch()} hasCachedData={hasData} />;
  }
  return null;
}
