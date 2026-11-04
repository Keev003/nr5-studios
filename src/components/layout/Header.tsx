import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { ButtonLink, Container } from '@/components/ui'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/utils/cn'
import { LanguageToggle } from './LanguageToggle'
import { Logo } from './Logo'
import { mainNav } from './navigation'

export function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const { t } = useI18n()

  // Close the mobile menu whenever the route (or hash) changes, without an effect.
  const routeKey = location.pathname + location.hash
  const [lastRouteKey, setLastRouteKey] = useState(routeKey)
  if (routeKey !== lastRouteKey) {
    setLastRouteKey(routeKey)
    setOpen(false)
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Hash links (/#artister) count as current only when that section was navigated to.
  const isCurrent = (to: string) => {
    const [path, hash] = to.split('#')
    return location.pathname === path && location.hash === (hash ? `#${hash}` : '')
  }

  // On the homepage the header floats transparently over the hero image until the user scrolls.
  const overlay = location.pathname === '/' && !scrolled && !open

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-colors duration-300',
        overlay ? 'border-transparent bg-transparent' : 'border-line bg-cream/95 backdrop-blur',
      )}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        {t.common.skipToContent}
      </a>
      <Container className="flex h-16 items-center justify-between sm:h-20">
        <Logo inverted={overlay} />
        <nav aria-label={t.nav.mainMenu} className="hidden md:block">
          <ul className="flex items-center gap-8">
            {mainNav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end
                  aria-current={isCurrent(item.to) ? 'page' : undefined}
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-olive',
                    isCurrent(item.to) ? (overlay ? 'text-olive-light' : 'text-olive') : overlay ? 'text-paper' : 'text-ink',
                  )}
                >
                  {t.nav[item.label]}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageToggle inverted={overlay} />
          <ButtonLink to="/booking" size="sm" className="hidden sm:inline-flex">
            {t.common.bookTime}
          </ButtonLink>
          <button
            type="button"
            className={cn('flex size-11 items-center justify-center rounded-full md:hidden', overlay ? 'text-paper hover:bg-paper/10' : 'hover:bg-ink/5')}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
          </button>
        </div>
      </Container>
      {open && (
        <nav id="mobile-menu" aria-label={t.nav.mobileMenu} className="animate-fade-in border-t border-line md:hidden">
          <Container className="py-4">
            <ul className="space-y-1">
              {mainNav.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className="block rounded-xl px-3 py-3 text-lg font-medium hover:bg-ink/5">
                    {t.nav[item.label]}
                  </NavLink>
                </li>
              ))}
            </ul>
            <ButtonLink to="/booking" size="lg" className="mt-4 w-full">
              {t.common.bookTime}
            </ButtonLink>
          </Container>
        </nav>
      )}
    </header>
  )
}
