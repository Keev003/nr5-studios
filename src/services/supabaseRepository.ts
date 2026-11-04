import { getSupabase } from '@/lib/supabase'
import type { Artist, ArtistSchedule, BookingConfirmation, Service, StudioSettings } from '@/types/booking'
import type { BookingRepository } from './bookingRepository'
import { BookingRejectedError, SlotUnavailableError, type RejectionCode } from './errors'
import { kickNotifications } from './notifications'

/** Real backend: public reads via RLS-protected tables, writes via the create_booking RPC. */

interface ArtistRow {
  id: string
  slug: string
  name: string
  bio: string
  bio_en: string | null
  image_url: string | null
  specialties: string[]
  buffer_minutes: number
}

interface ServiceRow {
  id: string
  slug: string
  name: string
  description: string
  price_nok: number
  duration_minutes: number
  duration_label: string | null
  sort_order: number
}

interface SettingsRow {
  minimum_age: number
  minor_policy: StudioSettings['minorPolicy']
  cancellation_fee_nok: number
  cancellation_deadline_hours: number
  policy_version: string
  slot_interval_minutes: number
  min_notice_hours: number
  booking_horizon_days: number
  guardian_consent_form_url: string
}

const REJECTION_CODES: RejectionCode[] = ['invalid', 'not_found', 'policy', 'minor_not_permitted', 'rate_limited', 'spam']

/** Turns a database error into the typed errors the UI understands. */
function toBookingError(error: { message: string; code?: string }): Error {
  if (error.message === 'slot_unavailable' || error.code === '23P01') return new SlotUnavailableError()
  const code = REJECTION_CODES.find((c) => c === error.message)
  return code ? new BookingRejectedError(code) : new Error(error.message)
}

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

async function uploadReferenceImage(file: File): Promise<string> {
  const path = `uploads/${crypto.randomUUID()}.${EXTENSIONS[file.type] ?? 'jpg'}`
  const { error } = await getSupabase().storage.from('reference-images').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new BookingRejectedError('upload_failed')
  return path
}

export const supabaseRepository: BookingRepository = {
  async listArtists() {
    const { data, error } = await getSupabase()
      .from('artists')
      .select('id, slug, name, bio, bio_en, image_url, specialties, buffer_minutes')
      .eq('active', true)
      .order('sort_order')
      .returns<ArtistRow[]>()
    if (error) throw new Error(error.message)
    return data.map(
      (a): Artist => ({
        id: a.id,
        slug: a.slug,
        name: a.name,
        bio: a.bio,
        bioEn: a.bio_en,
        imageUrl: a.image_url ?? '',
        specialties: a.specialties,
        bufferMinutes: a.buffer_minutes,
      }),
    )
  },

  async listServices() {
    const { data, error } = await getSupabase()
      .from('services')
      .select('id, slug, name, description, price_nok, duration_minutes, duration_label, sort_order')
      .eq('active', true)
      .order('sort_order')
      .returns<ServiceRow[]>()
    if (error) throw new Error(error.message)
    return data.map(
      (s): Service => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        description: s.description,
        priceNok: s.price_nok,
        durationMinutes: s.duration_minutes,
        durationLabel: s.duration_label,
        sortOrder: s.sort_order,
      }),
    )
  },

  async getSettings() {
    const { data, error } = await getSupabase().from('studio_settings').select('*').single<SettingsRow>()
    if (error) throw new Error(error.message)
    return {
      minimumAge: data.minimum_age,
      minorPolicy: data.minor_policy,
      cancellationFeeNok: data.cancellation_fee_nok,
      cancellationDeadlineHours: data.cancellation_deadline_hours,
      policyVersion: data.policy_version,
      slotIntervalMinutes: data.slot_interval_minutes,
      minNoticeHours: data.min_notice_hours,
      bookingHorizonDays: data.booking_horizon_days,
      guardianConsentFormUrl: data.guardian_consent_form_url,
    }
  },

  async getSchedule(artistId, from, to) {
    const { data, error } = await getSupabase().rpc('get_artist_schedule', { p_artist_id: artistId, p_from: from, p_to: to })
    if (error) throw toBookingError(error)
    return data as ArtistSchedule
  },

  async createBooking(request) {
    const imagePath = request.referenceImage ? await uploadReferenceImage(request.referenceImage) : null
    const c = request.customer
    const { data, error } = await getSupabase().rpc('create_booking', {
      p_artist_id: request.artistId,
      p_service_id: request.serviceId,
      p_starts_at: request.startsAt,
      p_customer_name: c.fullName,
      p_customer_email: c.email,
      p_customer_phone: c.phone,
      p_customer_date_of_birth: c.dateOfBirth,
      p_tattoo_placement: c.tattooPlacement,
      p_tattoo_description: c.tattooDescription,
      p_reference_image_path: imagePath,
      p_policy_accepted: request.cancellationPolicyAccepted,
      p_policy_version: request.cancellationPolicyVersion,
      p_website: request.website ?? null,
      p_language: request.language,
    })
    if (error) throw toBookingError(error)
    kickNotifications()
    return data as BookingConfirmation
  },
}
