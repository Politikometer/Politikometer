import { isSnapshotStale } from '@/data/sources/local/government-snapshot-schema';
import { AppText } from '@/ui/components/AppText';
import { formatDate } from '@/ui/format';

/**
 * Dezenter Hinweis, wenn der mitgelieferte Stand der Bundesregierung älter als 60 Tage ist
 * (z. B. weil die App länger nicht aktualisiert wurde). Sonst nichts.
 */
export function StaleSnapshotHint({ retrievedAt, now = new Date() }: { retrievedAt: string; now?: Date }) {
  if (!isSnapshotStale({ retrievedAt }, now)) return null;
  const stand = formatDate(retrievedAt);
  return (
    <AppText variant="small">
      Stand möglicherweise veraltet: Die Zusammensetzung der Bundesregierung ist vom {stand}. Sie wird
      mit Updates der App aktualisiert.
    </AppText>
  );
}

/** Erklärung in der Regierungsübersicht: Woher die Zusammensetzung kommt und was live geprüft wird. */
export function SnapshotUpdateNote({ retrievedAt }: { retrievedAt: string }) {
  const stand = formatDate(retrievedAt);
  return (
    <AppText variant="small">
      Stand der Zusammensetzung: {stand}. Sie wird mit Updates der App aktualisiert. Die Gegenprüfung in der
      Parlamentsdokumentation DIP erfolgt dagegen live über das Internet und wird täglich wiederholt.
    </AppText>
  );
}
