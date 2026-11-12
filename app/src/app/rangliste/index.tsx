import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { getFigures } from '@/data/sources/local/figures';
import { fractionColor } from '@/domain/fractions';
import {
  formatMetric,
  METRIC_LABELS,
  metricFraction,
  MIN_PARTICIPATION,
  MIN_QUESTIONS,
  MIN_VOTES,
  rank,
  type RankedMember,
  type RankingMetric,
  WEIGHT_ANSWERS,
  WEIGHT_PARTICIPATION,
} from '@/domain/ranking';
import { FractionFilter } from '@/features/bundestag/FractionFilter';
import { AppPressable } from '@/ui/components/AppPressable';
import { AppText } from '@/ui/components/AppText';
import { Avatar } from '@/ui/components/Avatar';
import { Card } from '@/ui/components/Card';
import { Bar } from '@/ui/components/Meter';
import { SourceNote } from '@/ui/components/SourceNote';
import { cardShadow, MIN_TOUCH, radius, spacing, useTheme } from '@/ui/theme';

const METRICS: RankingMetric[] = ['score', 'participation', 'answers'];

const METRIC_HELP: Record<RankingMetric, string> = {
  score: `Note von 0 bis 10 aus Teilnahme an namentlichen Abstimmungen (${Math.round(WEIGHT_PARTICIPATION * 100)} %) und beantworteten Bürgerfragen (${Math.round(WEIGHT_ANSWERS * 100)} %).`,
  participation: `Anteil der namentlichen Abstimmungen, bei denen eine Stimme abgegeben wurde (Ja, Nein oder Enthaltung). Ab ${MIN_VOTES} Abstimmungen.`,
  answers: `Anteil der beantworteten Bürgerfragen auf abgeordnetenwatch.de. Ab ${MIN_QUESTIONS} Fragen.`,
};

