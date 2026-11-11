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
    /** Zart getönte Fläche (sekundäre Knöpfe, gedrückte Zeilen); `primary` darauf ≥ 7:1. */
    primarySoft: string;
    /** Farbige Fläche oben auf der Startseite mit Text, gedämpftem Text und Knopf darauf. */
    hero: string;
    onHero: string;
    onHeroMuted: string;
    heroAction: string;
    onHeroAction: string;
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
    primarySoft: '#E4EAF4',
    hero: '#1B2E52',
    onHero: '#FFFFFF',
    onHeroMuted: '#D5DDEA',
    heroAction: '#FFFFFF',
    onHeroAction: '#1B2E52',
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
    primarySoft: '#243154',
    hero: '#18203A',
    onHero: '#EDF0F5',
    onHeroMuted: '#B8C1D3',
    heroAction: '#A9C1EC',
    onHeroAction: '#0E1320',
    border: '#34405E',
    inputBorder: '#7C89A8',
    focus: '#A9C1EC',
    error: '#F4B3B3',
    errorSurface: '#3A1F1F',
  },
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { md: 14, lg: 18 } as const;

/** Weicher Schatten für Flächen im hellen Design; im dunklen Design trägt ein feiner Rahmen. */
export function cardShadow(theme: Theme): { boxShadow?: string } {
  return theme.dark ? {} : { boxShadow: '0 1px 2px rgba(22, 27, 38, 0.05), 0 4px 12px rgba(22, 27, 38, 0.06)' };
}

/** Schriftgrößen in pt; skalieren mit der Systemeinstellung des Geräts. */
export const fontSize = { small: 15, body: 18, heading: 20, title: 28 } as const;

/** Mindesthöhe für Tippflächen (Material: 48 dp). */
export const MIN_TOUCH = 48;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}
