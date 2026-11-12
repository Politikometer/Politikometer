import { View } from 'react-native';

import { photoCreditByQid } from '@/data/sources/local/photos';
import { AppText } from '@/ui/components/AppText';
import { Avatar } from '@/ui/components/Avatar';
import { ExternalLink } from '@/ui/components/ExternalLink';
import { spacing } from '@/ui/theme';

/** Porträt eines Regierungsmitglieds mit Bildnachweis. Ohne frei lizenziertes Foto: Initialen, kein Nachweis. */
export function Portrait({ qid, name, party }: { qid: string; name: string; party: string | null }) {
  const credit = photoCreditByQid(qid);
  return (
    <View style={{ gap: spacing.sm }}>
      <Avatar qid={qid} name={name} fraction={party} size={96} />
      {credit ? (
        <View>
          <AppText variant="small">
            Foto: {credit.author} · {credit.license} · verkleinert und zugeschnitten
          </AppText>
          <ExternalLink url={credit.page} label="Bildseite bei Wikimedia Commons" />
        </View>
      ) : null}
    </View>
  );
}
