import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { translate } from './translations.js';

const STORAGE_KEY = 'slark-locale';

const I18nContext = createContext(null);

/** @param {{ children: import('react').ReactNode }} props */
export function I18nProvider({ children }) {
  const locale = 'id';

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'id');
    } catch {
      /* ignore */
    }
    document.documentElement.lang = 'id';
  }, []);

  const setLocale = useCallback(() => {
    /* Indonesian only */
  }, []);

  const t = useCallback((key, vars) => translate(locale, key, vars), [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
