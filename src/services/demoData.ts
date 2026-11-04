import type { Artist, ArtistSchedule, Service, StudioSettings } from '@/types/booking'
import { bookingDefaults } from '@/lib/config'
import { images } from '@/data/images'

/**
 * Demo catalogue mirroring the Supabase seed data (phase 4). Used only
 * until the database is connected. No real customer data.
 */
export const demoArtists: Artist[] = [
  {
    id: '6f1c2c1e-0000-4000-8000-000000000001',
    slug: 'shmoky',
    name: 'Shmoky',
    bio: 'Tunge, rene linjer og store prosjekter over flere økter.',
    bioEn: 'Bold, clean lines and large projects over several sessions.',
    imageUrl: images.shmoky,
    specialties: ['Blackwork', 'Neo-traditional'],
    bufferMinutes: 30,
  },
  {
    id: '6f1c2c1e-0000-4000-8000-000000000002',
    slug: 'aj',
    name: 'AJ',
    bio: 'Detaljerte fine line-motiver med mye bevegelse.',
    bioEn: 'Detailed fine-line designs full of movement.',
    imageUrl: images.aj,
    specialties: ['Fine line', 'Botanical'],
    bufferMinutes: 15,
  },
]

export const demoServices: Service[] = [
  {
    id: 'consultation',
    slug: 'consultation',
    name: 'Consultation',
    description: 'Free consultation to discuss your tattoo idea, placement, size and design.',
    priceNok: 0,
    durationMinutes: 30,
    durationLabel: null,
    sortOrder: 1,
  },
  {
    id: 'small-piece',
    slug: 'small-piece',
    name: 'Small Piece',
    description: 'Up to roughly 10cm. Lettering, small symbols etc.',
    priceNok: 1500,
    durationMinutes: 120,
    durationLabel: '1–2 timer',
    sortOrder: 2,
  },
  {
    id: 'half-day',
    slug: 'half-day',
    name: 'Half Day',
    description: 'Four hours. Medium piece.',
    priceNok: 4000,
    durationMinutes: 240,
    durationLabel: null,
    sortOrder: 3,
  },
  {
    id: 'full-day',
    slug: 'full-day',
    name: 'Full Day',
    description: 'Six hours. Large scale and multi-session project.',
    priceNok: 6000,
    durationMinutes: 360,
    durationLabel: null,
    sortOrder: 4,
  },
]

export const demoSettings: StudioSettings = {
  minimumAge: bookingDefaults.minimumAge,
  minorPolicy: 'pending_with_guardian_consent',
  cancellationFeeNok: bookingDefaults.cancellationFeeNok,
  cancellationDeadlineHours: bookingDefaults.cancellationDeadlineHours,
  policyVersion: bookingDefaults.policyVersion,
  slotIntervalMinutes: 30,
  minNoticeHours: 12,
  bookingHorizonDays: 120,
  guardianConsentFormUrl: bookingDefaults.guardianConsentFormUrl,
}

export const demoSchedules: Record<string, Omit<ArtistSchedule, 'busy'>> = {
  [demoArtists[0]!.id]: {
    weekly: [
      { dayOfWeek: 1, startTime: '10:00', endTime: '17:00' },
      { dayOfWeek: 2, startTime: '12:00', endTime: '19:00' },
      { dayOfWeek: 4, startTime: '10:00', endTime: '17:00' },
      { dayOfWeek: 5, startTime: '10:00', endTime: '16:00' },
    ],
    exceptions: [],
  },
  [demoArtists[1]!.id]: {
    weekly: [
      { dayOfWeek: 2, startTime: '10:00', endTime: '18:00' },
      { dayOfWeek: 3, startTime: '10:00', endTime: '18:00' },
      { dayOfWeek: 4, startTime: '12:00', endTime: '20:00' },
      { dayOfWeek: 6, startTime: '11:00', endTime: '16:00' },
    ],
    exceptions: [],
  },
}
