import { useRouter } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, Alert } from 'react-native';

import { PROVIDER, SOURCE_CODE_URL } from '@/config/provider';
import { DIP_PUBLISHER, DIP_TERMS_URL } from '@/data/sources/dip/config';
import { governmentSnapshot } from '@/data/sources/local/government-snapshot';
import { plzDataset } from '@/data/sources/local/plz-dataset';
import { clearAllLocalData } from '@/state/clear-local-data';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { ExternalLink } from '@/ui/components/ExternalLink';
import { ListButton } from '@/ui/components/ListButton';
import { Screen } from '@/ui/components/Screen';
import { formatDate } from '@/ui/format';
import { openReportMail } from '@/ui/report-error';

const ODBL_URL = 'https://opendatacommons.org/licenses/odbl/1-0/';
const DL_DE_BY_URL = 'https://www.govdata.de/dl-de/by-2-0';
const BWL_DOWNLOADS_URL = 'https://www.bundeswahlleiterin.de/bundestagswahlen/2025/wahlkreiseinteilung/downloads.html';

/** Wo die PLZ-Tabelle und ihr Erzeugungsskript erhältlich sind (ODbL 4.3, 4.6). */
function sourceCodeHint(): string {
  return SOURCE_CODE_URL
    ? `Die Tabelle (app/assets/data/plz-wahlkreis.json) und das Erzeugungsskript (tools/plz-wahlkreis/build.py) stehen im Quellcode: ${SOURCE_CODE_URL}`
    : 'Die Tabelle (app/assets/data/plz-wahlkreis.json) und das Erzeugungsskript (tools/plz-wahlkreis/build.py) sind Teil des Quellcodes. Der Quellcode wird mit der Veröffentlichung bereitgestellt.';
}

type ClearStatus = { kind: 'idle' } | { kind: 'busy' } | { kind: 'done'; text: string };

function ClearDataCard() {
  const [status, setStatus] = useState<ClearStatus>({ kind: 'idle' });

  async function run() {
    setStatus({ kind: 'busy' });
    const { failed } = await clearAllLocalData();
    const text =
      failed.length === 0
        ? 'Alle gespeicherten Daten wurden gelöscht.'
        : 'Nicht alles konnte gelöscht werden. Bitte versuche es erneut oder lösche die App-Daten in den Einstellungen deines Geräts.';
    setStatus({ kind: 'done', text });
    AccessibilityInfo.announceForAccessibility(text);
    Alert.alert(failed.length === 0 ? 'Gelöscht' : 'Nicht vollständig gelöscht', text);
  }

  function confirm() {
    Alert.alert(
      'Gespeicherte Daten löschen?',
      'Gelöscht werden die zuletzt gesuchte Postleitzahl, deine Merkliste und alle ' +
        'zwischengespeicherten Daten. Das lässt sich nicht rückgängig machen.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Löschen', style: 'destructive', onPress: () => void run() },
      ],
    );
  }

  return (
    <Card>
      <AppText variant="heading">Gespeicherte Daten löschen</AppText>
      <AppText>
        Löscht alles, was die App auf diesem Gerät gespeichert hat: die zuletzt gesuchte
        Postleitzahl, die Merkliste und den Zwischenspeicher für die Anzeige ohne Internet.
      </AppText>
      <Button
        label={status.kind === 'busy' ? 'Wird gelöscht …' : 'Gespeicherte Daten löschen'}
        variant="secondary"
        disabled={status.kind === 'busy'}
        hint="Fragt vorher nach. Danach sind PLZ, Merkliste und Zwischenspeicher gelöscht."
        onPress={confirm}
      />
      {status.kind === 'done' ? (
        <AppText accessibilityLiveRegion="polite" style={{ fontWeight: '600' }}>
          {status.text}
        </AppText>
      ) : null}
    </Card>
  );
}

