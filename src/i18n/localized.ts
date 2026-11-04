import type { Lang } from './LanguageContext'

/** Content that exists in both languages (artist bios, image descriptions …). */
export type Localized = Record<Lang, string>
