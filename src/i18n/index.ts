import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './ar.json';
import en from './en.json';
import { STORAGE_KEYS } from '../config';

function initialLanguage(): 'ar' | 'en' {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (raw) {
      const parsed = JSON.parse(raw);
      const lang = parsed?.state?.language;
      if (lang === 'en' || lang === 'ar') return lang;
    }
  } catch {
    /* ignore corrupted storage */
  }
  return 'ar';
}

void i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
  },
  lng: initialLanguage(),
  fallbackLng: 'ar',
  supportedLngs: ['ar', 'en'],
  interpolation: { escapeValue: false },
  returnNull: false,
  react: { useSuspense: false },
});

export default i18n;
