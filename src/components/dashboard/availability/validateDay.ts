import type { WeeklyHours } from '@/types/booking'

/** Problems with a day's windows, in plain Norwegian, or null when fine. */
export function validateDay(windows: WeeklyHours[]): string | null {
  if (windows.some((w) => !w.startTime || !w.endTime)) return 'Fyll inn start og slutt.'
  if (windows.some((w) => w.endTime <= w.startTime)) return 'Sluttid må være etter starttid.'
  const sorted = [...windows].sort((a, b) => a.startTime.localeCompare(b.startTime))
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.startTime < sorted[i - 1]!.endTime) return 'Tidsrommene overlapper.'
  }
  return null
}
