import { isSupabaseConfigured } from '@/lib/supabase'
import type {
  Artist,
  ArtistSchedule,
  BookingConfirmation,
  BookingRequest,
  Service,
  StudioSettings,
} from '@/types/booking'
import { demoRepository } from './demoRepository'
import { supabaseRepository } from './supabaseRepository'

/**
 * Everything the public booking flow needs from the backend. The UI only
 * talks to this interface, so the data source can be swapped without
 * touching components.
 */
export interface BookingRepository {
  listArtists(): Promise<Artist[]>
  listServices(): Promise<Service[]>
  getSettings(): Promise<StudioSettings>
  /** Working hours, exceptions and busy intervals between two "yyyy-MM-dd" dates. */
  getSchedule(artistId: string, from: string, to: string): Promise<ArtistSchedule>
  /** Validates, re-checks availability and stores the booking server-side. */
  createBooking(request: BookingRequest): Promise<BookingConfirmation>
}

/**
 * Supabase when credentials are present, unless VITE_DATA_SOURCE=demo forces
 * the in-browser demo (handy for presenting without a network).
 */
export const isDemoData = !isSupabaseConfigured || import.meta.env.VITE_DATA_SOURCE === 'demo'
export const bookingRepository: BookingRepository = isDemoData ? demoRepository : supabaseRepository
