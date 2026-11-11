import Constants from 'expo-constants';

import { buildPrivacyPolicy } from '@/content/recht';
import { LegalDocumentView } from '@/features/recht/LegalDocumentView';
import { Screen } from '@/ui/components/Screen';

const policy = buildPrivacyPolicy({ appVersion: Constants.expoConfig?.version ?? null });

export default function PrivacyScreen() {
  return (
    <Screen>
      <LegalDocumentView doc={policy} />
    </Screen>
  );
}
