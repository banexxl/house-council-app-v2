import type { PaletteColor } from '@mui/material/styles/createPalette';

import type { ColorPreset } from '.';
import { blue, green, indigo, purple, teal, red } from './colors';

export const getPrimary = (preset?: ColorPreset): PaletteColor => {
  switch (preset) {
    case 'blue':
      return blue;
    case 'green':
      return green;
    case 'indigo':
      return indigo;
    case 'purple':
      return purple;
    case 'teal':
      return teal;
    case 'red':
      return red;
    default:
      console.error(
        'Invalid color preset, accepted values: "blue", "green", "indigo", "teal", "red" or "purple"".'
      );
      return blue;
  }
};
