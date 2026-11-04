import { useEffect, useMemo, useState } from 'react'
import { Copy, Plus, Trash2 } from 'lucide-react'
import { Alert, Button, Card } from '@/components/ui'
import { useToast } from '@/hooks/useToast'
import { saveWeeklyHours } from '@/services/dashboardApi'
import type { DayOfWeek, WeeklyHours } from '@/types/booking'
import { cn } from '@/utils/cn'
import { validateDay } from './validateDay'

const DAYS: { dow: DayOfWeek; label: string }[] = [
  { dow: 1, label: 'Mandag' },
  { dow: 2, label: 'Tirsdag' },
  { dow: 3, label: 'Onsdag' },
  { dow: 4, label: 'Torsdag' },
  { dow: 5, label: 'Fredag' },
  { dow: 6, label: 'Lørdag' },
  { dow: 0, label: 'Søndag' },
]

const timeInput =
  'h-10 w-[6.5rem] rounded-lg border border-line bg-paper px-2 text-sm tabular-nums focus:border-olive focus:outline-none focus:ring-4 focus:ring-olive/15'

export function WeeklyHoursEditor({ artistId, initial, onSaved }: { artistId: string; initial: WeeklyHours[]; onSaved: (h: WeeklyHours[]) => void }) {
  const toast = useToast()
  const [hours, setHours] = useState<WeeklyHours[]>(initial)
  const [saving, setSaving] = useState(false)

  // Reset when switching artist or after a fresh load.
  useEffect(() => setHours(initial), [initial]) // eslint-disable-line react-hooks/set-state-in-effect

  const dirty = JSON.stringify(hours) !== JSON.stringify(initial)
  const errors = useMemo(
    () => Object.fromEntries(DAYS.map(({ dow }) => [dow, validateDay(hours.filter((h) => h.dayOfWeek === dow))])),
    [hours],
  )
  const hasErrors = Object.values(errors).some(Boolean)

  const forDay = (dow: DayOfWeek) => hours.map((h, i) => ({ h, i })).filter(({ h }) => h.dayOfWeek === dow)
  const update = (index: number, field: 'startTime' | 'endTime', value: string) =>
    setHours((list) => list.map((h, i) => (i === index ? { ...h, [field]: value } : h)))
  const remove = (index: number) => setHours((list) => list.filter((_, i) => i !== index))
  const add = (dow: DayOfWeek) => {
    const existing = forDay(dow).map(({ h }) => h)
    const last = existing.sort((a, b) => a.endTime.localeCompare(b.endTime)).at(-1)
    const start = last ? last.endTime : '10:00'
    const end = last ? (Number(start.slice(0, 2)) + 2).toString().padStart(2, '0') + start.slice(2) : '17:00'
    setHours((list) => [...list, { dayOfWeek: dow, startTime: start, endTime: end > '23:59' ? '23:45' : end }])
  }
  const copyMondayToWeekdays = () => {
    const monday = forDay(1).map(({ h }) => h)
    setHours((list) => [
      ...list.filter((h) => h.dayOfWeek === 0 || h.dayOfWeek === 1 || h.dayOfWeek === 6),
      ...([2, 3, 4, 5] as DayOfWeek[]).flatMap((dow) => monday.map((h) => ({ ...h, dayOfWeek: dow }))),
    ])
  }

  const save = async () => {
    setSaving(true)
    try {
      const sorted = [...hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
      await saveWeeklyHours(artistId, sorted)
      onSaved(sorted)
      toast.success('Ukeplanen er lagret.')
    } catch {
      toast.error('Kunne ikke lagre ukeplanen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Fast ukeplan</h2>
          <p className="mt-1 text-sm text-muted">Når du vanligvis jobber. Kunder kan bare booke innenfor disse tidene.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={copyMondayToWeekdays}>
          <Copy className="size-4" aria-hidden /> Kopier mandag til hverdager
        </Button>
      </div>

      <ul className="divide-y divide-line">
        {DAYS.map(({ dow, label }) => {
          const windows = forDay(dow)
          const working = windows.length > 0
          return (
            <li key={dow} className="grid gap-3 py-4 sm:grid-cols-[160px_1fr]">
              <label className="flex h-10 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="size-5 accent-olive"
                  checked={working}
                  onChange={(e) => (e.target.checked ? add(dow) : setHours((list) => list.filter((h) => h.dayOfWeek !== dow)))}
                />
                <span className={cn('font-medium', !working && 'text-muted')}>{label}</span>
              </label>
              <div className="space-y-2">
                {!working && <p className="flex h-10 items-center text-sm text-muted">Fri</p>}
                {windows.map(({ h, i }) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input type="time" step={900} aria-label={`${label} fra`} className={timeInput} value={h.startTime} onChange={(e) => update(i, 'startTime', e.target.value)} />
                    <span aria-hidden className="text-muted">–</span>
                    <input type="time" step={900} aria-label={`${label} til`} className={timeInput} value={h.endTime} onChange={(e) => update(i, 'endTime', e.target.value)} />
                    <button type="button" onClick={() => remove(i)} aria-label={`Fjern tidsrom ${label} ${h.startTime}–${h.endTime}`} className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-danger-light hover:text-danger">
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                ))}
                {working && (
                  <button type="button" onClick={() => add(dow)} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-olive hover:bg-olive-light">
                    <Plus className="size-4" aria-hidden /> Legg til tidsrom (f.eks. etter lunsj)
                  </button>
                )}
                {errors[dow] && <p role="alert" className="text-xs font-medium text-danger">{errors[dow]}</p>}
              </div>
            </li>
          )
        })}
      </ul>

      {hasErrors && <Alert tone="error" className="mt-2">Rett opp feilene over før du lagrer.</Alert>}
      <div className="mt-4 flex items-center justify-end gap-3">
        {dirty && <span className="text-sm text-warning">Ulagrede endringer</span>}
        <Button variant="ghost" disabled={!dirty || saving} onClick={() => setHours(initial)}>Angre</Button>
        <Button onClick={save} loading={saving} disabled={!dirty || hasErrors}>Lagre ukeplan</Button>
      </div>
    </Card>
  )
}
