'use client';

import type { ColorPreset, Contrast, Direction, PaletteMode } from 'src/theme';

export type Layout = 'horizontal' | 'vertical';

export type NavColor = 'blend-in' | 'discrete' | 'evident';

export const appLanguages = ['en', 'de', 'es', 'rs'] as const;

export type Language = (typeof appLanguages)[number];

export interface Settings {
  colorPreset?: ColorPreset;
  contrast?: Contrast;
  direction?: Direction;
  language?: Language;
  layout?: Layout;
  navColor?: NavColor;
  paletteMode?: PaletteMode;
  responsiveFontSizes?: boolean;
  stretch?: boolean;
}

export const initialAppSettings: Settings = {
  colorPreset: 'orange',
  contrast: 'normal',
  direction: 'ltr',
  language: 'en',
  layout: 'vertical',
  navColor: 'evident',
  paletteMode: 'light',
  responsiveFontSizes: true,
  stretch: false,
};
