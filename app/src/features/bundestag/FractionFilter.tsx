import { StyleSheet, View } from 'react-native';

import { AppPressable } from '@/ui/components/AppPressable';
import { AppText } from '@/ui/components/AppText';
import { MIN_TOUCH, spacing, useTheme } from '@/ui/theme';

/**
 * Neutrale Auswahl einer Fraktion: alphabetisch (Reihenfolge kommt von außen),
 * alle Schaltflächen gleich gestaltet, ohne Parteifarben.
 */
export function FractionFilter({
  fractions,
  selected,
  onSelect,
}: {
  fractions: string[];
  selected: string | null;
  onSelect: (fraction: string | null) => void;
}) {
  return (
    <View style={styles.wrap} accessibilityLabel="Nach Fraktion filtern" accessibilityRole="radiogroup">
      <Chip label="Alle" active={selected === null} onPress={() => onSelect(null)} />
      {fractions.map((f) => (
        <Chip key={f} label={f} active={selected === f} onPress={() => onSelect(f)} />
      ))}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <AppPressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label === 'Alle' ? 'Alle Fraktionen' : `Fraktion ${label}`}
      accessibilityState={{ selected: active, checked: active }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.primarySoft,
          borderColor: active ? colors.primary : colors.primarySoft,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <AppText variant="small" style={{ color: active ? colors.onPrimary : colors.primary, fontWeight: '600' }}>
        {label}
      </AppText>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: 24,
    justifyContent: 'center',
  },
});