export default function AboutScreen() {
  const router = useRouter();
  const meta = plzDataset.meta;
  return (
    <Screen>
      <AppText variant="title">Über Politikometer</AppText>
      <AppText>
        Politikometer zeigt, wer dich politisch vertritt und was diese Menschen im Mandat tun. Wir
        zeigen ausschließlich Angaben aus offiziellen und öffentlichen Quellen, jeweils mit Link
        zum Original und dem Zeitpunkt des Abrufs. Wir bewerten nicht und sind parteipolitisch
        neutral.
      </AppText>
      <AppText>
        Politikometer ist keine offizielle App des Deutschen Bundestages, des Bundesrates oder der
        Bundesregierung und steht keiner Partei nahe. Die App wird unabhängig von {PROVIDER.name}
        entwickelt.
      </AppText>

      <Card>
        <AppText variant="heading">Datenquellen</AppText>

        <AppText style={{ fontWeight: '600' }}>abgeordnetenwatch.de</AppText>
        <AppText>
          Abgeordnete, Mandate, Kandidaturen, namentliche Abstimmungen und Bürgerfragen. Lizenz CC0 1.0
          (frei nutzbar).
        </AppText>
        <ExternalLink small url="https://www.abgeordnetenwatch.de/api" label="abgeordnetenwatch.de – Datenschnittstelle" />

        <AppText style={{ fontWeight: '600' }}>{DIP_PUBLISHER}</AppText>
        <AppText>
          Gesetzgebungsvorgänge, Drucksachen, Plenarprotokolle sowie Reden und andere Aktivitäten aus
          dem Dokumentations- und Informationssystem für Parlamentsmaterialien von Bundestag und
          Bundesrat. Nutzung gemäß den DIP-Nutzungsbedingungen, unverändert und mit Quellenangabe.
        </AppText>
        <ExternalLink small url={DIP_TERMS_URL} label="DIP-Nutzungsbedingungen" />

        <AppText style={{ fontWeight: '600' }}>Wikidata</AppText>
        <AppText>
          Wer der Bundesregierung angehört (Kanzlerin oder Kanzler, Ministerinnen und Minister), seit
          wann und mit welcher Partei. Lizenz CC0 1.0. Diese Angaben sind als Datei in der App
          enthalten (Stand: {formatDate(governmentSnapshot.retrievedAt)}) und werden mit Updates der
          App aktualisiert; die App fragt Wikidata nicht selbst ab. Eine Ministerin oder einen Minister
          zeigen wir nur an, wenn die Parlamentsdokumentation DIP das Amt für dieselbe Person live
          bestätigt.
        </AppText>
        <ExternalLink small url="https://www.wikidata.org/wiki/Wikidata:Licensing" label="Wikidata – Lizenz" />

        <AppText style={{ fontWeight: '600' }}>Die Bundeswahlleiterin</AppText>
        <AppText>
          Wahlkreisgrenzen: {meta.quellen.wahlkreise}. Verändert: Die Grenzen wurden mit den
          Postleitzahlgebieten verschnitten.
        </AppText>
        <ExternalLink small url={DL_DE_BY_URL} label="Datenlizenz Deutschland – Namensnennung 2.0" />
        <ExternalLink small url={BWL_DOWNLOADS_URL} label="Die Bundeswahlleiterin – Wahlkreiseinteilung (Datensatz)" />

        <AppText style={{ fontWeight: '600' }}>OpenStreetMap</AppText>
        <AppText>Postleitzahlgebiete: © OpenStreetMap-Mitwirkende.</AppText>
        <ExternalLink small url="https://www.openstreetmap.org/copyright" label="OpenStreetMap – Urheberrecht und Lizenz" />
      </Card>

      <Card>
        <AppText variant="heading">Wie wir die Postleitzahl zuordnen</AppText>
        <AppText>
          Es gibt keine amtliche Zuordnung von Postleitzahlen zu Wahlkreisen. Wir legen deshalb die
          Postleitzahlgebiete aus OpenStreetMap über die amtlichen Wahlkreisgrenzen. Eine
          Postleitzahl gehört zu jedem Wahlkreis, der mindestens 1 % ihrer Fläche abdeckt. Liegt sie
          in mehreren Wahlkreisen, kannst du wählen. An Grenzen sind Fehler möglich – verbindlich
          ist der Wahlkreis auf deiner Wahlbenachrichtigung.
        </AppText>
        <AppText variant="small">
          Stand der Zuordnung: {formatDate(meta.erzeugt) ?? meta.erzeugt}. Die Zuordnungstabelle ist
          eine abgeleitete Datenbank und steht unter der Open Database License (ODbL) 1.0 – nicht unter
          der MIT-Lizenz des übrigen Codes. {sourceCodeHint()}
        </AppText>
        <ExternalLink small url={ODBL_URL} label="Open Database License (ODbL) 1.0 – Lizenztext" />
        {SOURCE_CODE_URL ? <ExternalLink small url={SOURCE_CODE_URL} label="Quellcode ansehen" /> : null}
      </Card>

      <Card>
        <AppText variant="heading">Datenschutz</AppText>
        <AppText>
          Kein Nutzerkonto, kein Tracking, keine Werbung; die App selbst sendet keine Absturzberichte. Deine Postleitzahl,
          deine Merkliste und zwischengespeicherte Daten bleiben auf deinem Gerät. Die App hat keinen
          eigenen Server: Beim Laden fragt sie direkt bei abgeordnetenwatch.de und beim Deutschen
          Bundestag (DIP) an. Dabei erhalten diese
          Stellen – wie bei jedem Webseitenaufruf – die IP-Adresse deines Geräts und die abgefragte
          Adresse (z. B. die Nummer deines Wahlkreises, nicht die Postleitzahl). Wir selbst erhalten
          keine Daten.
        </AppText>
        <ListButton
          title="Datenschutzerklärung"
          hint="Öffnet die Datenschutzerklärung"
          onPress={() => router.push('/rechtliches/datenschutz')}
        />
      </Card>

      <ClearDataCard />

      <Card>
        <AppText variant="heading">Rechtliches</AppText>
        <ListButton title="Impressum" subtitle={PROVIDER.name} hint="Öffnet das Impressum" onPress={() => router.push('/rechtliches/impressum')} />
        <ListButton
          title="Bildnachweise"
          subtitle="Urheber und Lizenzen der Porträts"
          hint="Öffnet die Liste der Bildnachweise"
          onPress={() => router.push('/rechtliches/bildnachweise')}
        />
        <ListButton
          title="Open-Source-Lizenzen"
          subtitle="Lizenzen der verwendeten Software"
          hint="Öffnet die Liste der Open-Source-Lizenzen"
          onPress={() => router.push('/rechtliches/lizenzen')}
        />
      </Card>

      <Card>
        <AppText variant="heading">Fehler melden</AppText>
        <AppText>
          Ist eine Angabe falsch, veraltet oder einer falschen Person zugeordnet? Schreib uns – wir
          prüfen die Darstellung in der App. Die Daten selbst berichtigt die jeweilige Quelle.
        </AppText>
        <Button
          label="Fehler melden"
          variant="secondary"
          hint="Öffnet dein E-Mail-Programm mit vorausgefülltem Betreff. Es wird nichts automatisch gesendet."
          onPress={() => void openReportMail({ page: 'allgemein' })}
        />
        <AppText variant="small">E-Mail: {PROVIDER.email}</AppText>
      </Card>

      <Card>
        <AppText variant="heading">Open Source</AppText>
        <AppText>
          Der Quellcode ist offen (MIT-Lizenz). Jede und jeder kann ihn prüfen.
          {SOURCE_CODE_URL ? '' : ' Er wird mit der Veröffentlichung der App bereitgestellt.'}
        </AppText>
        {SOURCE_CODE_URL ? <ExternalLink small url={SOURCE_CODE_URL} label="Quellcode ansehen" /> : null}
      </Card>
    </Screen>
  );
}
