import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { isValidPlz, normalizePlz } from '@/data/sources/local/plz-lookup';
import { useFavorites } from '@/state/favorites';
import { useLastPlz } from '@/state/last-plz';
import { AppPressable } from '@/ui/components/AppPressable';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { favoriteHref } from '@/ui/components/FavoriteButton';
import { MenuGroup, MenuRow } from '@/ui/components/Menu';
import { Screen } from '@/ui/components/Screen';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/ui/theme';

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
      {/* Farbige Fläche mit der wichtigsten Aktion: Postleitzahl eingeben. */}
      <View style={[styles.hero, { backgroundColor: colors.hero, borderColor: colors.border }]}>
        <AppText variant="title" style={{ color: colors.onHero }}>
          Wer vertritt dich?
        </AppText>
        <AppText style={{ color: colors.onHeroMuted }}>
          Finde heraus, wer deinen Wahlkreis im Bundestag vertritt – mit Angaben aus öffentlichen Quellen.
        </AppText>

        <View style={styles.field}>
          <AppText variant="small" nativeID="plz-label" style={{ color: colors.onHeroMuted }}>
            Deine Postleitzahl
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
                backgroundColor: colors.surface,
              },
            ]}
          />
          {error ? (
            <View style={[styles.error, { backgroundColor: colors.errorSurface }]}>
              <AppText
                variant="small"
                style={{ color: colors.error }}
                accessibilityLiveRegion="polite"
                accessibilityRole="alert">
                {error}
              </AppText>
            </View>
          ) : null}
        </View>

        <Button label="Abgeordnete anzeigen" variant="onHero" onPress={() => search(input)} />

        {lastPlz ? (
          <AppPressable
            focusRadius={4}
            onPress={() => search(lastPlz)}
            accessibilityRole="button"
            accessibilityLabel={`Zuletzt gesucht: PLZ ${lastPlz}`}
            accessibilityHint="Zeigt die Abgeordneten für diese Postleitzahl"
            style={styles.last}>
            <AppText variant="small" style={{ color: colors.onHero, textDecorationLine: 'underline' }}>
              Zuletzt gesucht: PLZ {lastPlz}
            </AppText>
          </AppPressable>
        ) : null}
      </View>

      <View style={styles.section}>
        <AppText variant="heading" style={styles.sectionTitle}>
          Entdecken
        </AppText>
        <MenuGroup>
          <MenuRow
            title="Alle Abgeordneten"
            subtitle="Vollständige Liste mit Namenssuche"
            hint="Öffnet die alphabetische Liste aller Bundestagsabgeordneten mit Suchfeld"
            onPress={() => router.push('/abgeordnete')}
          />
          <MenuRow
            title="Bundesregierung"
            subtitle="Kanzler, Ministerinnen und Minister"
            hint="Öffnet die Übersicht aller Mitglieder der Bundesregierung"
            onPress={() => router.push('/regierung')}
          />
          <MenuRow
            title="Letzte Sitzungswoche"
            subtitle="Abstimmungen, Gesetze und Sitzungen"
            hint="Öffnet die Übersicht der letzten Sitzungswoche"
            onPress={() => router.push('/woche')}
          />
          <MenuRow
            title="So funktioniert Politik"
            subtitle="Kurz und einfach erklärt"
            hint="Öffnet die Erklärseiten, auch ohne Internet verfügbar"
            onPress={() => router.push('/erklaert')}
          />
        </MenuGroup>
      </View>

      <FavoritesSection />

      <View style={styles.section}>
        <AppText variant="heading" style={styles.sectionTitle}>
          Über Politikometer
        </AppText>
        <MenuGroup>
          <MenuRow
            title="Über die App & Quellen"
            subtitle="Woher die Daten stammen, Datenschutz, Impressum"
            onPress={() => router.push('/ueber')}
          />
        </MenuGroup>
      </View>

      {/* Bewusst am Ende: erst der Nutzen, dann die Bitte. */}
      <Card>
        <AppText variant="heading">Gefällt dir Politikometer?</AppText>
        <AppText>Ein kleines Trinkgeld hält die App kostenlos, werbefrei und unabhängig.</AppText>
        <Button
          label="Trinkgeld geben"
          variant="secondary"
          hint="Öffnet die Seite zum freiwilligen Trinkgeld"
          onPress={() => router.push('/trinkgeld')}
        />
      </Card>

      <AppText variant="small" style={styles.note}>
        Deine Postleitzahl und deine Merkliste bleiben auf deinem Gerät. Die App hat kein Nutzerkonto und kein Tracking.
      </AppText>
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
      <AppText variant="heading" style={styles.sectionTitle}>
        Merkliste
      </AppText>
      <MenuGroup>
        {list.slice(0, HOME_FAVORITES).map((item) => {
          const href = favoriteHref(item);
          return (
            <MenuRow
              key={`${item.type}:${item.id}`}
              title={item.title}
              subtitle={item.subtitle ?? undefined}
              hint={href ? 'Öffnet die Seite' : 'Öffnet die Merkliste'}
              onPress={() => router.push(href ?? '/favoriten')}
            />
          );
        })}
        <MenuRow
          title={`Alle ansehen (${list.length})`}
          hint="Öffnet deine Merkliste. Sie wird nur auf diesem Gerät gespeichert."
          onPress={() => router.push('/favoriten')}
        />
      </MenuGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  field: { gap: spacing.xs },
  input: {
    minHeight: MIN_TOUCH + 8,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 22,
    letterSpacing: 2,
  },
  error: { borderRadius: 8, padding: spacing.sm },
  last: { minHeight: MIN_TOUCH, justifyContent: 'center', alignSelf: 'flex-start' },
  section: { gap: spacing.sm },
  sectionTitle: { paddingHorizontal: spacing.xs },
  note: { paddingHorizontal: spacing.xs },
});
