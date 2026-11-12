import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { connectQueryToAppLifecycle } from '@/state/app-lifecycle';
import { persistOptions, queryClient } from '@/state/query-client';
import { HomeTitle } from '@/ui/components/HomeTitle';
import { StartScreen } from '@/ui/components/StartScreen';
import { useTheme } from '@/ui/theme';

// Stürzt eine Seite beim Anzeigen ab, zeigt expo-router diese Fehlerseite statt eines leeren Bildschirms.
export { AppErrorBoundary as ErrorBoundary } from '@/ui/components/AppErrorBoundary';

// Aktualisieren beim Zurückkehren in die App und nach Wiederherstellung der Verbindung.
connectQueryToAppLifecycle();

export default function RootLayout() {
  const theme = useTheme();
  const navTheme = theme.dark ? DarkTheme : DefaultTheme;
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}>
      <ThemeProvider
        value={{
          ...navTheme,
          colors: {
            ...navTheme.colors,
            primary: theme.colors.primary,
            background: theme.colors.background,
            card: theme.colors.surface,
            text: theme.colors.text,
            border: theme.colors.border,
          },
        }}>
        <StatusBar style={theme.dark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerBackButtonDisplayMode: 'minimal',
            headerTitleStyle: { fontWeight: '600' },
            // Flache Kopfzeile in der Hintergrundfarbe, ohne Trennlinie.
            headerStyle: { backgroundColor: theme.colors.background },
            headerShadowVisible: false,
            headerTintColor: theme.colors.primary,
            contentStyle: { backgroundColor: theme.colors.background },
          }}>
          <Stack.Screen name="index" options={{ title: 'Politikometer', headerTitle: () => <HomeTitle /> }} />
          <Stack.Screen name="abgeordnete/index" options={{ title: 'Alle Abgeordneten' }} />
          <Stack.Screen name="plz/[plz]" options={{ title: 'Wahlkreis wählen' }} />
          <Stack.Screen name="wahlkreis/[nr]" options={{ title: 'Bundestag' }} />
          <Stack.Screen name="politiker/[id]" options={{ title: 'Profil' }} />
          <Stack.Screen name="abstimmungen/[mandateId]" options={{ title: 'Abstimmungen' }} />
          <Stack.Screen name="abstimmung/[pollId]" options={{ title: 'Abstimmung' }} />
          <Stack.Screen name="rangliste/index" options={{ title: 'Rangliste' }} />
          <Stack.Screen name="rechtliches/bildnachweise" options={{ title: 'Bildnachweise' }} />
          <Stack.Screen name="regierung/index" options={{ title: 'Bundesregierung' }} />
          <Stack.Screen name="regierung/bundeskanzler" options={{ title: 'Bundeskanzler' }} />
          <Stack.Screen name="regierung/minister/[qid]" options={{ title: 'Mitglied der Bundesregierung' }} />
          <Stack.Screen name="kandidaten/[nr]" options={{ title: 'Kandidierende' }} />
          <Stack.Screen name="ueber" options={{ title: 'Über & Quellen' }} />
          <Stack.Screen name="trinkgeld" options={{ title: 'Trinkgeld' }} />
          <Stack.Screen name="rechtliches/datenschutz" options={{ title: 'Datenschutz' }} />
          <Stack.Screen name="rechtliches/impressum" options={{ title: 'Impressum' }} />
          <Stack.Screen name="rechtliches/lizenzen" options={{ title: 'Open-Source-Lizenzen' }} />
          <Stack.Screen name="favoriten/index" options={{ title: 'Merkliste' }} />
          <Stack.Screen name="gesetz/[id]" options={{ title: 'Gesetz verfolgen' }} />
          <Stack.Screen name="woche/index" options={{ title: 'Letzte Sitzungswoche' }} />
          <Stack.Screen name="erklaert/index" options={{ title: 'So funktioniert Politik' }} />
          <Stack.Screen name="erklaert/[thema]" options={{ title: 'Erklärung' }} />
        </Stack>
        <StartScreen />
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
