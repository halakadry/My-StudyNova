import { useSyncExternalStore } from 'react';
import translations from './translations';

const STORAGE_KEY = 'studynova-language';
const listeners = new Set();

function readSaved() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return translations[saved] ? saved : 'en';
  } catch (err) {
    return 'en';
  }
}

let current = readSaved();

export function setLanguage(lang) {
  if (!translations[lang]) return;
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (err) {
    // storage unavailable: the choice just won't be remembered
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Use in any component: const { t, lang, dir, locale } = useLanguage();
export function useLanguage() {
  const lang = useSyncExternalStore(subscribe, () => current);

  const t = (key, vars) => {
    let text = translations[lang]?.[key] ?? translations.en[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([name, value]) => {
        text = text.split(`{${name}}`).join(String(value));
      });
    }
    return text;
  };

  return {
    lang,
    t,
    setLanguage,
    dir: lang === 'en' ? 'ltr' : 'rtl',
    // Dates in the chosen language (Arabic keeps 0-9 digits)
    locale: lang === 'he' ? 'he-IL' : lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB',
  };
}