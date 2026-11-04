import type { Dictionary } from '@/i18n/nb'

export interface NavItem {
  label: keyof Dictionary['nav']
  to: string
}

/** Anchor links point at homepage sections so they also work from other pages. */
export const mainNav: NavItem[] = [
  { label: 'home', to: '/' },
  { label: 'artists', to: '/#artister' },
  { label: 'booking', to: '/booking' },
  { label: 'contact', to: '/#kontakt' },
]
