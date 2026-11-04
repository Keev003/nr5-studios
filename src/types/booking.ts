/** Shapes shared by the booking UI, the data layer and the availability engine. */

export interface Artist {
  id: string
  slug: string
  name: string
  bio: string
  /** English bio; falls back to `bio` when missing. */
  bioEn: string | null
  imageUrl: string
  specialties: string[]
  /** Minimum gap kept free before and after each appointment. */
  bufferMinutes: number
}

export interface Service {
  id: string
  slug: string
  name: string
  description: string
  /** Estimated price in NOK; 0 means free. */
  priceNok: number
  durationMinutes: number
  /** Optional human-friendly duration, e.g. "1–2 timer". */
  durationLabel: string | null
  sortOrder: number
}

/** 0 = Sunday … 6 = Saturday (same as JS `getDay()` and Postgres `EXTRACT(DOW)`). */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Recurring weekly working window, in studio-local wall-clock time ("HH:mm"). */
export interface WeeklyHours {
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
}

/**
 * Date-specific override (date is "yyyy-MM-dd" in studio time):
 * - `isAvailable: false`, no times → whole day off (vacation, sick day)
 * - `isAvailable: false`, with times → that window is blocked
 * - `isAvailable: true`, with times → custom working hours replacing the weekly schedule
 */
export interface AvailabilityException {
  date: string
  startTime: string | null
  endTime: string | null
  isAvailable: boolean
  reason?: string | null
}

/** An occupied interval. Public availability only ever sees these instants, never booking details. */
export interface BusyInterval {
  startsAt: string
  endsAt: string
}

export interface ArtistSchedule {
  weekly: WeeklyHours[]
  exceptions: AvailabilityException[]
  busy: BusyInterval[]
}

export type MinorPolicy = 'reject' | 'pending_with_guardian_consent'

export interface StudioSettings {
  minimumAge: number
  minorPolicy: MinorPolicy
  /** Free cancellation until this many hours before the appointment. */
  cancellationDeadlineHours: number
  /** Within this many hours: 100 %. Between this and the deadline: `lateCancellationPercent`. */
  lateCancellationHours: number
  lateCancellationPercent: number
  policyVersion: string
  slotIntervalMinutes: number
  minNoticeHours: number
  bookingHorizonDays: number
  guardianConsentFormUrl: string
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

export interface CustomerInfo {
  fullName: string
  dateOfBirth: string
  email: string
  phone: string
  tattooPlacement: string
  tattooDescription: string
}

/** What the browser sends. Prices, durations and statuses are decided server-side. */
export interface BookingRequest {
  artistId: string
  serviceId: string
  startsAt: string
  customer: CustomerInfo
  referenceImage: File | null
  cancellationPolicyAccepted: true
  cancellationPolicyVersion: string
  /** Honeypot field — must stay empty. */
  website?: string
  /** Language the customer used, for their emails. */
  language: 'nb' | 'en'
}

export interface BookingConfirmation {
  reference: string
  status: BookingStatus
  requiresGuardianConsent: boolean
  artistName: string
  serviceName: string
  priceNok: number
  startsAt: string
  endsAt: string
}
