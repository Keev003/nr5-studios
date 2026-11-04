import { getSupabase } from '@/lib/supabase'
import type { BookingStatus, StudioSettings, WeeklyHours } from '@/types/booking'
import type { ExceptionRow, NotificationRow, ServiceRow, StaffArtist, StaffBooking, TeamMember } from '@/types/dashboard'
import { kickNotifications } from './notifications'

/**
 * Data access for the staff dashboard. Every call runs as the signed-in
 * user, so Row Level Security decides what they may see and change.
 */

const sb = () => getSupabase()

function check<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error) throw new Error(result.error.message)
  return result.data as NonNullable<T>
}

const time = (t: string | null) => (t ? t.slice(0, 5) : null)

/* eslint-disable @typescript-eslint/no-explicit-any -- rows are mapped field by field below */
const toBooking = (r: any): StaffBooking => ({
  id: r.id,
  reference: r.booking_reference,
  artistId: r.artist_id,
  serviceId: r.service_id,
  serviceName: r.service_name,
  priceNok: r.price_nok,
  customerName: r.customer_name,
  customerEmail: r.customer_email,
  customerPhone: r.customer_phone,
  customerDateOfBirth: r.customer_date_of_birth,
  tattooPlacement: r.tattoo_placement,
  tattooDescription: r.tattoo_description,
  referenceImagePath: r.reference_image_path,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  status: r.status,
  requiresGuardianConsent: r.requires_guardian_consent,
  guardianConsentVerifiedAt: r.guardian_consent_verified_at,
  cancellationPolicyAcceptedAt: r.cancellation_policy_accepted_at,
  cancellationPolicyVersion: r.cancellation_policy_version,
  cancellationReason: r.cancellation_reason,
  createdAt: r.created_at,
})

const toArtist = (r: any): StaffArtist => ({
  id: r.id,
  profileId: r.profile_id,
  slug: r.slug,
  name: r.name,
  bio: r.bio,
  bioEn: r.bio_en,
  imageUrl: r.image_url,
  specialties: r.specialties ?? [],
  bufferMinutes: r.buffer_minutes,
  active: r.active,
})

const toService = (r: any): ServiceRow => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  description: r.description,
  priceNok: r.price_nok,
  durationMinutes: r.duration_minutes,
  durationLabel: r.duration_label,
  sortOrder: r.sort_order,
  active: r.active,
})
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------- bookings

export async function listBookings(opts: { artistId?: string | null; from?: string; to?: string } = {}) {
  let q = sb().from('bookings').select('*').order('starts_at')
  if (opts.artistId) q = q.eq('artist_id', opts.artistId)
  if (opts.from) q = q.gte('ends_at', opts.from)
  if (opts.to) q = q.lt('starts_at', opts.to)
  return check(await q).map(toBooking)
}

export async function setBookingStatus(id: string, status: BookingStatus, cancellationReason?: string) {
  const patch: Record<string, unknown> = { status }
  if (status === 'cancelled') patch.cancellation_reason = cancellationReason?.trim() || null
  check(await sb().from('bookings').update(patch).eq('id', id).select('id').single())
  kickNotifications() // confirmation / cancellation emails were queued by the database
}

export async function verifyGuardianConsent(id: string) {
  check(await sb().from('bookings').update({ guardian_consent_verified_at: new Date().toISOString() }).eq('id', id).select('id').single())
}

/** Short-lived link to a private reference image (RLS decides who may get one). */
export async function referenceImageUrl(path: string): Promise<string> {
  const { data, error } = await sb().storage.from('reference-images').createSignedUrl(path, 600)
  if (error) throw new Error(error.message)
  return data.signedUrl
}

// ---------------------------------------------------------------- notifications

export async function listNotifications(bookingId: string): Promise<NotificationRow[]> {
  const rows = check(await sb().from('notifications').select('*').eq('booking_id', bookingId).order('created_at'))
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    recipient: r.recipient,
    status: r.status,
    attempts: r.attempts,
    lastError: r.last_error,
    createdAt: r.created_at,
    sentAt: r.sent_at,
  }))
}

export async function resendNotification(id: string) {
  const { error } = await sb().rpc('requeue_notification', { p_id: id })
  if (error) throw new Error(error.message)
  kickNotifications()
}

// ---------------------------------------------------------------- artists

export async function listArtists(): Promise<StaffArtist[]> {
  return check(await sb().from('artists').select('*').order('sort_order')).map(toArtist)
}

export async function updateArtist(id: string, patch: Partial<Pick<StaffArtist, 'name' | 'bio' | 'bioEn' | 'imageUrl' | 'specialties' | 'bufferMinutes'>>) {
  const row: Record<string, unknown> = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.bio !== undefined) row.bio = patch.bio
  if (patch.bioEn !== undefined) row.bio_en = patch.bioEn || null
  if (patch.imageUrl !== undefined) row.image_url = patch.imageUrl
  if (patch.specialties !== undefined) row.specialties = patch.specialties
  if (patch.bufferMinutes !== undefined) row.buffer_minutes = patch.bufferMinutes
  check(await sb().from('artists').update(row).eq('id', id).select('id').single())
}

export async function setArtistActive(id: string, active: boolean) {
  check(await sb().from('artists').update({ active }).eq('id', id).select('id').single())
}

