import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { en } from './en'
import { nb, type Dictionary } from './nb'

export type Lang = 'nb' | 'en'

const dictionaries: Record<Lang, Dictionary> = { nb, en }
const STORAGE_KEY = 'nr5-lang'

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'nb' || stored === 'en') return stored
  } catch {
    /* storage unavailable */
  }
  return 'nb'
}

export interface LanguageContextValue {
  lang: Lang
  t: Dictionary
  setLang: (lang: Lang) => void
  toggle: () => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const LanguageContext = createContext<LanguageContextValue>({
  lang: 'nb',
  t: nb,
  setLang: () => {},
  toggle: () => {},
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    document.documentElement.lang = dictionaries[lang].meta.htmlLang
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* ignore */
    }
  }, [lang])

  const setLang = useCallback((next: Lang) => setLangState(next), [])
  const toggle = useCallback(() => setLangState((l) => (l === 'nb' ? 'en' : 'nb')), [])
  const value = useMemo(() => ({ lang, t: dictionaries[lang], setLang, toggle }), [lang, setLang, toggle])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
