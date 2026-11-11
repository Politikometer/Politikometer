import { buildImprint } from '@/content/recht';
import { LegalDocumentView } from '@/features/recht/LegalDocumentView';
import { ReportErrorLink } from '@/ui/components/ReportErrorLink';
import { Screen } from '@/ui/components/Screen';

const imprint = buildImprint();

export default function ImprintScreen() {
  return (
    <Screen>
      <LegalDocumentView doc={imprint} />
      <ReportErrorLink context={{ page: 'allgemein' }} label="Fehler melden oder Kontakt aufnehmen" />
    </Screen>
  );
}
