import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';

/**
 * Freiwilliges Trinkgeld. Die Bezahlung läuft später als In-App-Kauf über den jeweiligen Store
 * (Google Play bzw. App Store) und ist bis zur Veröffentlichung dort noch nicht freigeschaltet.
 */
export default function TrinkgeldScreen() {
  return (
    <Screen>
      <AppText variant="title">Trinkgeld geben</AppText>
      <AppText>
        Politikometer ist kostenlos, ohne Werbung und ohne Tracking – und soll es bleiben. Wenn dir die App hilft, kannst
        du ihre Weiterentwicklung mit einem kleinen Trinkgeld unterstützen.
      </AppText>

      <Card>
        <AppText variant="heading">Wofür das Trinkgeld da ist</AppText>
        <AppText>
          Es deckt laufende Kosten (zum Beispiel die Gebühren der App-Stores) und die Arbeit an neuen Funktionen und an
          der Pflege der Daten.
        </AppText>
        <AppText variant="heading">Gut zu wissen</AppText>
        <AppText>
          Das Trinkgeld ist freiwillig. Alle Funktionen bleiben für alle gleich – mit oder ohne Trinkgeld. Es ist keine
          Spende im steuerlichen Sinn, eine Spendenquittung gibt es nicht.
        </AppText>
        <AppText>
          Die Bezahlung läuft über den App-Store deines Geräts. Politikometer erhält dabei keine Zahlungsdaten von dir.
        </AppText>
      </Card>

      <Button
        label="Trinkgeld geben – bald verfügbar"
        disabled
        hint="Die Bezahlung wird mit der Veröffentlichung im App-Store freigeschaltet"
        onPress={() => {}}
      />
      <AppText variant="small">
        Die Bezahlung wird freigeschaltet, sobald Politikometer im App-Store erschienen ist. Danke, dass du daran denkst!
      </AppText>
    </Screen>
  );
}
