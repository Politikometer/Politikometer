import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { ExplainLink } from '@/ui/components/ExplainLink';

/** Erklärt, warum nicht zu jedem Gesetz eine Einzelstimme vorliegt. */
export function VotingExplainer() {
  return (
    <Card>
      <AppText variant="heading">Wie Gesetze beschlossen werden</AppText>
      <AppText>
        Gesetze beschließt der Bundestag als Ganzes mit Mehrheit – nicht einzelne Abgeordnete. Wie
        jede und jeder Einzelne abgestimmt hat, wird nur bei namentlichen Abstimmungen festgehalten.
        Die meisten Beschlüsse fallen per Handzeichen, ohne dass einzelne Stimmen aufgezeichnet
        werden.
      </AppText>
      <AppText variant="small">
        „Nicht abgegeben“ heißt: Die Person hat an dieser Abstimmung nicht teilgenommen. Gründe
        dafür (zum Beispiel Krankheit, Mutterschutz oder parlamentarische Termine) werden meist nicht
        veröffentlicht.
      </AppText>
      <ExplainLink topic="abstimmung" small />
    </Card>
  );
}
