import type { CustomerInfo } from '@/types/booking'

/** Everything the customer has chosen so far. Survives page reloads via sessionStorage. */
export interface BookingDraft {
  artistId: string | null
  serviceId: string | null
  /** Studio calendar date "yyyy-MM-dd". */
  date: string | null
  /** ISO instant of the chosen start time. */
  startsAt: string | null
  customer: Partial<CustomerInfo>
}

export const emptyDraft: BookingDraft = {
  artistId: null,
  serviceId: null,
  date: null,
  startsAt: null,
  customer: {},
}

/** Index of the furthest step the customer may open, given what is filled in. */
export function furthestReachableStep(draft: BookingDraft, customerComplete: boolean): number {
  if (!draft.artistId) return 0
  if (!draft.serviceId) return 1
  if (!draft.startsAt) return 2
  if (!customerComplete) return 3
  return 4
}
