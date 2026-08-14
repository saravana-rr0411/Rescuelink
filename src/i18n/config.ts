import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslations from '../locales/en.json';
import taTranslations from '../locales/ta.json';
import hiTranslations from '../locales/hi.json';

const resources = {
  en: { translation: enTranslations },
  ta: { translation: taTranslations },
  hi: { translation: hiTranslations }
};

const savedLanguage = localStorage.getItem('rescuelink_language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
