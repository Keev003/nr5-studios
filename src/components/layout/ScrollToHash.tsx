import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Scrolls to `#anchor` targets after navigation, or to the top on page change. */
export function ScrollToHash() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        el.scrollIntoView()
        return
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}
