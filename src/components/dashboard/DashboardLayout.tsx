import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CalendarDays, Clock, ExternalLink, LayoutDashboard, LogOut, Menu, Settings, Tag, UserRound, X } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'
import { SelectField } from '@/components/ui'
import { DashboardProvider } from '@/contexts/DashboardContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { useAuth } from '@/hooks/useAuth'
import { useDashboard } from '@/hooks/useDashboard'
import { cn } from '@/utils/cn'

const nav = [
  { to: '/dashboard', label: 'Oversikt', icon: LayoutDashboard, end: true },
  { to: '/dashboard/avtaler', label: 'Avtaler', icon: CalendarDays },
  { to: '/dashboard/tilgjengelighet', label: 'Tilgjengelighet', icon: Clock },
  { to: '/dashboard/tjenester', label: 'Tjenester og priser', icon: Tag },
  { to: '/dashboard/profil', label: 'Min profil', icon: UserRound },
  { to: '/dashboard/studio', label: 'Studio og team', icon: Settings, adminOnly: true },
]

function ArtistScope() {
  const { isAdmin, artists, scopeArtistId, setScopeArtistId } = useDashboard()
  if (!isAdmin) return null
  return (
    <SelectField label="Viser" value={scopeArtistId ?? ''} onChange={(e) => setScopeArtistId(e.target.value || null)}>
      <option value="">Alle artister</option>
      {artists.map((a) => (
        <option key={a.id} value={a.id}>{a.name}{a.active ? '' : ' (skjult)'}</option>
      ))}
    </SelectField>
  )
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, isAdmin } = useDashboard()
  const { signOut } = useAuth()
  return (
    <div className="flex h-full flex-col gap-6 p-5">
      <Logo />
      <ArtistScope />
      <nav aria-label="Dashbordmeny" className="flex-1">
        <ul className="space-y-1">
          {nav.filter((n) => !n.adminOnly || isAdmin).map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                    isActive ? 'bg-olive text-paper' : 'text-ink hover:bg-ink/5',
                  )
                }
              >
                <Icon className="size-4" aria-hidden /> {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="space-y-1 border-t border-line pt-4 text-sm">
        <p className="px-3 font-medium">{profile.fullName || profile.email}</p>
        <p className="px-3 pb-2 text-xs text-muted">{profile.role === 'admin' ? 'Administrator' : 'Artist'}</p>
        <a href="/" target="_blank" rel="noreferrer" className="flex h-10 items-center gap-3 rounded-xl px-3 hover:bg-ink/5">
          <ExternalLink className="size-4" aria-hidden /> Se nettsiden
        </a>
        <button type="button" onClick={() => void signOut()} className="flex h-10 w-full items-center gap-3 rounded-xl px-3 hover:bg-ink/5">
          <LogOut className="size-4" aria-hidden /> Logg ut
        </button>
      </div>
    </div>
  )
}

function Shell() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const current = nav.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
  return (
    <div className="min-h-dvh bg-cream lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-paper lg:block">
        <Sidebar />
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-paper/95 px-4 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Åpne meny" aria-expanded={open} className="flex size-11 items-center justify-center rounded-full hover:bg-ink/5">
          <Menu className="size-6" aria-hidden />
        </button>
        <span className="font-medium">{current?.label}</span>
        <span className="size-11" />
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Meny">
          <button type="button" aria-label="Lukk meny" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="animate-fade-in absolute inset-y-0 left-0 w-[min(85vw,300px)] overflow-y-auto bg-paper shadow-card">
            <button type="button" onClick={() => setOpen(false)} aria-label="Lukk meny" className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full hover:bg-ink/5">
              <X className="size-5" aria-hidden />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main id="main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <Outlet />
      </main>
    </div>
  )
}

export default function DashboardLayout() {
  const { profile } = useAuth()
  return (
    <DashboardProvider profile={profile!}>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </DashboardProvider>
  )
}
