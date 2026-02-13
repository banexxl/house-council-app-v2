'use client';

import { type FC, type ReactNode, useEffect, useState } from 'react';
import Head from 'next/head';
import { Provider as ReduxProvider } from 'react-redux';
import { NextAppDirEmotionCacheProvider } from 'tss-react/next/appDir';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { AuthProvider } from 'src/contexts/auth';
import i18n from 'src/locales/i18n';

import { RTL } from 'src/components/rtl';
import { SettingsButton } from 'src/components/settings/settings-button';
import { SettingsDrawer } from 'src/components/settings/settings-drawer';
import { Toaster } from 'src/components/toaster';
import { SettingsConsumer, SettingsProvider } from 'src/contexts/settings';
import { store } from 'src/store';
import { createTheme } from 'src/theme';
import { appLanguages, initialAppSettings, type Language, type Settings } from 'src/types/settings';

const SETTINGS_STORAGE_KEY = 'app.settings';
const DEFAULT_LANGUAGE: Language = initialAppSettings.language ?? 'rs';

const isLanguage = (value: unknown): value is Language => {
  return typeof value === 'string' && appLanguages.some((language) => language === value);
};

const resolveLanguage = (value: unknown): Language => {
  return isLanguage(value) ? value : DEFAULT_LANGUAGE;
};

const normalizeSettings = (settings?: Settings): Settings => {
  return {
    ...initialAppSettings,
    ...settings,
    language: resolveLanguage(settings?.language),
  };
};

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = (props: LayoutProps) => {
  const { children } = props;
  const [mounted, setMounted] = useState(false);
  const [initialSettings, setInitialSettings] = useState<Settings | undefined>(initialAppSettings);

  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      const parsedSettings = storedSettings ? (JSON.parse(storedSettings) as Settings) : undefined;
      const nextSettings = normalizeSettings(parsedSettings);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
      setInitialSettings(nextSettings);
      void i18n.changeLanguage(nextSettings.language ?? DEFAULT_LANGUAGE);
    } catch (error) {
      console.error('Failed to initialize settings storage', error);
      const fallbackSettings = normalizeSettings(initialAppSettings);
      setInitialSettings(fallbackSettings);
      void i18n.changeLanguage(fallbackSettings.language ?? DEFAULT_LANGUAGE);
    } finally {
      setMounted(true);
    }
  }, []);

  const handleSettingsUpdate = (newSettings: Settings) => {
    const nextSettings = normalizeSettings(newSettings);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
    const currentLanguage = resolveLanguage(i18n.resolvedLanguage ?? i18n.language);
    if (nextSettings.language && nextSettings.language !== currentLanguage) {
      void i18n.changeLanguage(nextSettings.language);
    }
  };

  const handleSettingsReset = () => {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    void i18n.changeLanguage(DEFAULT_LANGUAGE);
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

