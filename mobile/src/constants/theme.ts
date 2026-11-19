/**
 * Colores, tipografías y medidas de la app. Hay un juego de colores para el modo
 * claro y otro para el oscuro; `useTheme()` devuelve el que corresponde.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1F1A17',
    textSecondary: '#6B625B',
    background: '#FAF7F2',
    backgroundElement: '#F0EBE3',
    backgroundSelected: '#E3DBCF',
    border: '#DDD4C7',
    tint: '#7A2E2E',
    onTint: '#FFFFFF',
    success: '#2F6B4F',
    warning: '#9A6A12',
    danger: '#A3312B',
    highlight: '#F6DE8D',
  },
  dark: {
    text: '#F2EDE6',
    textSecondary: '#ADA39A',
    background: '#151210',
    backgroundElement: '#221E1B',
    backgroundSelected: '#332D28',
    border: '#3A332D',
    tint: '#E3A589',
    onTint: '#1F1A17',
    success: '#7CC4A0',
    warning: '#E0B45C',
    danger: '#F08A80',
    highlight: '#6B5718',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = { small: 8, medium: 12, large: 20 } as const;

/** Ancho máximo del contenido en pantallas grandes (tabletas y web). */
export const MaxContentWidth = 960;
/** Ancho máximo de la columna de lectura, para que las líneas no queden muy largas. */
export const MaxReadingWidth = 680;