export async function uploadArtistPhoto(artistId: string, file: File): Promise<string> {
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${artistId}/${Date.now()}.${ext}`
  const { error } = await sb().storage.from('artist-photos').upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new Error(error.message)
  return sb().storage.from('artist-photos').getPublicUrl(path).data.publicUrl
}

// ---------------------------------------------------------------- availability

export async function getWeeklyHours(artistId: string): Promise<WeeklyHours[]> {
  const rows = check(
    await sb().from('artist_availability').select('day_of_week, start_time, end_time').eq('artist_id', artistId).order('day_of_week').order('start_time'),
  )
  return rows.map((r) => ({ dayOfWeek: r.day_of_week, startTime: time(r.start_time)!, endTime: time(r.end_time)! }))
}

export async function saveWeeklyHours(artistId: string, hours: WeeklyHours[]) {
  const { error } = await sb().rpc('set_weekly_hours', { p_artist_id: artistId, p_hours: hours })
  if (error) throw new Error(error.message)
}

export async function listExceptions(artistId: string, from: string): Promise<ExceptionRow[]> {
  const rows = check(await sb().from('availability_exceptions').select('*').eq('artist_id', artistId).gte('date', from).order('date').order('start_time'))
  return rows.map((r) => ({
    id: r.id,
    artistId: r.artist_id,
    date: r.date,
    startTime: time(r.start_time),
    endTime: time(r.end_time),
    isAvailable: r.is_available,
    reason: r.reason,
  }))
}

export async function addExceptions(rows: Omit<ExceptionRow, 'id'>[]) {
  check(
    await sb()
      .from('availability_exceptions')
      .insert(rows.map((r) => ({
        artist_id: r.artistId,
        date: r.date,
        start_time: r.startTime,
        end_time: r.endTime,
        is_available: r.isAvailable,
        reason: r.reason || null,
      })))
      .select('id'),
  )
}

export async function deleteException(id: string) {
  check(await sb().from('availability_exceptions').delete().eq('id', id).select('id'))
}

// ---------------------------------------------------------------- services

export async function listAllServices(): Promise<ServiceRow[]> {
  return check(await sb().from('services').select('*').order('sort_order')).map(toService)
}

export async function saveService(service: Omit<ServiceRow, 'id'> & { id?: string }) {
  const row = {
    slug: service.slug,
    name: service.name,
    description: service.description,
    price_nok: service.priceNok,
    duration_minutes: service.durationMinutes,
    duration_label: service.durationLabel || null,
    sort_order: service.sortOrder,
    active: service.active,
  }
  const q = service.id ? sb().from('services').update(row).eq('id', service.id) : sb().from('services').insert(row)
  check(await q.select('id').single())
}

// ---------------------------------------------------------------- studio

export async function getStudioSettings(): Promise<StudioSettings> {
  const r = check(await sb().from('studio_settings').select('*').single())
  return {
    minimumAge: r.minimum_age,
    minorPolicy: r.minor_policy,
    cancellationFeeNok: r.cancellation_fee_nok,
    cancellationDeadlineHours: r.cancellation_deadline_hours,
    policyVersion: r.policy_version,
    slotIntervalMinutes: r.slot_interval_minutes,
    minNoticeHours: r.min_notice_hours,
    bookingHorizonDays: r.booking_horizon_days,
    guardianConsentFormUrl: r.guardian_consent_form_url,
  }
}

export async function saveStudioSettings(s: StudioSettings) {
  check(
    await sb()
      .from('studio_settings')
      .update({
        minimum_age: s.minimumAge,
        minor_policy: s.minorPolicy,
        cancellation_fee_nok: s.cancellationFeeNok,
        cancellation_deadline_hours: s.cancellationDeadlineHours,
        policy_version: s.policyVersion,
        slot_interval_minutes: s.slotIntervalMinutes,
        min_notice_hours: s.minNoticeHours,
        booking_horizon_days: s.bookingHorizonDays,
        guardian_consent_form_url: s.guardianConsentFormUrl,
      })
      .eq('id', true)
      .select('id')
      .single(),
  )
}

export async function listTeam(): Promise<TeamMember[]> {
  const [profiles, artists] = await Promise.all([
    sb().from('profiles').select('id, full_name, email, role').order('created_at'),
    sb().from('artists').select('id, name, active, profile_id'),
  ])
  const artistRows = check(artists)
  return check(profiles).map((p) => {
    const a = artistRows.find((x) => x.profile_id === p.id)
    return {
      id: p.id,
      fullName: p.full_name,
      email: p.email,
      role: p.role,
      artist: a ? { id: a.id, name: a.name, active: a.active } : null,
    }
  })
}

/** Calls the admin-users Edge Function. Throws with the function's error code. */
export async function adminUsers(body: Record<string, unknown>): Promise<{ userId?: string }> {
  const { data, error } = await sb().functions.invoke('admin-users', { body })
  if (error) {
    // The function replies with { error: code } on 4xx.
    const ctx = (error as { context?: Response }).context
    const payload = ctx ? await ctx.json().catch(() => null) : null
    throw new Error(payload?.error ?? 'function_unavailable')
  }
  return data
}

/** The signed-in user changes their own password. */
export async function changeOwnPassword(password: string) {
  const { error } = await sb().auth.updateUser({ password })
  if (error) throw new Error(error.message)
}
