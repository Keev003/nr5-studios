import type { BookingStatus } from '@/types/booking'

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Venter',
  confirmed: 'Bekreftet',
  cancelled: 'Avlyst',
  completed: 'Fullført',
  no_show: 'Ikke møtt',
}

export const STATUS_TONE = {
  pending: 'warning',
  confirmed: 'olive',
  cancelled: 'neutral',
  completed: 'success',
  no_show: 'danger',
} as const satisfies Record<BookingStatus, string>

export const isActive = (s: BookingStatus) => s === 'pending' || s === 'confirmed'
