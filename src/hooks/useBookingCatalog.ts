import { bookingRepository } from '@/services/bookingRepository'
import type { Artist, Service, StudioSettings } from '@/types/booking'
import { useAsync } from './useAsync'

export interface BookingCatalog {
  artists: Artist[]
  services: Service[]
  settings: StudioSettings
}

/** Artists, services and studio settings needed by every booking step. */
export function useBookingCatalog() {
  return useAsync<BookingCatalog>(async () => {
    const [artists, services, settings] = await Promise.all([
      bookingRepository.listArtists(),
      bookingRepository.listServices(),
      bookingRepository.getSettings(),
    ])
    return { artists, services, settings }
  }, [])
}
