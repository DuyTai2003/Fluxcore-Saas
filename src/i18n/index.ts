import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import vi from './locales/vi.json';
import zhHans from './locales/zh-Hans.json';
import zhHant from './locales/zh-Hant.json';

const resources = {
  en: { translation: en },
  vi: { translation: vi },
  'zh-Hans': { translation: zhHans },
  'zh-Hant': { translation: zhHant },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',                         // Always start in English
    fallbackLng: 'en',
    supportedLngs: ['en', 'vi', 'zh-Hans', 'zh-Hant'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage'],         // Only read saved preference, ignore browser language
      caches: ['localStorage'],
      lookupLocalStorage: 'fluxcore-language',
    },
  });

export default i18n;