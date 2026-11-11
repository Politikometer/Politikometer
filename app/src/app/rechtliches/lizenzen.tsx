/**
 * Open-Source-Lizenzen aller ausgelieferten Bestandteile.
 * Bewusst ohne RefreshControl (auf Android unter RN 0.88 unsichtbarer Inhalt, siehe Screen.tsx).
 */
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';

import {
  filterPackages,
  licenseData,
  spdxUrl,
  type NativeComponent,
  type OssPackage,
} from '@/data/sources/local/licenses';
import { AppPressable } from '@/ui/components/AppPressable';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { ExternalLink } from '@/ui/components/ExternalLink';
import { formatDate } from '@/ui/format';
import { fontSize, MIN_TOUCH, radius, spacing, useTheme } from '@/ui/theme';

const APACHE = 'apache-2.0';

/** Lizenztext ein- und ausklappen. */
function LicenseText({ textId, label }: { textId: string; label: string }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const text = licenseData.texts[textId];
  if (!text) return null;
  const action = open ? `${label} ausblenden` : `${label} anzeigen`;
  return (
    <View style={{ gap: spacing.xs }}>
      <AppPressable
        focusRadius={4}
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={action}
        accessibilityState={{ expanded: open }}
        style={{ minHeight: MIN_TOUCH, justifyContent: 'center' }}>
        <AppText variant="small" style={{ color: colors.primary, textDecorationLine: 'underline' }}>
          {action}
        </AppText>
      </AppPressable>
      {open ? <AppText variant="small">{text}</AppText> : null}
    </View>
  );
}

function PackageItem({ pkg }: { pkg: OssPackage }) {
  const spdx = pkg.text ? null : spdxUrl(pkg.license);
  return (
    <Card>
      <AppText style={{ fontWeight: '700' }}>
        {pkg.name} {pkg.version}
      </AppText>
      <AppText variant="small">
        Lizenz: {pkg.license}
        {pkg.native ? ' · enthält nativen Code' : ''}
      </AppText>
      {pkg.copyright.map((c) => (
        <AppText key={c} variant="small">
          {c}
        </AppText>
      ))}
      {pkg.text ? <LicenseText textId={pkg.text} label="Lizenztext" /> : null}
      {pkg.standardText ? (
        <AppText variant="small">
          Das Paket enthält keine eigene Lizenzdatei; angezeigt ist der Standardwortlaut der Lizenz.
        </AppText>
      ) : null}
      {pkg.license.includes('Apache-2.0') ? <LicenseText textId={APACHE} label="Apache-Lizenz 2.0" /> : null}
      {spdx ? <ExternalLink small url={spdx} label={`Lizenztext ${pkg.license}`} /> : null}
      {pkg.url ? <ExternalLink small url={pkg.url} label={`Projektseite von ${pkg.name}`} /> : null}
    </Card>
  );
}

function NativeItem({ c }: { c: NativeComponent }) {
  const spdx = spdxUrl(c.license);
  return (
    <View style={{ gap: 2 }}>
      <AppText style={{ fontWeight: '600' }}>{c.name}</AppText>
      <AppText variant="small">
        Lizenz: {c.license} · © {c.holder}
      </AppText>
      {c.text ? (
        <LicenseText textId={c.text} label="Lizenztext" />
      ) : spdx ? (
        <ExternalLink small url={spdx} label={`Lizenztext ${c.license}`} />
      ) : null}
    </View>
  );
}

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

export default function LicensesScreen() {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const visible = useMemo(() => filterPackages(licenseData.packages, search), [search]);
  const total = licenseData.packages.length;
  const generated = formatDate(licenseData.generatedAt) ?? licenseData.generatedAt;

  // Als Element (nicht als Komponente), damit das Suchfeld beim Tippen den Fokus behält.
  const header = (
    <View style={styles.header}>
      <AppText variant="title">Open-Source-Lizenzen</AppText>
      <AppText>
        Politikometer ist mit freier Software gebaut. Hier stehen alle Bestandteile, die in der App
        enthalten sind, mit Lizenz und Urheberangabe ({total} Pakete, Stand {generated}). Der eigene
        Code der App steht unter der MIT-Lizenz.
      </AppText>
      <Card>
        <AppText variant="heading">Native Bestandteile</AppText>
        <AppText variant="small">
          React Native und Expo bringen beim Bau der App zusätzlich native Bibliotheken für Android
          und iOS mit, unter anderem:
        </AppText>
        {licenseData.nativeComponents.map((c) => (
          <NativeItem key={c.name} c={c} />
        ))}
      </Card>
      <AppText style={{ fontWeight: '600' }} importantForAccessibility="no">
        Pakete durchsuchen
      </AppText>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Paket oder Lizenz suchen, z. B. expo"
        placeholderTextColor={colors.textMuted}
        accessibilityLabel="Pakete durchsuchen"
        accessibilityHint="Die Liste wird während der Eingabe gefiltert"
        autoCorrect={false}
        autoCapitalize="none"
        autoComplete="off"
        returnKeyType="search"
        style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.surface }]}
      />
      <AppText variant="small" accessibilityLiveRegion="polite">
        {visible.length === total ? `${total} Pakete` : `${visible.length} von ${total} Paketen`}
      </AppText>
    </View>
  );

  return (
    <FlatList
      data={visible}
      keyExtractor={(p) => `${p.name}@${p.version}`}
      renderItem={({ item }) => <PackageItem pkg={item} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <Card>
          <AppText>Kein Paket gefunden.</AppText>
        </Card>
      }
      ItemSeparatorComponent={Separator}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      initialNumToRender={12}
      windowSize={11}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { gap: spacing.md, marginBottom: spacing.md },
  input: {
    minHeight: MIN_TOUCH + 8,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.body,
  },
});
