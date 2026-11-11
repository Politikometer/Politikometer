import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { getConstituency } from '@/data/sources/local/plz-lookup';
import { plzDataset } from '@/data/sources/local/plz-dataset';
import { useCandidates, useRepresentatives } from '@/features/bundestag/hooks';
import { AppText } from '@/ui/components/AppText';
import { ListButton } from '@/ui/components/ListButton';
import { Screen } from '@/ui/components/Screen';
import { SourceNote } from '@/ui/components/SourceNote';
import { QueryStatus } from '@/ui/components/StatusViews';
import { spacing } from '@/ui/theme';

/** Alle, die im Wahlkreis bei der letzten Bundestagswahl kandidiert haben. */
export default function CandidatesScreen() {
  const router = useRouter();
  const { nr = '' } = useLocalSearchParams<{ nr?: string }>();
  const number = Number(nr);
  const constituency = getConstituency(number, plzDataset);
  const query = useCandidates(number);
  // Aus dem Zwischenspeicher, falls die Wahlkreis-Seite schon geladen war.
  const current = useRepresentatives(number);
  const inBundestag = new Set(current.data?.representatives.map((r) => r.politician.id) ?? []);
  const data = query.data;

  return (
    <Screen>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="small">
          Wahlkreis {constituency.number}
          {constituency.state ? ` · ${constituency.state}` : ''}
        </AppText>
        <AppText variant="title">{constituency.name}</AppText>
      </View>

      <QueryStatus query={query} />

      {data ? (
        <>
          <AppText variant="heading">Kandidierende: {data.electionLabel.replace(/^Bundestag\s*/, '')}</AppText>
          <AppText variant="muted">
            Alle {data.candidates.length} Personen, die hier mit der Erststimme gewählt werden konnten.
            Alphabetisch nach Nachnamen.
          </AppText>
          {data.candidates.map((c) => (
            <ListButton
              key={c.id}
              title={c.name}
              subtitle={c.party ?? 'ohne Partei'}
              detail={[
                c.electoralList && c.listPosition ? `${c.electoralList}, Platz ${c.listPosition}` : null,
                inBundestag.has(c.politicianId) ? 'Jetzt Mitglied des Bundestages' : null,
              ]
                .filter(Boolean)
                .join(' · ') || null}
              hint="Öffnet das Profil"
              onPress={() =>
                router.push({ pathname: '/politiker/[id]', params: { id: String(c.politicianId) } })
              }
            />
          ))}
          <AppText variant="small">
            Wahlergebnisse je Person sind in dieser Quelle nicht enthalten. Amtliche Ergebnisse
            veröffentlicht die Bundeswahlleiterin.
          </AppText>
          <SourceNote
            source={{
              publisher: 'abgeordnetenwatch.de',
              url: 'https://www.abgeordnetenwatch.de/bundestag/bundestag-wahl-2025',
              license: 'CC0 1.0',
              retrievedAt: data.retrievedAt,
            }}
          />
        </>
      ) : null}
    </Screen>
  );
}
