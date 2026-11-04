import { useMemo, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addStudioDays, studioDayOfWeek, toStudioDate } from '@/lib/time'
import { cn } from '@/utils/cn'

const WEEKDAYS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn']
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember']

interface MonthCalendarProps {
  /** Any "yyyy-MM-dd" inside the month to show. */
  month: string
  onMonthChange: (month: string) => void
  selected?: string | null
  onSelect?: (date: string) => void
  /** Extra content inside each day cell (dots, counts, labels). */
  renderDay?: (date: string) => ReactNode
  /** Extra classes per day (backgrounds for availability etc.). */
  dayClassName?: (date: string) => string | undefined
  /** Accessible description per day, read after the date. */
  dayLabel?: (date: string) => string | undefined
}

/** Monday-first month grid used across the dashboard. Dates are studio-local strings. */
export function MonthCalendar({ month, onMonthChange, selected, onSelect, renderDay, dayClassName, dayLabel }: MonthCalendarProps) {
  const today = toStudioDate(new Date())
  const [y, m] = month.split('-').map(Number) as [number, number]
  const first = `${y}-${String(m).padStart(2, '0')}-01`

  const days = useMemo(() => {
    const offset = (studioDayOfWeek(first) + 6) % 7 // Monday = 0
    const start = addStudioDays(first, -offset)
    return Array.from({ length: 42 }, (_, i) => addStudioDays(start, i))
  }, [first])

  const shift = (delta: number) => {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1))
    onMonthChange(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`)
  }
  const weeks = days.slice(35).every((d) => d.slice(0, 7) !== first.slice(0, 7)) ? days.slice(0, 35) : days

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-xl capitalize">{MONTHS[m - 1]} {y}</h3>
        <div className="flex gap-1">
          <button type="button" onClick={() => shift(-1)} aria-label="Forrige måned" className="flex size-10 items-center justify-center rounded-full hover:bg-ink/5">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button type="button" onClick={() => onMonthChange(today)} className="rounded-full px-3 text-sm font-medium hover:bg-ink/5">I dag</button>
          <button type="button" onClick={() => shift(1)} aria-label="Neste måned" className="flex size-10 items-center justify-center rounded-full hover:bg-ink/5">
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted" aria-hidden>
        {WEEKDAYS.map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.map((date) => {
          const inMonth = date.slice(0, 7) === first.slice(0, 7)
          const day = Number(date.slice(8))
          const label = `${day}. ${MONTHS[Number(date.slice(5, 7)) - 1]}${dayLabel?.(date) ? `, ${dayLabel(date)}` : ''}`
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect?.(date)}
              aria-label={label}
              aria-pressed={selected === date}
              className={cn(
                'flex min-h-14 flex-col items-stretch rounded-lg border p-1 text-left transition-colors sm:min-h-20 sm:p-1.5',
                inMonth ? 'border-line' : 'border-transparent opacity-40',
                selected === date ? 'ring-2 ring-olive' : 'hover:border-olive/50',
                dayClassName?.(date) ?? 'bg-paper',
              )}
            >
              <span className={cn('text-xs font-semibold tabular-nums sm:text-sm', date === today && 'flex size-6 items-center justify-center rounded-full bg-ink text-paper')}>
                {day}
              </span>
              <span className="mt-0.5 min-w-0 flex-1">{renderDay?.(date)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
