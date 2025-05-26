import type { PaletteColor } from '@mui/material/styles/createPalette';

import type { ColorPreset } from '.';
import { blue, green, indigo, purple, teal, red, orange } from './colors';

export const getPrimary = (preset?: ColorPreset): PaletteColor => {
  switch (preset) {
    case 'orange':
      return orange;
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
        'Invalid color preset, accepted values: "orange", "blue", "green", "indigo", "teal", "red" or "purple"".'
      );
      return orange;
  }
};
