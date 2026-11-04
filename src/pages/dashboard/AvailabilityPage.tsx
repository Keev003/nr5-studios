import { useCallback, useEffect, useState } from 'react'
import { Alert, Card, SelectField, Spinner } from '@/components/ui'
import { MonthCalendar } from '@/components/calendar/MonthCalendar'
import { ExceptionsEditor } from '@/components/dashboard/availability/ExceptionsEditor'
import { WeeklyHoursEditor } from '@/components/dashboard/availability/WeeklyHoursEditor'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { useDashboard } from '@/hooks/useDashboard'
import { useToast } from '@/hooks/useToast'
import { workingWindows } from '@/lib/availability'
import { addStudioDays, formatStudioTime, toStudioDate } from '@/lib/time'
import { getWeeklyHours, listExceptions, updateArtist } from '@/services/dashboardApi'
import type { WeeklyHours } from '@/types/booking'
import type { ExceptionRow } from '@/types/dashboard'

const BUFFERS = [0, 15, 30, 45, 60, 90]

export default function AvailabilityPage() {
  const { editArtist, isAdmin, reloadArtists } = useDashboard()
  const toast = useToast()
  const [weekly, setWeekly] = useState<WeeklyHours[] | null>(null)
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [month, setMonth] = useState(toStudioDate(new Date()))
  const [picked, setPicked] = useState<string | null>(null)
  const artistId = editArtist?.id

  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    if (!artistId) return
    let active = true
    Promise.all([getWeeklyHours(artistId), listExceptions(artistId, addStudioDays(toStudioDate(new Date()), -31))]).then(
      ([w, e]) => {
        if (!active) return
        setWeekly(w)
        setExceptions(e)
        setError(null)
      },
      (e: unknown) => active && setError(e instanceof Error ? e.message : String(e)),
    )
    return () => {
      active = false
    }
  }, [artistId, version])

  if (!editArtist) {
    return <Alert tone="info">Denne kontoen er ikke koblet til en artist ennå.</Alert>
  }

  const today = toStudioDate(new Date())
  const schedule = { weekly: weekly ?? [], exceptions, busy: [] }
  const windowsFor = (d: string) => workingWindows(d, schedule)
  const upcoming = exceptions.filter((e) => e.date >= today)

  const setBuffer = async (minutes: number) => {
    try {
      await updateArtist(editArtist.id, { bufferMinutes: minutes })
      await reloadArtists()
      toast.success('Buffer er lagret.')
    } catch {
      toast.error('Kunne ikke lagre buffer.')
    }
  }

  return (
    <>
      <PageHeader
        title="Tilgjengelighet"
        intro={isAdmin ? `Du redigerer ${editArtist.name}. Bytt artist i menyen.` : 'Bestem når kunder kan booke deg.'}
      />
      {error && <Alert tone="error" title="Kunne ikke hente tilgjengelighet" className="mb-6">{error}</Alert>}
      {!weekly && !error ? (
        <Spinner />
      ) : (
        <div className="grid gap-6 2xl:grid-cols-2">
          <div className="space-y-6">
            <WeeklyHoursEditor artistId={editArtist.id} initial={weekly ?? []} onSaved={setWeekly} />
            <Card className="flex flex-wrap items-end justify-between gap-4 p-5 sm:p-6">
              <div className="max-w-sm">
                <h2 className="font-display text-2xl">Buffer mellom avtaler</h2>
                <p className="mt-1 text-sm text-muted">Pause før og etter hver avtale til rydding og forberedelse.</p>
              </div>
              <SelectField label="Buffer" hideLabel value={editArtist.bufferMinutes} onChange={(e) => void setBuffer(Number(e.target.value))} className="w-40">
                {BUFFERS.map((m) => <option key={m} value={m}>{m === 0 ? 'Ingen' : `${m} minutter`}</option>)}
              </SelectField>
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="p-3 sm:p-5">
              <MonthCalendar
                month={month}
                onMonthChange={setMonth}
                selected={picked}
                onSelect={setPicked}
                dayClassName={(d) => {
                  if (d < today) return 'bg-cream'
                  const off = exceptions.some((e) => e.date === d && !e.isAvailable && !e.startTime)
                  if (off) return 'bg-danger-light'
                  const custom = exceptions.some((e) => e.date === d && e.isAvailable)
                  if (custom) return 'bg-olive/25'
                  return windowsFor(d).length ? 'bg-olive-light' : 'bg-paper'
                }}
                dayLabel={(d) => {
                  const w = windowsFor(d)
                  return w.length ? `jobber ${w.map((x) => `${formatStudioTime(new Date(x.start))}–${formatStudioTime(new Date(x.end))}`).join(', ')}` : 'fri'
                }}
                renderDay={(d) => {
                  const w = windowsFor(d)
                  if (d < today || !w.length) return null
                  const first = w[0]!
                  const last = w.at(-1)!
                  return (
                    <span className="hidden text-[11px] leading-4 text-olive-dark tabular-nums sm:block">
                      {formatStudioTime(new Date(first.start)).replace(':00', '')}–{formatStudioTime(new Date(last.end)).replace(':00', '')}
                    </span>
                  )
                }}
              />
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
                <li className="flex items-center gap-1.5"><span className="size-3 rounded bg-olive-light ring-1 ring-line" /> Jobber</li>
                <li className="flex items-center gap-1.5"><span className="size-3 rounded bg-olive/25 ring-1 ring-line" /> Egne tider</li>
                <li className="flex items-center gap-1.5"><span className="size-3 rounded bg-danger-light ring-1 ring-line" /> Fri / ferie</li>
                <li className="flex items-center gap-1.5"><span className="size-3 rounded bg-paper ring-1 ring-line" /> Ikke på jobb</li>
              </ul>
            </Card>
            <ExceptionsEditor artistId={editArtist.id} exceptions={upcoming} onChanged={reload} prefillDate={picked} />
          </div>
        </div>
      )}
    </>
  )
}
