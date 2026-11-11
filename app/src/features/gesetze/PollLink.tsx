import { useRouter } from 'expo-router';

import type { PollSummary } from '@/domain/legislation';
import { describeAccepted } from '@/domain/votes';
import { ListButton } from '@/ui/components/ListButton';
import { formatDate } from '@/ui/format';

/** Eine namentliche Abstimmung als Zeile; öffnet das Ergebnis (Route abstimmung/[pollId]). */
export function PollLink({ poll }: { poll: PollSummary }) {
  const router = useRouter();
  const result = describeAccepted(poll.accepted);
  return (
    <ListButton
      title={poll.title}
      subtitle={[formatDate(poll.date), result].filter(Boolean).join(' · ') || null}
      hint="Öffnet das Ergebnis der Abstimmung"
      onPress={() => router.push({ pathname: '/abstimmung/[pollId]', params: { pollId: String(poll.id) } })}
    />
  );
}
