'use client';

import { type FC, type ReactNode, useEffect, useState } from 'react';
import Head from 'next/head';
import { Provider as ReduxProvider } from 'react-redux';
import { NextAppDirEmotionCacheProvider } from 'tss-react/next/appDir';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { AuthProvider } from 'src/contexts/auth';
import 'src/locales/i18n';

import { RTL } from 'src/components/rtl';
import { SettingsButton } from 'src/components/settings/settings-button';
import { SettingsDrawer } from 'src/components/settings/settings-drawer';
import { Toaster } from 'src/components/toaster';
import { SettingsConsumer, SettingsProvider } from 'src/contexts/settings';
import { store } from 'src/store';
import { createTheme } from 'src/theme';
import { initialAppSettings, type Settings } from 'src/types/settings';

const SETTINGS_STORAGE_KEY = 'app.settings';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = (props: LayoutProps) => {
  const { children } = props;
  const [mounted, setMounted] = useState(false);
  const [initialSettings, setInitialSettings] = useState<Settings | undefined>(initialAppSettings);

  useEffect(() => {
    setMounted(true);
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        setInitialSettings(JSON.parse(storedSettings));
        return;
      }
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(initialAppSettings));
      setInitialSettings(initialAppSettings);
    } catch (error) {
      console.error('Failed to initialize settings storage', error);
      setInitialSettings(initialAppSettings);
    }
  }, []);

  const handleSettingsUpdate = (newSettings: Settings) => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
  };

  const handleSettingsReset = () => {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  };

  if (!mounted) {
    return null;
  }

  return (
    <NextAppDirEmotionCacheProvider options={{ key: 'css' }}>
      <ReduxProvider store={store}>
        <SettingsProvider
          onReset={handleSettingsReset}
          onUpdate={handleSettingsUpdate}
          settings={initialSettings}
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
                    <AuthProvider>
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
                    </AuthProvider>
                  </RTL>
                  <Toaster />
                </ThemeProvider>
              );
            }}
          </SettingsConsumer>
        </SettingsProvider>
      </ReduxProvider>
    </NextAppDirEmotionCacheProvider>
  );
};

