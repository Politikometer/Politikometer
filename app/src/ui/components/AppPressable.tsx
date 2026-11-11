import { useState } from 'react';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { radius as themeRadius, useTheme } from '@/ui/theme';

/** Breite des Fokusrahmens (WCAG 2.4.7) und Abstand zum Element in dp. */
export const FOCUS_RING_WIDTH = 3;
export const FOCUS_RING_GAP = 2;
const OUTSET = FOCUS_RING_WIDTH + FOCUS_RING_GAP;

type Props = PressableProps & {
  /** Eckenradius des Elements; der Fokusrahmen folgt ihm mit Abstand. Standard: radius.md. */
  focusRadius?: number;
};

/**
 * Pressable mit sichtbarem Fokusrahmen bei Tastatur-/D-Pad-Fokus (onFocus/onBlur).
 *
 * Der Rahmen liegt als absolut positionierte Ebene außerhalb des Elements – kein Layoutsprung,
 * und er bleibt auch auf gefüllten Flächen (z. B. primärer Knopf) sichtbar, weil zwischen Element
 * und Rahmen ein Spalt in Hintergrundfarbe bleibt. Für Screenreader unsichtbar.
 */
export function AppPressable({ children, focusRadius = themeRadius.md, onFocus, onBlur, ...rest }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      {...rest}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}>
      {(state) => (
        <>
          {typeof children === 'function' ? children(state) : children}
          <View
            testID="focus-ring"
            pointerEvents="none"
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={[
              styles.ring,
              {
                borderColor: focused ? colors.focus : 'transparent',
                borderRadius: focusRadius + OUTSET,
              },
            ]}
          />
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    top: -OUTSET,
    left: -OUTSET,
    right: -OUTSET,
    bottom: -OUTSET,
    borderWidth: FOCUS_RING_WIDTH,
  },
});
