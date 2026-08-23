import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { en } from '../i18n/en.js'
import { ne } from '../i18n/ne.js'

const LanguageContext = createContext(null)

const LANG_KEY = 'novanest_lang'
export const LANGUAGES = [
  { code: 'en', name: 'English', short: 'EN' },
  { code: 'ne', name: 'नेपाली', short: 'ने' },
]

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem(LANG_KEY) || 'en'
    } catch {
      return 'en'
    }
  })

  const setLang = useCallback((l) => {
    try {
      localStorage.setItem(LANG_KEY, l)
    } catch {
      /* ignore storage errors */
    }
    setLangState(l)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang === 'ne' ? 'ne' : 'en'
  }, [lang])

  const t = useCallback(
    (key, vars) => {
      const dict = lang === 'ne' ? ne : en
      let s = dict[key] ?? en[key] ?? key
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.split(`{${k}}`).join(String(v))
        }
      }
      return s
    },
    [lang]
  )

  const value = useMemo(
    () => ({ lang, setLang, t, isNe: lang === 'ne' }),
    [lang, setLang, t]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLang() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used within LanguageProvider')
  return ctx
}
