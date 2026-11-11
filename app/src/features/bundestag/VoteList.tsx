import { useRouter } from 'expo-router';

import type { PollVote } from '@/domain/model';
import { describeAccepted, VOTE_LABELS } from '@/domain/votes';
import { ListButton } from '@/ui/components/ListButton';
import { formatDate } from '@/ui/format';

/**
 * Liste von Abstimmungen mit der Stimme einer Person.
 * An die Detailseite gehen nur Kennungen – Name und Stimme lädt sie selbst aus der Quelle.
 */
export function VoteList({ votes, mandateId }: { votes: PollVote[]; mandateId: number }) {
  const router = useRouter();
  return (
    <>
      {votes.map((v) => {
        const vote = `Stimme: ${VOTE_LABELS[v.choice]}${v.reasonNoShow ? ` (${v.reasonNoShow})` : ''}`;
        return (
          <ListButton
            key={v.poll.id}
            title={v.poll.title}
            subtitle={vote}
            detail={[formatDate(v.poll.date), describeAccepted(v.poll.accepted)].filter(Boolean).join(' · ')}
            hint="Öffnet Details und Gesamtergebnis der Abstimmung"
            onPress={() =>
              router.push({
                pathname: '/abstimmung/[pollId]',
                params: { pollId: String(v.poll.id), mandate: String(mandateId) },
              })
            }
          />
        );
      })}
    </>
  );
}
