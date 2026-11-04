import type { BookingStatus } from './booking'

/** A booking as staff see it in the dashboard (full details). */
export interface StaffBooking {
  id: string
  reference: string
  artistId: string
  serviceId: string
  serviceName: string
  priceNok: number
  customerName: string
  customerEmail: string
  customerPhone: string
  customerDateOfBirth: string
  tattooPlacement: string
  tattooDescription: string
  referenceImagePath: string | null
  startsAt: string
  endsAt: string
  status: BookingStatus
  requiresGuardianConsent: boolean
  guardianConsentVerifiedAt: string | null
  cancellationPolicyAcceptedAt: string
  cancellationPolicyVersion: string
  cancellationReason: string | null
  createdAt: string
}

export interface NotificationRow {
  id: string
  kind: 'booking_received' | 'booking_confirmed' | 'booking_cancelled' | 'booking_changed'
  recipient: 'customer' | 'artist'
  status: 'pending' | 'sending' | 'sent' | 'failed'
  attempts: number
  lastError: string | null
  createdAt: string
  sentAt: string | null
}

export interface ExceptionRow {
  id: string
  artistId: string
  date: string
  startTime: string | null
  endTime: string | null
  isAvailable: boolean
  reason: string | null
}

export interface StaffArtist {
  id: string
  profileId: string | null
  slug: string
  name: string
  bio: string
  bioEn: string | null
  imageUrl: string | null
  specialties: string[]
  bufferMinutes: number
  active: boolean
}

export interface ServiceRow {
  id: string
  slug: string
  name: string
  description: string
  priceNok: number
  durationMinutes: number
  durationLabel: string | null
  sortOrder: number
  active: boolean
}

export interface TeamMember {
  id: string
  fullName: string
  email: string
  role: 'artist' | 'admin'
  artist: { id: string; name: string; active: boolean } | null
}
