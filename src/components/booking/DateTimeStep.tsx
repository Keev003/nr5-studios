import { useMemo, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { enGB, nb } from 'react-day-picker/locale'
import 'react-day-picker/style.css'
import { CalendarSearch } from 'lucide-react'
import { Alert, Button, Spinner } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useBooking } from '@/hooks/useBooking'
import { useI18n } from '@/i18n/useI18n'
import { formatServiceDuration } from '@/lib/services'
import { availableDates, slotsForDate, type SlotOptions } from '@/lib/availability'
import {
  addStudioDays,
  formatStudioDateLong,
  formatStudioTime,
  STUDIO_TZ,
  studioDateTime,
  toStudioDate,
} from '@/lib/time'
import { bookingRepository } from '@/services/bookingRepository'
import type { Artist, Service, StudioSettings } from '@/types/booking'
import { cn } from '@/utils/cn'
import { BookingNav } from './BookingNav'
import { StepHeading } from './StepHeading'

interface DateTimeStepProps {
  artist: Artist
  service: Service
  settings: StudioSettings
  onBack: () => void
  onNext: () => void
}

/** Calendar date ("yyyy-MM-dd") → a Date at noon studio time, safe for DayPicker. */
const dayFor = (date: string) => studioDateTime(date, '12:00')

export function DateTimeStep({ artist, service, settings, onBack, onNext }: DateTimeStepProps) {
  const { draft, selectTime } = useBooking()
  const { t, lang } = useI18n()
  const [now] = useState(() => Date.now())
  const today = toStudioDate(now)
  const lastDay = addStudioDays(today, settings.bookingHorizonDays)

  const schedule = useAsync(() => bookingRepository.getSchedule(artist.id, today, lastDay), [artist.id, today, lastDay])

  const options = useMemo<SlotOptions>(
    () => ({
      durationMinutes: service.durationMinutes,
      bufferMinutes: artist.bufferMinutes,
      intervalMinutes: settings.slotIntervalMinutes,
      earliestStart: new Date(now + settings.minNoticeHours * 3_600_000),
    }),
    [service.durationMinutes, artist.bufferMinutes, settings.slotIntervalMinutes, settings.minNoticeHours, now],
  )

  const freeDates = useMemo(
    () => (schedule.data ? availableDates(today, lastDay, schedule.data, options) : new Set<string>()),
    [schedule.data, today, lastDay, options],
  )
  const firstFree = useMemo(() => [...freeDates].sort()[0] ?? null, [freeDates])

  const [selectedDate, setSelectedDate] = useState<string | null>(draft.date)
  const [month, setMonth] = useState<Date>(() => dayFor(draft.date ?? today))

  const slots = useMemo(
    () => (schedule.data && selectedDate ? slotsForDate(selectedDate, schedule.data, options) : []),
    [schedule.data, selectedDate, options],
  )

  const chooseDate = (date: string) => {
    setSelectedDate(date)
    setMonth(dayFor(date))
  }

  if (schedule.status === 'loading') return <Spinner label={t.booking.loadingTimes} />
  if (schedule.status === 'error') {
    return (
      <Alert tone="error" title={t.booking.timesError}>
        <p>{schedule.error.message}</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={schedule.reload}>{t.common.tryAgain}</Button>
      </Alert>
    )
  }

  return (
    <>
      <StepHeading title={t.booking.dateTitle}>
        {t.booking.dateIntro(service.name, artist.name, formatServiceDuration(service, lang))}
      </StepHeading>

      {freeDates.size === 0 ? (
        <Alert tone="warning" title={t.booking.noTimesTitle}>
          {t.booking.noTimesText(artist.name, settings.bookingHorizonDays)}
        </Alert>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
          <div>
            <div className="rounded-card border border-line bg-paper p-3 sm:p-5">
              <DayPicker
                mode="single"
                locale={lang === 'en' ? enGB : nb}
                timeZone={STUDIO_TZ}
                month={month}
                onMonthChange={setMonth}
                startMonth={dayFor(today)}
                endMonth={dayFor(lastDay)}
                selected={selectedDate ? dayFor(selectedDate) : undefined}
                onSelect={(day) => day && chooseDate(toStudioDate(day))}
                disabled={(day) => !freeDates.has(toStudioDate(day))}
                modifiers={{ available: (day) => freeDates.has(toStudioDate(day)) }}
                modifiersClassNames={{ available: 'rdp-available' }}
                className="nr5-calendar"
              />
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs text-muted">
              <span aria-hidden className="inline-block size-3 rounded-full bg-olive-light ring-1 ring-olive/40" /> {t.booking.availableDates}
            </p>
            {firstFree && selectedDate !== firstFree && (
              <Button variant="ghost" size="sm" className="mt-2 -ml-3" onClick={() => chooseDate(firstFree)}>
                <CalendarSearch className="size-4" aria-hidden /> {t.booking.firstAvailable(formatStudioDateLong(dayFor(firstFree), lang))}
              </Button>
            )}
          </div>

          <div aria-live="polite">
            {!selectedDate ? (
              <p className="rounded-card border border-dashed border-line p-6 text-center text-muted">
                {t.booking.pickDate}
              </p>
            ) : (
              <>
                <h3 className="mb-4 font-sans text-base font-semibold first-letter:uppercase">
                  {formatStudioDateLong(dayFor(selectedDate), lang)}
                </h3>
                {slots.length === 0 ? (
                  <p className="text-muted">{t.booking.noTimesThatDay}</p>
                ) : (
                  <div role="radiogroup" aria-label={t.booking.startTimes} className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                    {slots.map((slot) => {
                      const iso = slot.startsAt.toISOString()
                      const selected = draft.startsAt === iso
                      return (
                        <button
                          key={iso}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          aria-label={t.booking.timeRange(formatStudioTime(slot.startsAt), formatStudioTime(slot.endsAt))}
                          onClick={() => selectTime(selectedDate, iso)}
                          className={cn(
                            'h-12 rounded-xl border text-sm font-medium tabular-nums transition-colors',
                            selected ? 'border-olive bg-olive text-paper' : 'border-line bg-paper hover:border-olive hover:text-olive',
                          )}
                        >
                          {formatStudioTime(slot.startsAt)}
                        </button>
                      )
                    })}
                  </div>
                )}
                {draft.startsAt && draft.date === selectedDate && (
                  <p className="mt-4 text-sm text-muted">
                    {t.booking.selected} <span className="font-medium text-ink">{formatStudioTime(draft.startsAt)}–{formatStudioTime(new Date(new Date(draft.startsAt).getTime() + service.durationMinutes * 60_000))}</span>
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <BookingNav onBack={onBack} onNext={onNext} nextDisabled={!draft.startsAt} hint={draft.startsAt ? undefined : t.booking.chooseTimeHint} />
    </>
  )
}
