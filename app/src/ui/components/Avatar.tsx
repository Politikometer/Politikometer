import { Image, StyleSheet, View } from 'react-native';

import { photoSource, photoSourceByQid } from '@/data/sources/local/photos';
import { fractionColor } from '@/domain/fractions';
import { AppText } from '@/ui/components/AppText';
import { useTheme } from '@/ui/theme';

type Props = {
  politicianId?: number | null;
  /** Wikidata-Kennung – für Mitglieder der Bundesregierung, die wir nicht über abgeordnetenwatch kennen. */
  qid?: string | null;
  name: string;
  /** Fraktion für den Farbring; ohne Angabe gibt es keinen Ring. */
  fraction?: string | null;
  size?: number;
};

/**
 * Rundes Porträt mit Ring in der Fraktionsfarbe. Ohne frei lizenziertes Foto: Initialen.
 * Reine Zierde – Name und Fraktion stehen immer als Text daneben, daher für Screenreader versteckt.
 */
export function Avatar({ politicianId, qid, name, fraction, size = 48 }: Props) {
  const { colors, dark } = useTheme();
  const source = politicianId ? photoSource(politicianId) : qid ? photoSourceByQid(qid) : null;
  const ring = fraction === undefined ? 0 : Math.max(2, Math.round(size / 20));
  const inner = size - ring * 2 - (ring ? 2 : 0);
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[
        styles.outer,
        { width: size, height: size, borderRadius: size / 2, borderWidth: ring, borderColor: fractionColor(fraction, dark) },
      ]}>
      {source ? (
        <Image
          source={source}
          resizeMode="cover"
          style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: colors.primarySoft }}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: inner, height: inner, borderRadius: inner / 2, backgroundColor: colors.primarySoft },
          ]}>
          <AppText style={{ color: colors.primary, fontWeight: '600', fontSize: Math.round(inner * 0.36) }}>
            {initials(name)}
          </AppText>
        </View>
      )}
    </View>
  );
}

export function initials(name: string): string {
  const parts = name
    .replace(/\b(Dr|Prof|h\.\s?c)\.?\s/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

const styles = StyleSheet.create({
  outer: { alignItems: 'center', justifyContent: 'center' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
