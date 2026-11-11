import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { lookupPlz } from '@/data/sources/local/plz-lookup';
import { plzDataset } from '@/data/sources/local/plz-dataset';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { ListButton } from '@/ui/components/ListButton';
import { Screen } from '@/ui/components/Screen';

export default function PlzScreen() {
  const router = useRouter();
  const { plz = '' } = useLocalSearchParams<{ plz?: string }>();
  const result = lookupPlz(plz, plzDataset);

  if (result.status === 'invalid') {
    return (
      <Screen>
        <Card accessibilityRole="alert">
          <AppText>
            {/* Nur Ziffern zurückzeigen – über einen Link könnte sonst beliebiger Text hier stehen. */}
            {/^\d{1,8}$/.test(plz) ? `„${plz}“ ist` : 'Das ist'} keine gültige Postleitzahl. Bitte geh
            zurück und gib eine fünfstellige Postleitzahl ein, zum Beispiel 10117.
          </AppText>
        </Card>
      </Screen>
    );
  }

  if (result.status === 'unknown') {
    return (
      <Screen>
        <Card accessibilityRole="alert">
          <AppText variant="heading">Postleitzahl nicht gefunden</AppText>
          <AppText>
            Für die PLZ {result.plz} haben wir keinen Wahlkreis gefunden. Manche Postleitzahlen
            gehören nur zu Postfächern oder Großkunden. Bitte versuche die PLZ deiner Wohnadresse.
          </AppText>
        </Card>
      </Screen>
    );
  }

  if (result.constituencies.length === 1) {
    return (
      <Redirect
        href={{ pathname: '/wahlkreis/[nr]', params: { nr: String(result.constituencies[0].number) } }}
      />
    );
  }

  return (
    <Screen>
      <AppText variant="title">PLZ {result.plz}</AppText>
      <AppText>
        Diese Postleitzahl liegt in {result.constituencies.length} Bundestagswahlkreisen. Welcher
        gilt für dich? Im Zweifel steht dein Wahlkreis auf deiner letzten Wahlbenachrichtigung.
      </AppText>
      {result.constituencies.map((c) => (
        <ListButton
          key={c.number}
          title={c.name}
          subtitle={`Wahlkreis ${c.number}${c.state ? ` · ${c.state}` : ''}`}
          hint="Zeigt die Abgeordneten dieses Wahlkreises"
          onPress={() =>
            router.push({ pathname: '/wahlkreis/[nr]', params: { nr: String(c.number) } })
          }
        />
      ))}
    </Screen>
  );
}
