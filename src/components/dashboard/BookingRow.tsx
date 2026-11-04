import { ShieldAlert } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { formatStudioTime } from '@/lib/time'
import type { StaffBooking } from '@/types/dashboard'
import { BookingStatusBadge } from './BookingStatusBadge'

/** One appointment line; click opens the details. */
export function BookingRow({ booking, onOpen, showDate }: { booking: StaffBooking; onOpen: (b: StaffBooking) => void; showDate?: boolean }) {
  const { isAdmin, scopeArtistId, artists } = useDashboard()
  const artistName = isAdmin && !scopeArtistId ? artists.find((a) => a.id === booking.artistId)?.name : null
  const date = new Date(booking.startsAt).toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Oslo' })
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(booking)}
        className="flex w-full items-center gap-4 rounded-xl border border-line bg-paper px-4 py-3 text-left transition-colors hover:border-olive/60"
      >
        <div className="w-20 shrink-0 tabular-nums sm:w-24">
          {showDate && <p className="text-xs capitalize text-muted">{date}</p>}
          <p className="font-semibold">{formatStudioTime(booking.startsAt)}</p>
          <p className="text-xs text-muted">–{formatStudioTime(booking.endsAt)}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{booking.customerName}</p>
          <p className="truncate text-sm text-muted">
            {booking.serviceName}
            {artistName && ` · ${artistName}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <BookingStatusBadge status={booking.status} />
          {booking.requiresGuardianConsent && !booking.guardianConsentVerifiedAt && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
              <ShieldAlert className="size-3.5" aria-hidden /> Samtykke
            </span>
          )}
        </div>
      </button>
    </li>
  )
}
