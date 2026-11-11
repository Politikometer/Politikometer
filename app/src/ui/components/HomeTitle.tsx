import { Image, StyleSheet, View } from 'react-native';

import { AppText } from '@/ui/components/AppText';
import { spacing, useTheme } from '@/ui/theme';

/** Kopfzeile der Startseite: App-Symbol neben dem Namen. Das Bild ist reine Zierde. */
export function HomeTitle() {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="Politikometer">
      <Image
        source={require('@/assets/images/favicon.png')}
        style={styles.icon}
        accessible={false}
        importantForAccessibility="no"
      />
      <AppText style={[styles.name, { color: colors.text }]}>Politikometer</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 30, height: 30, borderRadius: 7 },
  name: { fontSize: 19, fontWeight: '700', letterSpacing: -0.2 },
});
