/**
 * Ruhige, neutrale Farbwelt – bewusst ohne Parteifarben.
 * Alle Textfarben erreichen mindestens 7:1 Kontrast zum Hintergrund (WCAG AAA),
 * Hinweistexte mindestens 4,5:1. `inputBorder` (Rahmen von Eingabefeldern) erreicht mindestens 3:1
 * gegen background und surface (WCAG 1.4.11); `border` bleibt bewusst dezent (nur Kartenrahmen).
 */
import { useColorScheme } from 'react-native';

export type Theme = {
  dark: boolean;
  colors: {
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    primary: string;
    onPrimary: string;
    border: string;
    /** Rahmen von Eingabefeldern, ≥ 3:1 gegen background und surface. */
    inputBorder: string;
    focus: string;
    error: string;
    errorSurface: string;
  };
};

export const lightTheme: Theme = {
  dark: false,
  colors: {
    background: '#F4F6F9',
    surface: '#FFFFFF',
    text: '#161B26',
    textMuted: '#4A5363',
    primary: '#1B2E52',
    onPrimary: '#FFFFFF',
    border: '#C8D0DC',
    inputBorder: '#6B7588',
    focus: '#1B2E52',
    error: '#8E1B1B',
    errorSurface: '#FBECEC',
  },
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    background: '#0E1320',
    surface: '#18203A',
    text: '#EDF0F5',
    textMuted: '#B8C1D3',
    primary: '#A9C1EC',
    onPrimary: '#0E1320',
    border: '#34405E',
    inputBorder: '#7C89A8',
    focus: '#A9C1EC',
    error: '#F4B3B3',
    errorSurface: '#3A1F1F',
  },
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { md: 12 } as const;

/** Schriftgrößen in pt; skalieren mit der Systemeinstellung des Geräts. */
export const fontSize = { small: 15, body: 18, heading: 21, title: 28 } as const;

/** Mindesthöhe für Tippflächen (Material: 48 dp). */
export const MIN_TOUCH = 48;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}
