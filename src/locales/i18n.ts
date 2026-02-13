/* eslint-disable import/no-named-as-default-member */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from './translations/en';
import { de } from './translations/de';
import { es } from './translations/es';
import { rs } from './translations/rs';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    es: { translation: es },
    rs: { translation: rs },
  },
  lng: 'rs',
  fallbackLng: 'rs',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
