import type { ArtistSchedule } from '@/types/booking'
import { addStudioDays, studioDateTime, studioDayOfWeek } from './time'

/**
 * Availability engine. Pure functions so the exact same rules can run in the
 * browser (to show free times) and be mirrored on the server (to re-check them).
 */

export interface Slot {
  startsAt: Date
  endsAt: Date
}

export interface SlotOptions {
  durationMinutes: number
  bufferMinutes: number
  /** Distance between candidate start times. */
  intervalMinutes: number
  /** Earliest bookable instant (now + minimum notice). */
  earliestStart: Date
}

interface Interval {
  start: number
  end: number
}

const MINUTE = 60_000

/** Working windows for one date, after applying exceptions to the weekly schedule. */
export function workingWindows(date: string, schedule: ArtistSchedule): Interval[] {
  const exceptions = schedule.exceptions.filter((e) => e.date === date)
  if (exceptions.some((e) => !e.isAvailable && !e.startTime)) return []

  const custom = exceptions.flatMap((e) =>
    e.isAvailable && e.startTime && e.endTime ? [{ startTime: e.startTime, endTime: e.endTime }] : [],
  )
  const source = custom.length ? custom : schedule.weekly.filter((w) => w.dayOfWeek === studioDayOfWeek(date))

  return source
    .map((w) => ({
      start: studioDateTime(date, w.startTime).getTime(),
      end: studioDateTime(date, w.endTime).getTime(),
    }))
    .filter((w) => w.end > w.start)
    .sort((a, b) => a.start - b.start)
}

/** Intervals a new appointment may not overlap: bookings (padded by buffer) and blocked windows. */
function blockedIntervals(date: string, schedule: ArtistSchedule, bufferMinutes: number): Interval[] {
  const pad = bufferMinutes * MINUTE
  const bookings = schedule.busy.map((b) => ({
    start: new Date(b.startsAt).getTime() - pad,
    end: new Date(b.endsAt).getTime() + pad,
  }))
  const blocks = schedule.exceptions
    .filter((e) => e.date === date && !e.isAvailable && e.startTime && e.endTime)
    .map((e) => ({
      start: studioDateTime(date, e.startTime!).getTime(),
      end: studioDateTime(date, e.endTime!).getTime(),
    }))
  return [...bookings, ...blocks]
}

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end

/**
 * Start times on `date` where the whole appointment fits inside a working
 * window and doesn't touch any booking (including buffer) or blocked time.
 * Candidates step through real elapsed time, so DST changes never create
 * duplicate or skipped slots.
 */
export function slotsForDate(date: string, schedule: ArtistSchedule, opts: SlotOptions): Slot[] {
  const duration = opts.durationMinutes * MINUTE
  const step = opts.intervalMinutes * MINUTE
  const blocked = blockedIntervals(date, schedule, opts.bufferMinutes)
  const earliest = opts.earliestStart.getTime()
  const slots: Slot[] = []

  for (const window of workingWindows(date, schedule)) {
    for (let start = window.start; start + duration <= window.end; start += step) {
      if (start < earliest) continue
      const candidate = { start, end: start + duration }
      if (blocked.some((b) => overlaps(candidate, b))) continue
      slots.push({ startsAt: new Date(start), endsAt: new Date(candidate.end) })
    }
  }
  return slots
}

/** All dates in [from, to] (inclusive, "yyyy-MM-dd") that have at least one free slot. */
export function availableDates(from: string, to: string, schedule: ArtistSchedule, opts: SlotOptions): Set<string> {
  const result = new Set<string>()
  for (let date = from; date <= to; date = addStudioDays(date, 1)) {
    if (slotsForDate(date, schedule, opts).length > 0) result.add(date)
  }
  return result
}

/** True if `startsAt` is one of the offered slots — used to re-validate before submitting. */
export function isSlotAvailable(startsAt: Date, date: string, schedule: ArtistSchedule, opts: SlotOptions): boolean {
  return slotsForDate(date, schedule, opts).some((s) => s.startsAt.getTime() === startsAt.getTime())
}
