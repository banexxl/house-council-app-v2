"use client";

import { CssBaseline, ThemeProvider, useTheme } from '@mui/material';
import type { ReactNode } from 'react';

export const dynamic = 'force-static'; // optional: make it explicitly static

export default function RootAppLayout({ children }: { children: ReactNode }) {

  const theme = useTheme();

  return (
    <html lang="en">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
