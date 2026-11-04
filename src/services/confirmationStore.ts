import type { BookingConfirmation } from '@/types/booking'

/**
 * Keeps the last confirmation in sessionStorage so the confirmation page
 * survives a reload. Customers can't read bookings back from the database.
 */
const KEY = 'nr5-last-confirmation'

export function saveConfirmation(confirmation: BookingConfirmation) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(confirmation))
  } catch {
    /* ignore */
  }
}

export function loadConfirmation(reference: string): BookingConfirmation | null {
  try {
    const stored = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as BookingConfirmation | null
    return stored?.reference === reference ? stored : null
  } catch {
    return null
  }
}
