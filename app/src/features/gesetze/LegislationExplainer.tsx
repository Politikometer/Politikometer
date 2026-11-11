import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';

/** Neutrale Erklärung der üblichen Stationen eines Bundesgesetzes. */
export function LegislationExplainer() {
  return (
    <Card>
      <AppText variant="heading">Wie entsteht ein Gesetz?</AppText>
      <AppText>
        Einen Gesetzentwurf können die Bundesregierung, der Bundesrat oder Abgeordnete des
        Bundestages einbringen. Entwürfe der Bundesregierung gehen zuerst an den Bundesrat, der dazu
        Stellung nehmen kann („1. Durchgang“).
      </AppText>
      <AppText>
        Im Bundestag wird der Entwurf in der 1. Beratung vorgestellt und an Ausschüsse überwiesen.
        Ein Ausschuss legt danach eine Beschlussempfehlung vor. In der 2. und 3. Beratung stimmt der
        Bundestag ab.
      </AppText>
      <AppText>
        Danach befasst sich der Bundesrat erneut („2. Durchgang“). Je nach Gesetz muss er zustimmen
        oder kann Einspruch einlegen; auch der Vermittlungsausschuss kann angerufen werden. Zum
        Schluss wird das Gesetz ausgefertigt und im Bundesgesetzblatt verkündet.
      </AppText>
      <AppText variant="small">
        Nicht jeder Vorgang durchläuft alle Stationen. Die Bezeichnungen der Schritte stammen
        unverändert aus der Parlamentsdokumentation.
      </AppText>
    </Card>
  );
}
