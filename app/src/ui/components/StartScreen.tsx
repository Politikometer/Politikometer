import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Image, StyleSheet } from 'react-native';

import { AppText } from '@/ui/components/AppText';
import { spacing } from '@/ui/theme';

/** So lange bleibt der Startbildschirm stehen (Wunsch des Anbieters: 2 Sekunden). */
export const START_SCREEN_MS = 2000;
const FADE_MS = 250;
// Dieselbe Farbe wie der Startbildschirm des Betriebssystems (app.json) – der Übergang ist nahtlos.
const BACKGROUND = '#1B2E52';

/**
 * Logo mit Namen beim Öffnen der App. Liegt über der Startseite und blendet sich danach aus.
 * Die Seite darunter lädt währenddessen schon; für Screenreader ist sie erst danach erreichbar.
 */
export function StartScreen() {
  const [visible, setVisible] = useState(true);
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    let reduceMotion = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        reduceMotion = on;
      })
      .catch(() => {});
    const timer = setTimeout(() => {
      if (reduceMotion) {
        setVisible(false);
        return;
      }
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() =>
        setVisible(false),
      );
    }, START_SCREEN_MS);
    return () => clearTimeout(timer);
  }, [opacity]);

  if (!visible) return null;
  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Politikometer"
      accessibilityViewIsModal
      style={[StyleSheet.absoluteFill, styles.root, { opacity }]}>
      <Image source={require('../../../assets/images/splash-icon.png')} style={styles.logo} resizeMode="contain" />
      <AppText style={styles.name}>Politikometer</AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: BACKGROUND, alignItems: 'center', justifyContent: 'center', gap: spacing.md, zIndex: 10 },
  logo: { width: 220, height: 220 },
  name: { color: '#FFFFFF', fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.3 },
});
