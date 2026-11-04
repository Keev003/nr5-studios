import { useCallback, useEffect, useState } from 'react'
import { useDashboard } from '@/hooks/useDashboard'
import { addStudioDays, studioDateTime, toStudioDate } from '@/lib/time'
import { listBookings } from '@/services/dashboardApi'
import type { StaffBooking } from '@/types/dashboard'

/** Bookings in the current artist scope, from `daysBack` ago to `daysAhead` ahead. */
export function useStaffBookings(daysBack = 120, daysAhead = 365) {
  const { scopeArtistId } = useDashboard()
  const [bookings, setBookings] = useState<StaffBooking[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    const today = toStudioDate(new Date())
    listBookings({
      artistId: scopeArtistId,
      from: studioDateTime(addStudioDays(today, -daysBack), '00:00').toISOString(),
      to: studioDateTime(addStudioDays(today, daysAhead), '00:00').toISOString(),
    }).then(
      (rows) => {
        if (!active) return
        setBookings(rows)
        setError(null)
      },
      (e: unknown) => active && setError(e instanceof Error ? e.message : String(e)),
    )
    return () => {
      active = false
    }
  }, [scopeArtistId, daysBack, daysAhead, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  /** Replace one booking locally after an update, without refetching everything. */
  const patch = useCallback((id: string, changes: Partial<StaffBooking>) => {
    setBookings((list) => list?.map((b) => (b.id === id ? { ...b, ...changes } : b)) ?? null)
  }, [])

  return { bookings, error, reload, patch }
}
