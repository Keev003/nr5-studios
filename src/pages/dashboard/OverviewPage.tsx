import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, CalendarClock, CheckCircle2, Hourglass, XCircle, type LucideIcon } from 'lucide-react'
import { Alert, Card, Spinner } from '@/components/ui'
import { BookingDetailModal } from '@/components/dashboard/BookingDetailModal'
import { BookingRow } from '@/components/dashboard/BookingRow'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { useDashboard } from '@/hooks/useDashboard'
import { useStaffBookings } from '@/hooks/useStaffBookings'
import { formatStudioDateLong, toStudioDate } from '@/lib/time'
import type { StaffBooking } from '@/types/dashboard'

function StatCard({ icon: Icon, label, value, to, tone }: { icon: LucideIcon; label: string; value: number; to: string; tone: string }) {
  return (
    <Link to={to} className="group last:col-span-2 lg:last:col-span-1">
      <Card className="flex h-full flex-col gap-3 p-4 transition-colors group-hover:border-olive/60 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-full sm:size-11 ${tone}`}>
          <Icon className="size-5" aria-hidden />
        </span>
        <span>
          <span className="block text-2xl font-light tabular-nums sm:text-3xl">{value}</span>
          <span className="block text-sm leading-snug text-muted">{label}</span>
        </span>
      </Card>
    </Link>
  )
}

export default function OverviewPage() {
  const { profile, artists, scopeArtistId, isAdmin } = useDashboard()
  const { bookings, error, patch } = useStaffBookings(31, 365)
  const [open, setOpen] = useState<StaffBooking | null>(null)
  const [now] = useState(() => Date.now())
  const today = toStudioDate(new Date())
  const monthStart = today.slice(0, 8) + '01'

  const groups = useMemo(() => {
    const list = bookings ?? []
    return {
      today: list.filter((b) => toStudioDate(b.startsAt) === today && b.status !== 'cancelled'),
      upcoming: list.filter((b) => new Date(b.startsAt).getTime() > now && (b.status === 'confirmed' || b.status === 'pending')),
      pending: list.filter((b) => b.status === 'pending'),
      completed: list.filter((b) => b.status === 'completed' && toStudioDate(b.startsAt) >= monthStart),
      cancelled: list.filter((b) => (b.status === 'cancelled' || b.status === 'no_show') && toStudioDate(b.startsAt) >= monthStart),
    }
  }, [bookings, today, monthStart, now])

  const scopeName = isAdmin && !scopeArtistId ? 'hele studioet' : artists.find((a) => a.id === scopeArtistId)?.name
  const firstName = profile.fullName.split(' ')[0] || 'der'

  return (
    <>
      <PageHeader title={`Hei, ${firstName}`} intro={<span className="first-letter:uppercase">{formatStudioDateLong(new Date())}{scopeName ? ` · ${scopeName}` : ''}</span>} />
      {error && <Alert tone="error" title="Kunne ikke hente avtaler">{error}</Alert>}
      {!bookings && !error ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-5">
            <StatCard icon={CalendarClock} label="I dag" value={groups.today.length} to="/dashboard/avtaler?vis=idag" tone="bg-ink text-paper" />
            <StatCard icon={CalendarCheck} label="Kommende" value={groups.upcoming.length} to="/dashboard/avtaler?vis=kommende" tone="bg-olive text-paper" />
            <StatCard icon={Hourglass} label="Venter på svar" value={groups.pending.length} to="/dashboard/avtaler?vis=pending" tone="bg-warning-light text-warning" />
            <StatCard icon={CheckCircle2} label="Fullført denne mnd." value={groups.completed.length} to="/dashboard/avtaler?vis=completed" tone="bg-olive-light text-success" />
            <StatCard icon={XCircle} label="Avlyst / ikke møtt denne mnd." value={groups.cancelled.length} to="/dashboard/avtaler?vis=cancelled" tone="bg-danger-light text-danger" />
          </div>

          <div className="mt-10 grid gap-10 xl:grid-cols-2">
            <section aria-labelledby="today-heading">
              <h2 id="today-heading" className="mb-4 font-display text-2xl">I dag</h2>
              {groups.today.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line p-6 text-center text-muted">Ingen avtaler i dag.</p>
              ) : (
                <ul className="space-y-2">{groups.today.map((b) => <BookingRow key={b.id} booking={b} onOpen={setOpen} />)}</ul>
              )}
            </section>
            <section aria-labelledby="pending-heading">
              <h2 id="pending-heading" className="mb-4 font-display text-2xl">Venter på svar</h2>
              {groups.pending.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line p-6 text-center text-muted">Ingen forespørsler venter.</p>
              ) : (
                <ul className="space-y-2">{groups.pending.map((b) => <BookingRow key={b.id} booking={b} onOpen={setOpen} showDate />)}</ul>
              )}
            </section>
            <section aria-labelledby="next-heading" className="xl:col-span-2">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 id="next-heading" className="font-display text-2xl">Neste avtaler</h2>
                <Link to="/dashboard/avtaler" className="text-sm font-medium text-olive hover:underline">Se alle</Link>
              </div>
              {groups.upcoming.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line p-6 text-center text-muted">Ingen kommende avtaler.</p>
              ) : (
                <ul className="space-y-2">{groups.upcoming.slice(0, 6).map((b) => <BookingRow key={b.id} booking={b} onOpen={setOpen} showDate />)}</ul>
              )}
            </section>
          </div>
        </>
      )}
      <BookingDetailModal booking={open && (bookings?.find((b) => b.id === open.id) ?? open)} onClose={() => setOpen(null)} onChanged={patch} />
    </>
  )
}
