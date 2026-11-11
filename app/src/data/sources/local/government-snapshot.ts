import type { GovernmentSnapshot } from '@/domain/government';

import { parseGovernmentSnapshot } from './government-snapshot-schema';

/**
 * Bundesregierung laut Wikidata, mit der App ausgeliefert (offline, sofort verfügbar).
 * Erzeugt mit `npm run regierung` (tools/regierung/build.mjs). Eigene Datei, damit Tests die
 * Auswertung auch ohne diese Datei prüfen können.
 */
export const governmentSnapshot: GovernmentSnapshot = parseGovernmentSnapshot(
  require('../../../../assets/data/regierung.json'),
);
