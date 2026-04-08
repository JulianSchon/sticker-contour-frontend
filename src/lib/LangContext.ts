import { createContext, useContext } from 'react';
import { translations, type Lang, type T } from './i18n.ts';

interface LangContextValue {
  lang: Lang;
  t: T;
  setLang: (lang: Lang) => void;
}

export const LangContext = createContext<LangContextValue>({
  lang: 'en',
  t: translations.en,
  setLang: () => {},
});

export function useLang() {
  return useContext(LangContext);
}
