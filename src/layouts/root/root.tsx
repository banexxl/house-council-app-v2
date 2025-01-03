'use client';

import { type FC, type ReactNode, useCallback } from 'react';
import Head from 'next/head';
import { Provider as ReduxProvider } from 'react-redux';
import { NextAppDirEmotionCacheProvider } from 'tss-react/next/appDir';
import Cookies from 'js-cookie';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import 'src/locales/i18n';

import { RTL } from 'src/components/rtl';
import { SettingsButton } from 'src/components/settings/settings-button';
import { SettingsDrawer } from 'src/components/settings/settings-drawer';
import { Toaster } from 'src/components/toaster';
import { SettingsConsumer, SettingsProvider } from 'src/contexts/settings';
import { store } from 'src/store';
import { createTheme } from 'src/theme';
import type { Settings } from 'src/types/settings';

const SETTINGS_STORAGE_KEY = 'app.settings';

const restoreSettings = (): Settings | undefined => {
  let value: string | undefined;
  if (typeof window !== 'undefined') {
    value = localStorage.getItem(SETTINGS_STORAGE_KEY!) || Cookies.get(SETTINGS_STORAGE_KEY!);
  }
  return value ? JSON.parse(value) as Settings : undefined;
};

const updateSettings = (settings: Settings): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }
};

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = (props: LayoutProps) => {
  const { children } = props;

  const handleSettingsUpdate = useCallback((newSettings: Settings) => {
    updateSettings(newSettings);
  }, []);

  const handleSettingsReset = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    }
  }, []);

  return (
    <NextAppDirEmotionCacheProvider options={{ key: 'css' }}>
      <ReduxProvider store={store}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <SettingsProvider
            onReset={handleSettingsReset}
            onUpdate={handleSettingsUpdate}
            settings={restoreSettings()}
          >
            <SettingsConsumer>
              {(settings) => {
                const theme = createTheme({
                  colorPreset: settings.colorPreset,
                  contrast: settings.contrast,
                  direction: settings.direction,
                  paletteMode: settings.paletteMode,
                  responsiveFontSizes: settings.responsiveFontSizes,
                });

                return (
                  <ThemeProvider theme={theme}>
                    <Head>
                      <meta
                        name="color-scheme"
                        content={settings.paletteMode}
                      />
                      <meta
                        name="theme-color"
                        content={theme.palette.neutral[900]}
                      />
                    </Head>
                    <RTL direction={settings.direction}>
                      <CssBaseline />
                      {children}
                      <SettingsButton onClick={settings.handleDrawerOpen} />
                      <SettingsDrawer
                        canReset={settings.isCustom}
                        onClose={settings.handleDrawerClose}
                        onReset={settings.handleReset}
                        onUpdate={settings.handleUpdate}
                        open={settings.openDrawer}
                        values={{
                          colorPreset: settings.colorPreset,
                          contrast: settings.contrast,
                          direction: settings.direction,
                          paletteMode: settings.paletteMode,
                          responsiveFontSizes: settings.responsiveFontSizes,
                          stretch: settings.stretch,
                          layout: settings.layout,
                          navColor: settings.navColor,
                        }}
                      />
                      <Toaster />
                    </RTL>
                  </ThemeProvider>
                );
              }}
            </SettingsConsumer>
          </SettingsProvider>
        </LocalizationProvider>
      </ReduxProvider>
    </NextAppDirEmotionCacheProvider>
  );
};

