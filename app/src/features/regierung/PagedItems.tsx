import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { AmbiguousDataError } from '@/domain/government';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { ErrorMessage, Loading, OfflineMessage } from '@/ui/components/StatusViews';
import { spacing } from '@/ui/theme';

/** So viele Einträge zeigen wir auf einmal; „Mehr laden“ zeigt die nächsten. */
export const STEP = 15;

/** Fehler anzeigen; bei mehrdeutigen Quellen eine sachliche Erklärung statt „Netzwerkfehler“. */
export function SourceError({ error, onRetry, hasCachedData }: { error: unknown; onRetry?: () => void; hasCachedData?: boolean }) {
  if (error instanceof AmbiguousDataError) {
    return (
      <Card accessibilityRole="alert">
        <AppText style={{ fontWeight: '600' }}>Keine eindeutige Angabe</AppText>
        <AppText>{error.message} Wir zeigen deshalb hier nichts an, statt zu raten.</AppText>
        {onRetry ? <Button label="Erneut versuchen" variant="secondary" onPress={onRetry} /> : null}
      </Card>
    );
  }
  return <ErrorMessage error={error} onRetry={onRetry} hasCachedData={hasCachedData} />;
}

type Props<T> = {
  items: T[];
  total: number;
  isPending: boolean;
  /** Abfrage wartet auf Internet (TanStack fetchStatus „paused“). */
  isPaused?: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  renderItem: (item: T) => ReactNode;
  keyOf: (item: T) => string;
  loadingLabel: string;
  emptyText: string;
  /** Für Screenreader: wofür der Knopf „Mehr laden“ ist, z. B. „Aktivitäten“. */
  itemsLabel: string;
};

/**
 * Liste, die schrittweise wächst: zuerst aus bereits geladenen Daten,
 * dann über den cursor der Quelle (nächste Seite).
 */
export function PagedItems<T>(props: Props<T>) {
  const [visible, setVisible] = useState(STEP);
  const { items, total } = props;
  const shown = items.slice(0, visible);
  const canShowMoreLocally = items.length > visible;
  const canLoadMore = canShowMoreLocally || props.hasNextPage;

  const onMore = async () => {
    if (!canShowMoreLocally && props.hasNextPage) await props.fetchNextPage();
    setVisible((v) => v + STEP);
  };

  if (props.isPaused && items.length === 0) return <OfflineMessage />;
  if (props.isPending) return <Loading label={props.loadingLabel} />;

  return (
    <View style={{ gap: spacing.sm }}>
      {props.isError ? (
        <SourceError error={props.error} onRetry={props.refetch} hasCachedData={items.length > 0} />
      ) : null}
      {!props.isError && items.length === 0 ? (
        <Card>
          <AppText>{props.emptyText}</AppText>
        </Card>
      ) : null}
      {items.length > 0 ? (
        <AppText variant="small">
          {shown.length} von {total} angezeigt
        </AppText>
      ) : null}
      {shown.map((item) => (
        <View key={props.keyOf(item)}>{props.renderItem(item)}</View>
      ))}
      {canLoadMore ? (
        <Button
          label={props.isFetchingNextPage ? 'Wird geladen …' : 'Mehr laden'}
          variant="secondary"
          disabled={props.isFetchingNextPage}
          hint={`Zeigt weitere ${props.itemsLabel}`}
          onPress={onMore}
        />
      ) : null}
    </View>
  );
}
