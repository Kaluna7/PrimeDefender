import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translate } from './translations.js';

const STORAGE_KEY = 'prime-locale';

const I18nContext = createContext(null);

/** @param {{ children: import('react').ReactNode }} props */
export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s === 'en' || s === 'id') return s;
    } catch {
      /* ignore */
    }
    return 'en';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = locale === 'id' ? 'id' : 'en';
  }, [locale]);

  const setLocale = useCallback((loc) => {
    if (loc === 'en' || loc === 'id') setLocaleState(loc);
  }, []);

  const t = useCallback(
    (key, vars) => translate(locale, key, vars),
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
