import type { Service } from '@/types/booking'
import { formatDuration, type DisplayLang } from './time'

/** Display duration: the studio's own label (e.g. "1–2 timer") in Norwegian, otherwise computed. */
export function formatServiceDuration(service: Service, lang: DisplayLang): string {
  if (service.durationLabel && lang === 'nb') return service.durationLabel
  if (service.durationLabel && lang === 'en') return service.durationLabel.replace('timer', 'hours').replace('time', 'hour')
  return formatDuration(service.durationMinutes, lang)
}
