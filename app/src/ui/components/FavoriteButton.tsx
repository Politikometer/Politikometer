import type { Href } from 'expo-router';
import { AccessibilityInfo, Alert, StyleSheet } from 'react-native';

import { favoritesProblemText, favoritesStore, useFavorites, type Favorite, type FavoriteType } from '@/state/favorites';
import { AppPressable } from '@/ui/components/AppPressable';
import { AppText } from '@/ui/components/AppText';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/ui/theme';

type Props = {
  type: FavoriteType;
  id: string | number;
  /** Anzeigename, z. B. „Friedrich Merz“. */
  title: string;
  /** Zusatzzeile, z. B. „CDU · Mitglied des Bundestages“. */
  subtitle?: string | null;
};

/** Überschriften der Gruppen auf der Merkliste, in dieser Reihenfolge. */
export const FAVORITE_GROUPS: { type: FavoriteType; label: string }[] = [
  { type: 'politician', label: 'Abgeordnete' },
  { type: 'minister', label: 'Bundesregierung' },
  { type: 'proceeding', label: 'Gesetze und Vorhaben' },
];

/**
 * Ziel eines gemerkten Eintrags; null, solange es dafür noch keine Seite gibt.
 * Für Regierungsmitglieder (Wikidata-QID) ergänzt die Projektleitung die Route hier.
 */
export function favoriteHref(item: Pick<Favorite, 'type' | 'id'>): Href | null {
  switch (item.type) {
    case 'politician':
      return { pathname: '/politiker/[id]', params: { id: item.id } };
    case 'proceeding':
      return { pathname: '/gesetz/[id]', params: { id: item.id } };
    case 'minister':
      return { pathname: '/regierung/minister/[qid]', params: { qid: item.id } };
  }
}

/** „Merken“ mit Stern und Text. Speichert nur auf dem Gerät. */
export function FavoriteButton({ type, id, title, subtitle }: Props) {
  const { colors } = useTheme();
  const { loaded, problem, isFavorite, toggle, retry } = useFavorites();
  const selected = isFavorite(type, id);
  const label = problem ? 'Merken nicht möglich' : selected ? 'Gemerkt' : 'Merken';

  async function onPress() {
    if (problem) {
      // Nach einem Lesefehler erneut lesen; klappt es, gleich wie gewohnt merken.
      if (problem === 'readError') await retry();
      const still = favoritesStore.getSnapshot().problem;
      if (still) {
        Alert.alert('Merkliste gesperrt', favoritesProblemText(still));
        return;
      }
    }
    const nowSaved = await toggle({ type, id: String(id), title, subtitle: subtitle ?? null });
    AccessibilityInfo.announceForAccessibility(
      nowSaved ? `${title} gemerkt.` : `${title} aus der Merkliste entfernt.`,
    );
  }

  return (
    <AppPressable
      onPress={onPress}
      disabled={!loaded}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={
        problem
          ? favoritesProblemText(problem)
          : selected
          ? `Entfernt ${title} aus deiner Merkliste`
          : `Speichert ${title} in deiner Merkliste auf diesem Gerät`
      }
      accessibilityState={{ selected, disabled: !loaded }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: selected ? colors.primary : colors.primarySoft,
          borderColor: selected ? colors.primary : colors.primarySoft,
          opacity: !loaded ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}>
      <AppText
        importantForAccessibility="no"
        style={[styles.label, { color: selected ? colors.onPrimary : colors.primary }]}>
        {selected ? '★' : '☆'} {label}
      </AppText>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexGrow: 1,
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontWeight: '600', textAlign: 'center' },
});