export default function RankingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { colors } = theme;
  const figures = getFigures();
  const [metric, setMetric] = useState<RankingMetric>('score');
  const [fraction, setFraction] = useState<string | null>(null);

  const fractions = useMemo(
    () =>
      [...new Set(figures.members.map((m) => m.fraction).filter((f): f is string => !!f))].sort((a, b) =>
        a.localeCompare(b, 'de'),
      ),
    [figures],
  );
  // Der Platz gilt immer für den ganzen Bundestag; der Filter blendet nur aus.
  const ranked = useMemo(() => rank(figures.members, metric), [figures, metric]);
  const visible = useMemo(
    () => (fraction ? ranked.filter((r) => r.member.fraction === fraction) : ranked),
    [ranked, fraction],
  );

  const header = (
    <View style={styles.header}>
      <AppText variant="title">Rangliste</AppText>
      <AppText>
        Wer stimmt ab, wer antwortet? Die Rangliste zählt nur, ob Abgeordnete abstimmen und Fragen beantworten – nicht,
        wie sie abstimmen. Sie ist keine politische Bewertung.
      </AppText>

      <View style={styles.filter}>
        <AppText variant="small">Sortieren nach</AppText>
        <View accessibilityRole="radiogroup" style={styles.chips}>
          {METRICS.map((m) => {
            const active = m === metric;
            return (
              <AppPressable
                key={m}
                onPress={() => setMetric(m)}
                accessibilityRole="radio"
                accessibilityLabel={`Sortieren nach ${METRIC_LABELS[m]}`}
                accessibilityState={{ selected: active, checked: active }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.primarySoft,
                    borderColor: active ? colors.primary : colors.primarySoft,
                  },
                ]}>
                <AppText variant="small" style={{ color: active ? colors.onPrimary : colors.primary, fontWeight: '600' }}>
                  {METRIC_LABELS[m]}
                </AppText>
              </AppPressable>
            );
          })}
        </View>
        <AppText variant="small">{METRIC_HELP[metric]}</AppText>
      </View>

      <View style={styles.filter}>
        <AppText variant="small">Fraktion (alphabetisch)</AppText>
        <FractionFilter fractions={fractions} selected={fraction} onSelect={setFraction} />
      </View>

      <AppText variant="small" accessibilityLiveRegion="polite">
        {visible.length} Abgeordnete{fraction ? ` der Fraktion ${fraction}` : ''} · Plätze gelten für den ganzen
        Bundestag · gleiche Werte teilen sich einen Platz
      </AppText>
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      <Card>
        <AppText variant="heading">So wird gerechnet</AppText>
        <AppText>
          Teilnahme: abgegebene Stimmen geteilt durch alle namentlichen Abstimmungen während des Mandats ({figures.pollCount}{' '}
          in der Wahlperiode {figures.period.replace(/^Bundestag\s*/, '')}).
        </AppText>
        <AppText>Antworten: beantwortete geteilt durch gestellte Bürgerfragen auf abgeordnetenwatch.de.</AppText>
        <AppText>
          Gesamtnote: 10 × ({String(WEIGHT_PARTICIPATION).replace('.', ',')} × Teilnahme + {String(WEIGHT_ANSWERS).replace('.', ',')}{' '}
          × Antworten). Wer weniger als {MIN_QUESTIONS} Bürgerfragen erhalten hat, bekommt keine Gesamtnote.
        </AppText>
        <AppText>
          Untergrenze: Wer an weniger als {Math.round(MIN_PARTICIPATION * 100)} % der Abstimmungen teilgenommen hat, bekommt
          keine Note und keinen Platz bei Gesamtnote und Teilnahme. Die Quelle zeigt nicht, ob jemand krank war oder aus
          einem anderen Grund entschuldigt fehlte – niemand soll deshalb am Ende der Liste stehen.
        </AppText>
        <AppText variant="heading">Was die Zahlen nicht sagen</AppText>
        <AppText>
          Fehlen bei Abstimmungen kann gute Gründe haben: Krankheit, Mutterschutz, Elternzeit, Dienstreisen oder ein
          Regierungsamt. Die Quelle unterscheidet nicht zwischen entschuldigt und unentschuldigt.
        </AppText>
        <AppText>
          Namentliche Abstimmungen sind nur ein kleiner Teil der Parlamentsarbeit. Ausschüsse, Reden und Arbeit im
          Wahlkreis fließen nicht ein.
        </AppText>
        <AppText>
          Antworten auf abgeordnetenwatch.de sind freiwillig. Manche Abgeordnete beantworten Fragen lieber auf anderen
          Wegen.
        </AppText>
      </Card>
      <SourceNote source={figures.source} />
    </View>
  );

  const renderItem = ({ item }: { item: RankedMember }) => {
    const value = formatMetric(item.value, metric);
    const unit = metric === 'score' ? ' von 10' : '';
    return (
      <AppPressable
        onPress={() => router.push({ pathname: '/politiker/[id]', params: { id: String(item.member.id) } })}
        accessibilityRole="button"
        accessibilityLabel={`Platz ${item.rank}, ${item.member.name}, ${item.member.fraction ?? 'ohne Fraktion'}, ${METRIC_LABELS[metric]} ${value}${unit}`}
        accessibilityHint="Öffnet das Profil"
        focusRadius={radius.lg}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: pressed ? colors.primarySoft : colors.surface,
            borderColor: theme.dark ? colors.border : 'transparent',
          },
          cardShadow(theme),
        ]}>
        <AppText style={[styles.rank, { color: colors.textMuted }]}>{item.rank}.</AppText>
        <Avatar politicianId={item.member.id} name={item.member.name} fraction={item.member.fraction} size={44} />
        <View style={styles.rowText}>
          <AppText style={styles.name} numberOfLines={1}>
            {item.member.name}
          </AppText>
          <AppText variant="small" numberOfLines={1}>
            {item.member.fraction ?? 'ohne Fraktion'}
          </AppText>
          <Bar fraction={metricFraction(item.value, metric)} color={fractionColor(item.member.fraction, theme.dark)} height={6} />
        </View>
        <AppText style={[styles.value, { color: colors.primary }]}>{value}</AppText>
      </AppPressable>
    );
  };

  return (
    <FlatList
      data={visible}
      keyExtractor={(r) => String(r.member.id)}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      ItemSeparatorComponent={Separator}
      initialNumToRender={12}
      windowSize={7}
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    />
  );
}

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

const styles = StyleSheet.create({
  content: { padding: spacing.md },
  header: { gap: spacing.md, marginBottom: spacing.md },
  footer: { gap: spacing.md, marginTop: spacing.md },
  filter: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: 24,
    justifyContent: 'center',
  },
  row: {
    minHeight: MIN_TOUCH + 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  rank: { width: 36, textAlign: 'right', fontWeight: '600' },
  rowText: { flex: 1, gap: 3 },
  name: { fontWeight: '600' },
  value: { minWidth: 56, textAlign: 'right', fontWeight: '700', fontSize: 19 },
});
