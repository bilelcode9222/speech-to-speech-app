/**
 * Système de couleurs.
 *
 * Direction : neutre et silencieux, dans l'esprit Notion / Apple.
 * Les gris font tout le travail. Une seule couleur d'accent, le rouge
 * d'enregistrement — la même convention que sur un dictaphone ou l'app
 * Dictaphone d'Apple, donc immédiatement lisible.
 *
 * Les deux langues ne sont plus distinguées par la couleur mais par la
 * hiérarchie : ce que tu as dit reste discret et petit, la traduction est
 * grande et pleinement contrastée. C'est elle qui compte.
 */

export type ThemeName = 'light' | 'dark';

export interface Palette {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;

  text: string;
  textSecondary: string;
  textMuted: string;

  accent: string;
  accentSoft: string;

  danger: string;
  overlay: string;
}

const light: Palette = {
  background: '#FFFFFF',
  surface: '#F7F7F5',
  surfaceRaised: '#FFFFFF',
  border: '#E9E9E7',
  borderStrong: '#DCDCD8',

  text: '#191918',
  textSecondary: '#5F5E5B',
  textMuted: '#908E8A',

  accent: '#C8392B',
  accentSoft: '#FBEDEB',

  danger: '#C8392B',
  overlay: 'rgba(20,20,19,0.28)',
};

const dark: Palette = {
  background: '#191919',
  surface: '#202020',
  surfaceRaised: '#252525',
  border: '#2F2F2F',
  borderStrong: '#3D3D3D',

  text: '#EDEDEC',
  textSecondary: '#B4B3AF',
  textMuted: '#82817D',

  accent: '#E8574A',
  accentSoft: '#2E1F1D',

  danger: '#E8574A',
  overlay: 'rgba(0,0,0,0.55)',
};

export const palettes: Record<ThemeName, Palette> = { light, dark };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

/**
 * Échelle typographique.
 * Peu de tailles, des écarts nets : c'est ce qui donne l'impression d'ordre.
 */
export const type = {
  eyebrow: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  translation: {
    fontSize: 20,
    fontWeight: '400' as const,
    lineHeight: 29,
    letterSpacing: -0.2,
  },
  title: {
    fontSize: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.4,
  },
} as const;
