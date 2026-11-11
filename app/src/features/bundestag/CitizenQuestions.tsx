import type { Politician } from '@/domain/model';
import { AW_MODERATION_CODEX_URL, AW_PRIVACY_URL } from '@/data/sources/abgeordnetenwatch/links';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { ExternalLink } from '@/ui/components/ExternalLink';
import { SourceNote } from '@/ui/components/SourceNote';
import { openLink } from '@/ui/open-link';

type Props = {
  politician: Politician;
  /** Seite „Fragen & Antworten“ bei abgeordnetenwatch.de. */
  questionsUrl: string | null | undefined;
  /** Nur bei laufendem Mandat kann eine Frage gestellt werden. */
  canAsk: boolean;
};

/**
 * Zahlen zu Bürgerfragen und der Weg zu abgeordnetenwatch.de.
 * Die Inhalte der Fragen liefert die offene Schnittstelle nicht – sie stehen nur auf der Website.
 */
export function CitizenQuestions({ politician, questionsUrl, canAsk }: Props) {
  const stats = politician.citizenQuestions;
  const askUrl = canAsk && questionsUrl ? questionsUrl : null;
  if (!stats && !askUrl) return null;

  return (
    <Card>
      <AppText variant="heading">Fragen von Bürgerinnen und Bürgern</AppText>
      {stats ? (
        <>
          <AppText>
            Auf abgeordnetenwatch.de wurden {stats.asked} Fragen gestellt, davon wurden{' '}
            {stats.answered} beantwortet.
          </AppText>
          <AppText variant="small">
            Gezählt werden nur Fragen aus dem aktuellen Mandat oder der aktuellen Kandidatur. Die
            Fragen und Antworten selbst liest du bei abgeordnetenwatch.de.
          </AppText>
        </>
      ) : null}
      <SourceNote
        source={{ ...politician.source, url: questionsUrl || politician.source.url }}
        linkLabel="Fragen und Antworten ansehen"
      />

      {askUrl ? (
        <>
          <Button
            label="Frage stellen bei abgeordnetenwatch.de"
            variant="secondary"
            hint="Öffnet das Profil bei abgeordnetenwatch.de im Browser. Dort steht oben „Frage stellen“."
            onPress={() => openLink(askUrl)}
          />
          <AppText variant="small">
            Die Frage stellst du bei abgeordnetenwatch.de, nicht in dieser App. Dort gelten die
            Regeln und der Datenschutz von abgeordnetenwatch.de. Dort gibst du deinen Vor- und
            Nachnamen, deinen Wohnort und deine E-Mail-Adresse an. Name und Wohnort erhält die oder
            der Abgeordnete zusammen mit der Frage. Fragen werden vorher geprüft und erscheinen dann
            öffentlich mit der Antwort, auf der Website derzeit mit Vorname und erstem Buchstaben des
            Nachnamens.
          </AppText>
          <ExternalLink small url={AW_PRIVACY_URL} label="Datenschutz bei abgeordnetenwatch.de" />
          <ExternalLink small url={AW_MODERATION_CODEX_URL} label="Regeln für Fragen (Moderations-Codex)" />
        </>
      ) : null}
    </Card>
  );
}
