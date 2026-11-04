import { isSlotAvailable } from '@/lib/availability'
import { checkAge } from '@/lib/age'
import { addStudioDays, studioDateTime, toStudioDate } from '@/lib/time'
import { customerSchema } from '@/lib/validation'
import type { BookingConfirmation, BusyInterval } from '@/types/booking'
import type { BookingRepository } from './bookingRepository'
import { demoArtists, demoSchedules, demoServices, demoSettings } from './demoData'
import { BookingRejectedError, SlotUnavailableError } from './errors'

/**
 * In-browser stand-in for the backend. It applies the same rules the Edge
 * Function will (server-side pricing, availability re-check, age policy), and
 * keeps demo bookings in localStorage so double booking can be tried out.
 */

const STORAGE_KEY = 'nr5-demo-bookings'
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms))

interface StoredBooking extends BusyInterval {
  artistId: string
}

function loadBookings(): StoredBooking[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as StoredBooking[]
  } catch {
    return []
  }
}

function saveBookings(bookings: StoredBooking[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings))
  } catch {
    /* storage unavailable — demo bookings just won't persist */
  }
}

/** A few pre-existing appointments so the calendar shows realistic gaps. */
function seededBusy(artistId: string): StoredBooking[] {
  const today = toStudioDate(new Date())
  const at = (offset: number, start: string, end: string): StoredBooking => {
    const date = addStudioDays(today, offset)
    return { artistId, startsAt: studioDateTime(date, start).toISOString(), endsAt: studioDateTime(date, end).toISOString() }
  }
  return artistId === demoArtists[0]!.id
    ? [at(1, '12:00', '14:00'), at(3, '10:00', '16:00'), at(7, '13:00', '17:00')]
    : [at(1, '10:00', '14:00'), at(2, '12:00', '18:00'), at(8, '11:00', '15:00')]
}

function busyFor(artistId: string): BusyInterval[] {
  return [...seededBusy(artistId), ...loadBookings()]
    .filter((b) => b.artistId === artistId)
    .map(({ startsAt, endsAt }) => ({ startsAt, endsAt }))
}

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function newReference(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return 'NR5-' + Array.from(bytes, (b) => REFERENCE_ALPHABET[b % REFERENCE_ALPHABET.length]).join('')
}

export const demoRepository: BookingRepository = {
  async listArtists() {
    await delay()
    return demoArtists
  },

  async listServices() {
    await delay()
    return [...demoServices].sort((a, b) => a.sortOrder - b.sortOrder)
  },

  async getSettings() {
    return demoSettings
  },

  async getSchedule(artistId) {
    await delay(350)
    const schedule = demoSchedules[artistId]
    if (!schedule) throw new BookingRejectedError('not_found')
    return { ...schedule, busy: busyFor(artistId) }
  },

  async createBooking(request) {
    await delay(700)
    if (request.website) throw new BookingRejectedError('spam')

    // Never trust client values: look everything up again.
    const artist = demoArtists.find((a) => a.id === request.artistId)
    const service = demoServices.find((s) => s.id === request.serviceId)
    if (!artist || !service) throw new BookingRejectedError('not_found')
    if (!request.cancellationPolicyAccepted) throw new BookingRejectedError('policy')

    const parsed = customerSchema.safeParse(request.customer)
    if (!parsed.success) throw new BookingRejectedError('invalid')

    const startsAt = new Date(request.startsAt)
    const date = toStudioDate(startsAt)
    const schedule = { ...demoSchedules[artist.id]!, busy: busyFor(artist.id) }
    const earliestStart = new Date(Date.now() + demoSettings.minNoticeHours * 3_600_000)
    const opts = {
      durationMinutes: service.durationMinutes,
      bufferMinutes: artist.bufferMinutes,
      intervalMinutes: demoSettings.slotIntervalMinutes,
      earliestStart,
    }
    if (!isSlotAvailable(startsAt, date, schedule, opts)) throw new SlotUnavailableError()

    const age = checkAge(parsed.data.dateOfBirth, date, demoSettings)
    if (age.kind === 'not_permitted') {
      throw new BookingRejectedError('minor_not_permitted')
    }

    const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000)
    saveBookings([...loadBookings(), { artistId: artist.id, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() }])

    const requiresGuardianConsent = age.kind === 'requires_guardian_consent'
    const confirmation: BookingConfirmation = {
      reference: newReference(),
      status: requiresGuardianConsent ? 'pending' : 'confirmed',
      requiresGuardianConsent,
      artistName: artist.name,
      serviceName: service.name,
      priceNok: service.priceNok,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    }
    return confirmation
  },
}
