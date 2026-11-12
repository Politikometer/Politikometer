import { StyleSheet, View } from 'react-native';

import { AppText } from '@/ui/components/AppText';
import { spacing, useTheme } from '@/ui/theme';

/** Schmaler Balken für einen Anteil 0–1. Reine Zierde: Der Wert steht immer als Text daneben. */
export function Bar({ fraction, color, height = 8 }: { fraction: number; color?: string; height?: number }) {
  const { colors } = useTheme();
  const width = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%` as const;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: colors.primarySoft }]}>
      <View style={{ width, height, borderRadius: height / 2, backgroundColor: color ?? colors.primary }} />
    </View>
  );
}

type MeterProps = { label: string; value: string; fraction: number; detail?: string };

/** Beschriftete Kennzahl mit Balken; Screenreader lesen sie als einen Satz. */
export function Meter({ label, value, fraction, detail }: MeterProps) {
  return (
    <View accessible accessibilityLabel={[`${label}: ${value}`, detail].filter(Boolean).join(', ')} style={styles.meter}>
      <View style={styles.head}>
        <AppText style={styles.label}>{label}</AppText>
        <AppText style={styles.value}>{value}</AppText>
      </View>
      <Bar fraction={fraction} />
      {detail ? <AppText variant="small">{detail}</AppText> : null}
    </View>
  );
}

export type Segment = { key: string; label: string; count: number; color: string };

/** Gestapelter Balken (z. B. Sitzverteilung) mit Legende. Die Legende trägt die Information. */
export function StackedBar({ segments, unit }: { segments: Segment[]; unit: string }) {
  const { colors } = useTheme();
  const total = segments.reduce((sum, s) => sum + s.count, 0);
  if (!total) return null;
  return (
    <View style={{ gap: spacing.sm }}>
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[styles.stack, { backgroundColor: colors.primarySoft }]}>
        {segments.map((s) => (
          <View key={s.key} style={{ flex: s.count, backgroundColor: s.color }} />
        ))}
      </View>
      <View style={styles.legend}>
        {segments.map((s) => (
          <View key={s.key} accessible accessibilityLabel={`${s.label}: ${s.count} ${unit}`} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: s.color, borderColor: colors.border }]} />
            <AppText variant="small">
              {s.label} {s.count}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden', flexDirection: 'row' },
  meter: { gap: spacing.xs },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  label: { flex: 1 },
  value: { fontWeight: '700' },
  stack: { height: 14, borderRadius: 7, overflow: 'hidden', flexDirection: 'row', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
});
