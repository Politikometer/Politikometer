import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { isValidPlz, normalizePlz } from '@/data/sources/local/plz-lookup';
import { useFavorites } from '@/state/favorites';
import { useLastPlz } from '@/state/last-plz';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { favoriteHref } from '@/ui/components/FavoriteButton';
import { ListButton } from '@/ui/components/ListButton';
import { Screen } from '@/ui/components/Screen';
import { fontSize, MIN_TOUCH, radius, spacing, useTheme } from '@/ui/theme';

export default function StartScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lastPlz, save } = useLastPlz();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  function search(value: string) {
    const plz = normalizePlz(value);
    if (!isValidPlz(plz)) {
      setError('Bitte gib eine fünfstellige Postleitzahl ein, zum Beispiel 10117.');
      return;
    }
    setError(null);
    save(plz);
    router.push({ pathname: '/plz/[plz]', params: { plz } });
  }

  return (
    <Screen>
      <AppText variant="title">Wer vertritt dich?</AppText>
      <AppText>
        Gib deine Postleitzahl ein. Du siehst, wer deinen Wahlkreis im Bundestag vertritt – mit
        Angaben aus öffentlichen Quellen.
      </AppText>

      <Card>
        <AppText variant="heading" nativeID="plz-label">
          Postleitzahl
        </AppText>
        <TextInput
          value={input}
          onChangeText={(t) => {
            setInput(t.replace(/\D/g, '').slice(0, 5));
            if (error) setError(null);
          }}
          onSubmitEditing={() => search(input)}
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete="postal-code"
          textContentType="postalCode"
          returnKeyType="search"
          maxLength={5}
          placeholder="z. B. 10117"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Postleitzahl"
          accessibilityLabelledBy="plz-label"
          accessibilityHint="Fünfstellige Postleitzahl deines Wohnorts"
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: error ? colors.error : colors.inputBorder,
              backgroundColor: colors.background,
            },
          ]}
        />
        {error ? (
          <AppText style={{ color: colors.error }} accessibilityLiveRegion="polite" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}
        <Button label="Abgeordnete anzeigen" onPress={() => search(input)} />
      </Card>

      <Card>
        <AppText variant="heading">Alle Abgeordneten im Bundestag</AppText>
        <AppText>Du suchst eine bestimmte Person? Sieh dir die vollständige Liste an oder suche nach Namen.</AppText>
        <Button
          label="Alle Abgeordneten ansehen / nach Namen suchen"
          variant="secondary"
          hint="Öffnet die alphabetische Liste aller Bundestagsabgeordneten mit Suchfeld"
          onPress={() => router.push('/abgeordnete')}
        />
      </Card>

      <Card>
        <AppText variant="heading">Bundesregierung</AppText>
        <AppText>
          Kanzler und alle Ministerinnen und Minister: was sie im Bundestag sagen und welche
          Gesetzentwürfe ihre Ministerien einbringen – aus der amtlichen Parlamentsdokumentation.
        </AppText>
        <Button
          label="Bundesregierung ansehen"
          variant="secondary"
          hint="Öffnet die Übersicht aller Mitglieder der Bundesregierung"
          onPress={() => router.push('/regierung')}
        />
      </Card>

      <Card>
        <AppText variant="heading">Letzte Sitzungswoche</AppText>
        <AppText>Abstimmungen, Gesetze und Sitzungen der letzten Sitzungswoche – vollständig und nach Datum.</AppText>
        <Button
          label="Letzte Sitzungswoche ansehen"
          variant="secondary"
          hint="Öffnet die Übersicht der letzten Sitzungswoche"
          onPress={() => router.push('/woche')}
        />
      </Card>

      <Card>
        <AppText variant="heading">So funktioniert Politik</AppText>
        <AppText>Kurz und einfach erklärt: Bundestag, Gesetze, Wahlen, Regierung und Bundesrat.</AppText>
        <Button
          label="Erklärungen ansehen"
          variant="secondary"
          hint="Öffnet die Erklärseiten, auch ohne Internet verfügbar"
          onPress={() => router.push('/erklaert')}
        />
      </Card>

      <FavoritesSection />

      {lastPlz ? (
        <View style={styles.last}>
          <AppText variant="muted">Zuletzt gesucht:</AppText>
          <Button
            label={`PLZ ${lastPlz}`}
            variant="secondary"
            onPress={() => search(lastPlz)}
            hint="Zeigt die Abgeordneten für diese Postleitzahl"
          />
        </View>
      ) : null}

      <AppText variant="small">
        Deine Postleitzahl und deine Merkliste bleiben auf deinem Gerät. Die App hat kein Nutzerkonto und kein Tracking.
      </AppText>

      <Button label="Über die App & Quellen" variant="secondary" onPress={() => router.push('/ueber')} />
    </Screen>
  );
}

const HOME_FAVORITES = 5;

/** Zuletzt gemerkte Einträge – nur sichtbar, wenn es welche gibt. */
function FavoritesSection() {
  const router = useRouter();
  const { list } = useFavorites();
  if (!list.length) return null;
  return (
    <View style={styles.section}>
      <AppText variant="heading">Merkliste</AppText>
      {list.slice(0, HOME_FAVORITES).map((item) => {
        const href = favoriteHref(item);
        return (
          <ListButton
            key={`${item.type}:${item.id}`}
            title={item.title}
            subtitle={item.subtitle}
            hint={href ? 'Öffnet die Seite' : 'Öffnet die Merkliste'}
            onPress={() => router.push(href ?? '/favoriten')}
          />
        );
      })}
      <Button
        label={`Alle ansehen (${list.length})`}
        variant="secondary"
        hint="Öffnet deine Merkliste. Sie wird nur auf diesem Gerät gespeichert."
        onPress={() => router.push('/favoriten')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  input: {
    minHeight: MIN_TOUCH + 8,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.title,
    letterSpacing: 4,
  },
  last: { gap: spacing.sm },
});
