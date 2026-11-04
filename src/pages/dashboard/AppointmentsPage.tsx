import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, List, Search } from 'lucide-react'
import { Alert, SelectField, Spinner } from '@/components/ui'
import { MonthCalendar } from '@/components/calendar/MonthCalendar'
import { BookingDetailModal } from '@/components/dashboard/BookingDetailModal'
import { BookingRow } from '@/components/dashboard/BookingRow'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { useStaffBookings } from '@/hooks/useStaffBookings'
import { formatStudioDateLong, formatStudioTime, studioDateTime, toStudioDate } from '@/lib/time'
import type { StaffBooking } from '@/types/dashboard'
import { cn } from '@/utils/cn'

const FILTERS = {
  kommende: 'Kommende',
  idag: 'I dag',
  pending: 'Venter på svar',
  confirmed: 'Bekreftet',
  completed: 'Fullført',
  cancelled: 'Avlyst / ikke møtt',
  alle: 'Alle',
} as const
type Filter = keyof typeof FILTERS

export default function AppointmentsPage() {
  const [params, setParams] = useSearchParams()
  const view = params.get('visning') === 'kalender' ? 'calendar' : 'list'
  const filter = (params.get('vis') as Filter | null) ?? 'kommende'
  const [query, setQuery] = useState('')
  const [month, setMonth] = useState(toStudioDate(new Date()))
  const [day, setDay] = useState<string | null>(toStudioDate(new Date()))
  const [open, setOpen] = useState<StaffBooking | null>(null)
  const [now] = useState(() => Date.now())
  const { bookings, error, patch } = useStaffBookings()

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    next.set(key, value)
    setParams(next, { replace: true })
  }

  const filtered = useMemo(() => {
    const today = toStudioDate(now)
    const q = query.trim().toLowerCase()
    return (bookings ?? []).filter((b) => {
      if (q && !`${b.customerName} ${b.customerEmail} ${b.reference}`.toLowerCase().includes(q)) return false
      switch (filter) {
        case 'kommende': return new Date(b.endsAt).getTime() > now && (b.status === 'pending' || b.status === 'confirmed')
        case 'idag': return toStudioDate(b.startsAt) === today
        case 'cancelled': return b.status === 'cancelled' || b.status === 'no_show'
        case 'alle': return true
        default: return b.status === filter
      }
    })
  }, [bookings, filter, query, now])

  // Past-looking filters read best newest first.
  const ordered = filter === 'completed' || filter === 'cancelled' ? [...filtered].reverse() : filtered

  const byDate = useMemo(() => {
    const map = new Map<string, StaffBooking[]>()
    for (const b of bookings ?? []) {
      if (b.status === 'cancelled') continue
      const d = toStudioDate(b.startsAt)
      map.set(d, [...(map.get(d) ?? []), b])
    }
    return map
  }, [bookings])

  const groupedList = useMemo(() => {
    const groups: { date: string; items: StaffBooking[] }[] = []
    for (const b of ordered) {
      const d = toStudioDate(b.startsAt)
      const last = groups[groups.length - 1]
      if (last?.date === d) last.items.push(b)
      else groups.push({ date: d, items: [b] })
    }
    return groups
  }, [ordered])

  return (
    <>
      <PageHeader
        title="Avtaler"
        actions={
          <div role="tablist" aria-label="Visning" className="inline-flex rounded-full border border-line bg-paper p-1">
            {[
              { id: 'list', label: 'Liste', icon: List },
              { id: 'calendar', label: 'Kalender', icon: CalendarDays },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={view === id}
                onClick={() => set('visning', id === 'calendar' ? 'kalender' : 'liste')}
                className={cn('inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium', view === id ? 'bg-ink text-paper' : 'hover:bg-ink/5')}
              >
                <Icon className="size-4" aria-hidden /> {label}
              </button>
            ))}
          </div>
        }
      />
      {error && <Alert tone="error" title="Kunne ikke hente avtaler">{error}</Alert>}
      {!bookings && !error && <Spinner />}

      {bookings && view === 'list' && (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-[220px_1fr]">
            <SelectField label="Filter" hideLabel value={filter} onChange={(e) => set('vis', e.target.value)}>
              {Object.entries(FILTERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </SelectField>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                type="search"
                aria-label="Søk i avtaler"
                placeholder="Søk på navn, e-post eller referanse"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 w-full rounded-xl border border-line bg-paper pl-10 pr-4 text-sm focus:border-olive focus:outline-none focus:ring-4 focus:ring-olive/15"
              />
            </div>
          </div>
          {groupedList.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">Ingen avtaler her.</p>
          ) : (
            <div className="space-y-8">
              {groupedList.map(({ date, items }) => (
                <section key={date}>
                  <h2 className="mb-3 text-sm font-semibold capitalize text-muted">{formatStudioDateLong(studioDateTime(date, '12:00'))}</h2>
                  <ul className="space-y-2">{items.map((b) => <BookingRow key={b.id} booking={b} onOpen={setOpen} />)}</ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {bookings && view === 'calendar' && (
        <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
          <div className="rounded-card border border-line bg-paper p-3 sm:p-5">
            <MonthCalendar
              month={month}
              onMonthChange={setMonth}
              selected={day}
              onSelect={setDay}
              dayLabel={(d) => {
                const n = byDate.get(d)?.length ?? 0
                return n ? `${n} avtale${n > 1 ? 'r' : ''}` : undefined
              }}
              renderDay={(d) => {
                const items = byDate.get(d) ?? []
                return (
                  <span className="block space-y-0.5">
                    {items.slice(0, 2).map((b) => (
                      <span key={b.id} className={cn('hidden truncate rounded px-1 text-[11px] leading-4 sm:block', b.status === 'pending' ? 'bg-warning-light text-warning' : 'bg-olive-light text-olive-dark')}>
                        {formatStudioTime(b.startsAt)} {b.customerName.split(' ')[0]}
                      </span>
                    ))}
                    {items.length > 0 && (
                      <span className="block text-[11px] font-semibold text-olive sm:hidden">{items.length}</span>
                    )}
                    {items.length > 2 && <span className="hidden text-[11px] text-muted sm:block">+{items.length - 2} til</span>}
                  </span>
                )
              }}
            />
          </div>
          <section aria-live="polite">
            <h2 className="mb-3 font-display text-xl first-letter:uppercase">{day ? formatStudioDateLong(studioDateTime(day, '12:00')) : 'Velg en dag'}</h2>
            {day && (byDate.get(day)?.length ?? 0) === 0 && <p className="text-muted">Ingen avtaler denne dagen.</p>}
            <ul className="space-y-2">{day && byDate.get(day)?.map((b) => <BookingRow key={b.id} booking={b} onOpen={setOpen} />)}</ul>
          </section>
        </div>
      )}

      <BookingDetailModal booking={open && (bookings?.find((b) => b.id === open.id) ?? open)} onClose={() => setOpen(null)} onChanged={patch} />
    </>
  )
}
