import i18next, { type TFunction } from 'i18next';
import { tokens } from './tokens';
import { en } from './translations/en';
import { de } from './translations/de';
import { es } from './translations/es';
import { rs } from './translations/rs';

let initialized = false;

export async function getServerI18n(locale: string = 'rs'): Promise<TFunction> {
     if (!initialized) {
          await i18next.init({
               resources: {
                    en: { translation: en },
                    de: { translation: de },
                    es: { translation: es },
                    rs: { translation: rs },
               },
               lng: 'en',
               fallbackLng: 'en',
               interpolation: { escapeValue: false },
               initImmediate: false,
               keySeparator: false,
               nsSeparator: false,
          });
          initialized = true;
     }

     await i18next.changeLanguage(locale || 'rs');
     return i18next.t.bind(i18next);
}

export { tokens };
