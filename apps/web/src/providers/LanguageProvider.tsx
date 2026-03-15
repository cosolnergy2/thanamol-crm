import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { en, th, type Translations } from '../lib/translations'

const STORAGE_KEY = 'preferredLanguage'

type Language = 'en' | 'th'

const TRANSLATIONS: Record<Language, Translations> = { en, th }

type LanguageContextValue = {
  language: Language
  setLanguage: (lang: Language) => void
  t: Translations
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'th' || stored === 'en' ? stored : 'en'
  })

  const setLanguage = useCallback((lang: Language) => {
    localStorage.setItem(STORAGE_KEY, lang)
    setLanguageState(lang)
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'th' || stored === 'en') {
      setLanguageState(stored)
    }
  }, [])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: TRANSLATIONS[language] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return ctx
}
