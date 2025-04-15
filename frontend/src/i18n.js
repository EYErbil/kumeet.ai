import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files directly
import enTranslations from './translations/en.json';
import esTranslations from './translations/es.json';
import deTranslations from './translations/de.json';
import trTranslations from './translations/tr.json';
import itTranslations from './translations/it.json';
import frTranslations from './translations/fr.json';

// Initialize i18next
i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    // Default language
    fallbackLng: 'en',
    // Debug mode in development
    debug: process.env.NODE_ENV === 'development',
    // Resources with translations
    resources: {
      en: { translation: enTranslations },
      es: { translation: esTranslations },
      de: { translation: deTranslations },
      tr: { translation: trTranslations },
      it: { translation: itTranslations },
      fr: { translation: frTranslations },
    },
    // Detection options
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    // Allow keys to be phrases having . for namespace
    keySeparator: '.',
    // Do not load a fallback resource
    saveMissing: false,
    interpolation: {
      // Not needed for react as it escapes by default
      escapeValue: false,
    },
  });

export default i18n; 