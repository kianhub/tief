import { Platform } from 'react-native';

// Font families — MVP uses system fonts; swap to custom fonts after expo-font loading
export const SERIF_FONT = Platform.select({ ios: 'Georgia', default: 'serif' });
export const SANS_FONT = Platform.select({ ios: 'System', default: 'sans-serif' });

export const colors = {
  light: {
    background: '#FAF8F5',
    surface: '#F3F0EB',
    textPrimary: '#2C2825',
    textSecondary: '#8A8580',
    textTertiary: '#B5B0AB',
    accent: '#C4785B',
    accentSecondary: '#5B7F6B',
    border: '#E8E4DF',
  },
  dark: {
    background: '#1C1A18',
    surface: '#262320',
    textPrimary: '#E8E4DF',
    textSecondary: '#8A8580',
    textTertiary: '#5C5854',
    accent: '#D4896B',
    accentSecondary: '#6B9F7B',
    border: '#333028',
  },
} as const;

export type ColorPalette = { readonly [K in keyof typeof colors.light]: string };

export const typography = {
  display: {
    fontFamily: SERIF_FONT,
    fontSize: 32,
    fontWeight: '400' as const,
    letterSpacing: -0.02 * 32,
    lineHeight: 32 * 1.2,
  },
  title: {
    fontFamily: SERIF_FONT,
    fontSize: 24,
    fontWeight: '400' as const,
    letterSpacing: -0.02 * 24,
    lineHeight: 24 * 1.3,
  },
  titleSmall: {
    fontFamily: SERIF_FONT,
    fontSize: 20,
    fontWeight: '400' as const,
    lineHeight: 20 * 1.3,
  },
  body: {
    fontFamily: SERIF_FONT,
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 17 * 1.6,
  },
  bodyLarge: {
    fontFamily: SERIF_FONT,
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 18 * 1.6,
  },
  ui: {
    fontFamily: SANS_FONT,
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 16 * 1.4,
  },
  uiSmall: {
    fontFamily: SANS_FONT,
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 14 * 1.4,
  },
  caption: {
    fontFamily: SANS_FONT,
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 12 * 1.4,
  },
  chat: {
    fontFamily: SANS_FONT,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 16 * 1.5,
  },
} as const;

export type TypographyVariant = keyof typeof typography;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  contentPadding: 24,
  cardPadding: 20,
  sectionSpacing: 48,
  cardSpacing: 16,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 9999,
} as const;

export const springs = {
  snappy: { damping: 20, stiffness: 300, mass: 0.8 },
  default: { damping: 15, stiffness: 150, mass: 1.0 },
  gentle: { damping: 20, stiffness: 80, mass: 1.2 },
  breathe: { damping: 10, stiffness: 30, mass: 1.5 },
} as const;

export const maxContentWidth = 640;
