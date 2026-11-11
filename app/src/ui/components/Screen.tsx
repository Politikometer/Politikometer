import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/ui/components/Button';
import { spacing, useTheme } from '@/ui/theme';

export type RefreshProps = { refreshing: boolean; onRefresh: () => void };

/**
 * Scrollbarer Bildschirm mit einheitlichem Rand. Optional mit Knopf „Jetzt aktualisieren“.
 *
 * Kein „Zum Aktualisieren ziehen“ (RefreshControl): Auf Android (React Native 0.88, Expo Go)
 * blieb der ganze Inhalt damit unsichtbar – am Gerät nachgewiesen am 31.10.2026.
 */
export function Screen({ children, refresh }: { children: ReactNode; refresh?: RefreshProps }) {
  const { colors } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled">
      {children}
      {refresh ? <RefreshButton {...refresh} /> : null}
    </ScrollView>
  );
}

/** Daten sofort neu abrufen (zusätzlich zur automatischen Aktualisierung). */
export function RefreshButton({ refreshing, onRefresh }: RefreshProps) {
  return (
    <Button
      label={refreshing ? 'Wird aktualisiert …' : 'Jetzt aktualisieren'}
      variant="secondary"
      disabled={refreshing}
      hint="Lädt die Daten sofort neu aus der Quelle"
      onPress={onRefresh}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
});
