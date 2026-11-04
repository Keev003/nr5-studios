import { useEffect } from 'react'
import { studio } from '@/lib/config'

/** Sets the browser tab title ("Booking – Nr5 Studios"); screen readers announce it on navigation. */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} – ${studio.name}` : `${studio.name} – ${studio.tagline}`
  }, [title])
}
