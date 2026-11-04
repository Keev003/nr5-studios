/** The chosen time was taken (or became invalid) before the booking was saved. */
export class SlotUnavailableError extends Error {
  constructor() {
    super('slot_unavailable')
    this.name = 'SlotUnavailableError'
  }
}

/** Reasons the server can give for refusing a booking; each has a translated message. */
export type RejectionCode = 'invalid' | 'not_found' | 'policy' | 'minor_not_permitted' | 'rate_limited' | 'spam' | 'upload_failed'

export class BookingRejectedError extends Error {
  constructor(public readonly code: RejectionCode) {
    super(code)
    this.name = 'BookingRejectedError'
  }
}
