import { useContext } from 'react'
import { LanguageContext } from './LanguageContext'

/** Current language, its dictionary (`t`) and a toggle. */
export function useI18n() {
  return useContext(LanguageContext)
}
