import { getLocales } from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import type { Language } from '../domain/types';
import { en } from './en';
import { ta } from './ta';

export function detectLanguage(): Language {
  return getLocales()[0]?.languageCode === 'ta' ? 'ta' : 'en';
}

void i18next.use(initReactI18next).init({
  resources: { en: { translation: en }, ta: { translation: ta } },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function setLanguage(language: Language): Promise<unknown> {
  return i18next.changeLanguage(language);
}

export default i18next;
