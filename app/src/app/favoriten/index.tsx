import { useRouter } from 'expo-router';
import { AccessibilityInfo, View } from 'react-native';

import { favoritesProblemText, useFavorites, type Favorite } from '@/state/favorites';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { FAVORITE_GROUPS, favoriteHref } from '@/ui/components/FavoriteButton';
import { ListButton } from '@/ui/components/ListButton';
import { Screen } from '@/ui/components/Screen';
import { Loading } from '@/ui/components/StatusViews';
import { formatDate } from '@/ui/format';
import { spacing } from '@/ui/theme';

function byTitle(a: Favorite, b: Favorite) {
  return a.title.localeCompare(b.title, 'de', { sensitivity: 'base' });
}

function Entry({ item, onRemove }: { item: Favorite; onRemove: () => void }) {
  const router = useRouter();
  const href = favoriteHref(item);
  const detail = `Gemerkt am ${formatDate(item.savedAt) ?? '–'}`;
  return (
    <View style={{ gap: spacing.xs }}>
      {href ? (
        <ListButton
          title={item.title}
          subtitle={item.subtitle}
          detail={detail}
          hint="Öffnet die Seite"
          onPress={() => router.push(href)}
        />
      ) : (
        <Card accessible accessibilityLabel={[item.title, item.subtitle, detail].filter(Boolean).join(', ')}>
          <AppText variant="heading">{item.title}</AppText>
          {item.subtitle ? <AppText variant="muted">{item.subtitle}</AppText> : null}
          <AppText variant="small">{detail}</AppText>
        </Card>
      )}
      <Button
        label="Entfernen"
        accessibilityLabel={`Entfernen: ${item.title}`}
        variant="secondary"
        hint={`Entfernt ${item.title} aus der Merkliste`}
        onPress={onRemove}
      />
    </View>
  );
}

export default function FavoritesScreen() {
  const { loaded, list, remove, problem, retry } = useFavorites();

  async function onRemove(item: Favorite) {
    await remove(item.type, item.id);
    AccessibilityInfo.announceForAccessibility(`${item.title} aus der Merkliste entfernt.`);
  }

  return (
    <Screen>
      <AppText variant="title">Merkliste</AppText>
      <AppText variant="muted">
        Wird nur auf diesem Gerät gespeichert. Es gibt kein Nutzerkonto, nichts wird übertragen.
        Beim Löschen der App ist die Liste weg.
      </AppText>

      {!loaded ? <Loading label="Merkliste wird geladen …" /> : null}

      {loaded && problem ? (
        <Card accessibilityRole="alert">
          <AppText variant="heading">Merkliste gesperrt</AppText>
          <AppText>{favoritesProblemText(problem)}</AppText>
          {problem === 'readError' ? (
            <Button label="Erneut versuchen" hint="Liest die Merkliste erneut" onPress={() => retry()} />
          ) : null}
        </Card>
      ) : null}

      {loaded && !problem && list.length === 0 ? (
        <Card>
          <AppText variant="heading">Noch nichts gemerkt</AppText>
          <AppText>
            Tippe auf der Seite einer Person oder eines Gesetzes auf „Merken“. Der Eintrag erscheint
            dann hier und auf der Startseite, damit du ihn schnell wiederfindest.
          </AppText>
        </Card>
      ) : null}

      {FAVORITE_GROUPS.map((group) => {
        const items = list.filter((f) => f.type === group.type).sort(byTitle);
        if (!items.length) return null;
        return (
          <View key={group.type} style={{ gap: spacing.sm }}>
            <AppText variant="heading">
              {group.label} ({items.length})
            </AppText>
            {items.map((item) => (
              <Entry key={`${item.type}:${item.id}`} item={item} onRemove={() => onRemove(item)} />
            ))}
          </View>
        );
      })}

      {list.length ? <AppText variant="small">Reihenfolge: alphabetisch.</AppText> : null}
    </Screen>
  );
}
