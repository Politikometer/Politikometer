import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { getFigures } from '@/data/sources/local/figures';
import {
  answerRate,
  belowParticipationFloor,
  MIN_PARTICIPATION,
  formatMetric,
  MIN_QUESTIONS,
  participation,
  rank,
  score,
} from '@/domain/ranking';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Meter } from '@/ui/components/Meter';
import { SourceNote } from '@/ui/components/SourceNote';
import { spacing, useTheme } from '@/ui/theme';

/** Kennzahlen einer Person im Profil: Gesamtnote, Platz und die beiden Einzelwerte. */
export function FiguresCard({ politicianId }: { politicianId: number }) {
  const router = useRouter();
  const { colors } = useTheme();
  const figures = getFigures();
  const member = figures.byId.get(politicianId);
  if (!member) return null;

  const total = score(member);
  const p = participation(member);
  const a = answerRate(member);
  const belowFloor = belowParticipationFloor(member);
  const ranked = total === null ? null : rank(figures.members, 'score');
  const place = ranked?.find((r) => r.member.id === politicianId)?.rank ?? null;

  return (
    <Card>
      <AppText variant="heading">Kennzahlen</AppText>
      <View style={styles.top}>
        <View
          accessible
          accessibilityLabel={
            total === null
              ? 'Keine Gesamtnote'
              : `Gesamtnote ${formatMetric(total, 'score')} von 10${place ? `, Platz ${place} von ${ranked?.length}` : ''}`
          }
          style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
          <AppText style={[styles.badgeValue, { color: colors.primary }]}>{formatMetric(total, 'score')}</AppText>
          <AppText variant="small" style={{ color: colors.primary }}>
            von 10
          </AppText>
        </View>
        <View style={styles.topText}>
          <AppText style={styles.strong}>Gesamtnote</AppText>
          <AppText variant="small">
            {belowFloor
              ? `Keine Gesamtnote und kein Platz: Unter ${Math.round(MIN_PARTICIPATION * 100)} % Teilnahme vergeben wir keine Note. Die Quelle zeigt nicht, ob jemand krank war oder aus einem anderen Grund entschuldigt fehlte.`
              : total === null
              ? `Keine Gesamtnote: Dafür braucht es mindestens ${MIN_QUESTIONS} Bürgerfragen.`
              : `Platz ${place} von ${ranked?.length} Abgeordneten mit Note.`}
          </AppText>
        </View>
      </View>

      <Meter
        label="Teilnahme an namentlichen Abstimmungen"
        value={formatMetric(p, 'participation')}
        fraction={p ?? 0}
        detail={`${member.votesCast} von ${member.votesEligible} Abstimmungen`}
      />
      <Meter
        label="Beantwortete Bürgerfragen"
        value={formatMetric(a, 'answers')}
        fraction={a ?? 0}
        detail={
          a === null
            ? `${member.answered} von ${member.questions} Fragen – zu wenige für einen Anteil`
            : `${member.answered} von ${member.questions} Fragen`
        }
      />

      <AppText variant="small">
        Die Note misst nur, ob jemand abstimmt und antwortet – nicht, wie. Sie ist keine politische Bewertung. Fehlen
        kann gute Gründe haben, zum Beispiel Krankheit, Mutterschutz oder ein Regierungsamt.
      </AppText>
      <Button label="Zur Rangliste" variant="secondary" onPress={() => router.push('/rangliste')} />
      <SourceNote source={figures.source} />
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  topText: { flex: 1, gap: 2 },
  badge: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  badgeValue: { fontSize: 28, lineHeight: 32, fontWeight: '700' },
  strong: { fontWeight: '600' },
});
