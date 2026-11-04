import type { StudioSettings } from '@/types/booking'

/** Whole years between a "yyyy-MM-dd" birth date and a "yyyy-MM-dd" reference date. */
export function ageOn(dateOfBirth: string, onDate: string): number {
  const [by, bm, bd] = dateOfBirth.split('-').map(Number) as [number, number, number]
  const [y, m, d] = onDate.split('-').map(Number) as [number, number, number]
  let age = y - by
  if (m < bm || (m === bm && d < bd)) age -= 1
  return age
}

export type AgeCheck =
  | { kind: 'adult'; age: number }
  | { kind: 'requires_guardian_consent'; age: number }
  | { kind: 'not_permitted'; age: number }

/**
 * Applies the studio's age policy on the appointment date. Guardian consent
 * never makes a booking automatic: such bookings stay pending until the
 * studio has verified consent and decided the appointment is appropriate.
 */
export function checkAge(dateOfBirth: string, appointmentDate: string, settings: Pick<StudioSettings, 'minimumAge' | 'minorPolicy'>): AgeCheck {
  const age = ageOn(dateOfBirth, appointmentDate)
  if (age >= settings.minimumAge) return { kind: 'adult', age }
  if (settings.minorPolicy === 'pending_with_guardian_consent') return { kind: 'requires_guardian_consent', age }
  return { kind: 'not_permitted', age }
}
