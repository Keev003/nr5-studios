import { TZDate } from '@date-fns/tz'
import { addDays, format } from 'date-fns'
import { enGB, nb } from 'date-fns/locale'
import { studio } from './config'

export const STUDIO_TZ = studio.timeZone

/** Parses "yyyy-MM-dd" into its numeric parts. */
function splitDate(date: string): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) throw new Error(`Ugyldig dato: ${date}`)
  return [y, m, d]
}

/**
 * The instant at which the studio's wall clock shows `time` on `date`.
 * Handles DST: e.g. 10:00 is 09:00Z in winter and 08:00Z in summer.
 */
export function studioDateTime(date: string, time: string): Date {
  const [y, m, d] = splitDate(date)
  const [hh = 0, mm = 0] = time.split(':').map(Number)
  return new Date(new TZDate(y, m - 1, d, hh, mm, STUDIO_TZ).getTime())
}

/** Day of week (0 = Sunday) of a studio calendar date. */
export function studioDayOfWeek(date: string): number {
  const [y, m, d] = splitDate(date)
  return new TZDate(y, m - 1, d, 12, 0, STUDIO_TZ).getDay()
}

/** Studio calendar date ("yyyy-MM-dd") of an instant. */
export function toStudioDate(instant: Date | string | number): string {
  return format(new TZDate(new Date(instant).getTime(), STUDIO_TZ), 'yyyy-MM-dd')
}

/** "14:30" in studio time. */
export function formatStudioTime(instant: Date | string): string {
  return format(new TZDate(new Date(instant).getTime(), STUDIO_TZ), 'HH:mm')
}

export type DisplayLang = 'nb' | 'en'

/** "fredag 6. november 2026" / "Friday 6 November 2026" in studio time. */
export function formatStudioDateLong(instant: Date | string, lang: DisplayLang = 'nb'): string {
  const date = new TZDate(new Date(instant).getTime(), STUDIO_TZ)
  return lang === 'en' ? format(date, 'EEEE d MMMM yyyy', { locale: enGB }) : format(date, 'EEEE d. MMMM yyyy', { locale: nb })
}

/** Adds whole calendar days to a "yyyy-MM-dd" date. */
export function addStudioDays(date: string, days: number): string {
  const [y, m, d] = splitDate(date)
  return format(addDays(new Date(y, m - 1, d), days), 'yyyy-MM-dd')
}

/** "2 t" / "2 h", "30 min", "1 t 30 min". */
export function formatDuration(minutes: number, lang: DisplayLang = 'nb'): string {
  const hourUnit = lang === 'en' ? 'h' : 't'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} min`
  return m ? `${h} ${hourUnit} ${m} min` : `${h} ${hourUnit}`
}

/** "1 500 kr" / "NOK 1,500"; 0 is shown as free. */
export function formatPrice(nok: number, lang: DisplayLang = 'nb'): string {
  if (lang === 'en') return nok === 0 ? 'Free' : `NOK ${new Intl.NumberFormat('en-GB').format(nok)}`
  if (nok === 0) return 'Gratis'
  return `${new Intl.NumberFormat('nb-NO').format(nok)} kr`
}
