import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { AccessibilityInfo, FlatList, StyleSheet, TextInput, View } from 'react-native';

import type { MemberListEntry } from '@/domain/model';
import { describeSeat } from '@/domain/representatives';
import { createSearch } from '@/domain/search';
import { FractionFilter } from '@/features/bundestag/FractionFilter';
import { useAllMembers } from '@/features/bundestag/hooks';
import { AppPressable } from '@/ui/components/AppPressable';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { ListButton } from '@/ui/components/ListButton';
import { RefreshButton } from '@/ui/components/Screen';
import { SourceNote } from '@/ui/components/SourceNote';
import { QueryStatus } from '@/ui/components/StatusViews';
import { usePullToRefresh } from '@/ui/pull-to-refresh';
import { fontSize, MIN_TOUCH, radius, spacing, useTheme } from '@/ui/theme';

const EMPTY: MemberListEntry[] = [];

/** Alle aktuellen Bundestagsabgeordneten mit Namenssuche. */
export default function AllMembersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const query = useAllMembers();
  const refresh = usePullToRefresh(query.refetch);
  const [search, setSearch] = useState('');
  const [fraction, setFraction] = useState<string | null>(null);

  const members = query.data?.members ?? EMPTY;
  const fractions = query.data?.fractions ?? [];
  const activeFraction = fraction && fractions.includes(fraction) ? fraction : null;

  const byFraction = useMemo(
    () => (activeFraction ? members.filter((m) => m.fraction === activeFraction) : members),
    [members, activeFraction],
  );
  const find = useMemo(() => createSearch(byFraction, (m) => m.fullName), [byFraction]);
  const visible = useMemo(() => find(search), [find, search]);

  const filtered = search.trim() !== '' || activeFraction !== null;
  const countText = filtered
    ? `${visible.length} von ${members.length} Abgeordneten`
    : `${members.length} Abgeordnete`;

  const header = (
    <View style={styles.header}>
      <AppText variant="title">Alle Bundestagsabgeordneten</AppText>
      <AppText variant="muted">
        {query.data ? `${query.data.term.label}. ` : ''}Alphabetisch nach Nachnamen. Tippe auf einen
        Namen, um das Profil zu öffnen.
      </AppText>

      <AppText style={{ fontWeight: '600' }} nativeID="name-search-label" importantForAccessibility="no">
        Nach Namen suchen
      </AppText>
      <View style={styles.searchRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Name eingeben, z. B. Müller"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Nach Namen suchen"
          accessibilityHint="Die Liste wird während der Eingabe gefiltert"
          autoCorrect={false}
          autoCapitalize="none"
          autoComplete="off"
          returnKeyType="search"
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.surface },
          ]}
        />
        {search ? (
          <AppPressable
            onPress={() => {
              setSearch('');
              AccessibilityInfo.announceForAccessibility('Suche gelöscht. Alle Abgeordneten werden angezeigt.');
            }}
            accessibilityRole="button"
            accessibilityLabel="Suche löschen"
            style={[styles.clear, { borderColor: colors.primary }]}>
            <AppText style={{ color: colors.primary, fontWeight: '600' }} importantForAccessibility="no">
              ✕
            </AppText>
          </AppPressable>
        ) : null}
      </View>

      {fractions.length > 1 ? (
        <View style={styles.filter}>
          <AppText variant="small">Fraktion (alphabetisch)</AppText>
          <FractionFilter fractions={fractions} selected={activeFraction} onSelect={setFraction} />
        </View>
      ) : null}

      <QueryStatus query={query} loadingLabel="Abgeordnete werden geladen …" />

      {query.data ? (
        <AppText variant="small" accessibilityLiveRegion="polite">
          {countText}
        </AppText>
      ) : null}
    </View>
  );

  const footer = query.data ? (
    <View style={styles.footer}>
      <SourceNote source={query.data.source} />
      <RefreshButton {...refresh} />
    </View>
  ) : null;

  return (
    <FlatList
      data={visible}
      keyExtractor={(m) => String(m.mandateId)}
      renderItem={({ item }) => (
        <ListButton
          title={item.fullName}
          subtitle={item.fraction}
          detail={describeSeat(item)}
          hint="Öffnet das Profil"
          onPress={() =>
            router.push({ pathname: '/politiker/[id]', params: { id: String(item.politicianId) } })
          }
        />
      )}
      ListHeaderComponent={header}
      ListFooterComponent={footer ?? undefined}
      ListEmptyComponent={
        query.data ? (
          <Card>
            <AppText>Niemand gefunden. Prüfe die Schreibweise oder wähle „Alle“ Fraktionen.</AppText>
          </Card>
        ) : undefined
      }
      ItemSeparatorComponent={Separator}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      initialNumToRender={15}
      windowSize={11}
    />
  );
}

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { gap: spacing.md, marginBottom: spacing.md },
  footer: { marginTop: spacing.md, gap: spacing.md },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: MIN_TOUCH + 8,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.body,
  },
  clear: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    borderWidth: 2,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filter: { gap: spacing.xs },
});
