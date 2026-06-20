import { createContext, useContext } from 'react';
import { translations, type Lang, type T } from './i18n.ts';

export type Theme = 'dark' | 'light';

interface LangContextValue {
  lang: Lang;
  t: T;
  setLang: (lang: Lang) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const LangContext = createContext<LangContextValue>({
  lang: 'en',
  t: translations.en,
  setLang: () => {},
  theme: 'dark',
  setTheme: () => {},
});

export function useLang() {
  return useContext(LangContext);
}
