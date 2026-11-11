import { useRouter } from 'expo-router';
import { View } from 'react-native';

import type { ParliamentaryActivity, Proceeding } from '@/domain/government';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { ExternalLink } from '@/ui/components/ExternalLink';
import { InfoRow } from '@/ui/components/InfoRow';
import { formatDate } from '@/ui/format';
import { spacing } from '@/ui/theme';

/** Eine Aktivität im Parlament: amtliche Art, Datum, Thema, Fundstelle. */
export function ActivityItem({ activity }: { activity: ParliamentaryActivity }) {
  const date = formatDate(activity.date);
  const more =
    activity.moreTopicsCount > 0
      ? `und ${activity.moreTopicsCount} weitere${activity.moreTopicsCount === 1 ? 'r' : ''} Vorgang${activity.moreTopicsCount === 1 ? '' : 'e'}`
      : null;
  return (
    <Card>
      <View
        accessible
        accessibilityLabel={[activity.kind, date, activity.chamber, ...activity.topics, more]
          .filter(Boolean)
          .join(', ')}
        style={{ gap: spacing.xs }}>
        <AppText style={{ fontWeight: '600' }}>{activity.kind}</AppText>
        <AppText variant="small">{[date, activity.chamber].filter(Boolean).join(' · ')}</AppText>
        {activity.topics.map((t) => (
          <AppText key={t}>{t}</AppText>
        ))}
        {more ? <AppText variant="small">{more}</AppText> : null}
      </View>
      {activity.documentUrl ? (
        <ExternalLink
          small
          url={activity.documentUrl}
          label={`${activity.documentLabel ?? 'Dokument'} (PDF) öffnen`}
        />
      ) : activity.documentLabel ? (
        <AppText variant="small">{activity.documentLabel}</AppText>
      ) : null}
      <ExternalLink small url={activity.source.url} label="Eintrag im DIP ansehen" />
    </Card>
  );
}

/** Ein Gesetzgebungsvorgang mit amtlichem Beratungsstand. */
export function ProceedingItem({ proceeding }: { proceeding: Proceeding }) {
  const router = useRouter();
  return (
    <Card>
      <AppText style={{ fontWeight: '600' }}>{proceeding.title}</AppText>
      <InfoRow label="Beratungsstand" value={proceeding.status} />
      <InfoRow label="Datum laut DIP" value={formatDate(proceeding.date)} />
      <Button
        label="Ablauf des Gesetzes ansehen"
        variant="secondary"
        hint={`Öffnet die Seite zum Vorgang „${proceeding.title}“`}
        onPress={() => router.push({ pathname: '/gesetz/[id]', params: { id: proceeding.id } })}
      />
      <ExternalLink small url={proceeding.source.url} label="Vorgang im DIP ansehen" />
    </Card>
  );
}
