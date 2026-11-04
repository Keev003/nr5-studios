import { useEffect, useState } from 'react'
import type { Artist, StudioSettings } from '@/types/booking'

/**
 * Live artists/settings for public pages that render before the booking
 * code is loaded. The data layer is imported lazily to keep the homepage light;
 * callers fall back to static content until (or unless) data arrives.
 */
export function usePublicArtists(): Artist[] | null {
  const [artists, setArtists] = useState<Artist[] | null>(null)
  useEffect(() => {
    let active = true
    import('@/services/bookingRepository')
      .then(({ bookingRepository }) => bookingRepository.listArtists())
      .then((rows) => active && setArtists(rows))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])
  return artists
}

export function usePublicSettings(): StudioSettings | null {
  const [settings, setSettings] = useState<StudioSettings | null>(null)
  useEffect(() => {
    let active = true
    import('@/services/bookingRepository')
      .then(({ bookingRepository }) => bookingRepository.getSettings())
      .then((s) => active && setSettings(s))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])
  return settings
}
