import type { ArtistSchedule } from '@/types/booking'
import { availableDates, isSlotAvailable, slotsForDate, workingWindows } from './availability'
import { formatStudioTime, studioDateTime } from './time'

// Shmoky's example week from the brief. 2026-11-09 is a Monday (winter time, UTC+1).
const shmoky: ArtistSchedule = {
  weekly: [
    { dayOfWeek: 1, startTime: '10:00', endTime: '17:00' },
    { dayOfWeek: 2, startTime: '12:00', endTime: '19:00' },
    { dayOfWeek: 4, startTime: '10:00', endTime: '17:00' },
    { dayOfWeek: 5, startTime: '10:00', endTime: '16:00' },
  ],
  exceptions: [],
  busy: [],
}

const base = { bufferMinutes: 0, intervalMinutes: 30, earliestStart: new Date('2026-01-01T00:00:00Z') }
const times = (date: string, schedule: ArtistSchedule, opts: Partial<typeof base> & { durationMinutes: number }) =>
  slotsForDate(date, schedule, { ...base, ...opts }).map((s) => formatStudioTime(s.startsAt))

describe('slotsForDate', () => {
  it('only offers start times where the whole service fits inside working hours', () => {
    expect(times('2026-11-09', shmoky, { durationMinutes: 240 })).toEqual([
      '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00',
    ])
  })

  it('never overlaps an existing appointment (brief example: 12:00–14:00 booked)', () => {
    const schedule = { ...shmoky, busy: [{ startsAt: '2026-11-09T11:00:00Z', endsAt: '2026-11-09T13:00:00Z' }] }
    expect(times('2026-11-09', schedule, { durationMinutes: 240 })).toEqual([])
    expect(times('2026-11-09', schedule, { durationMinutes: 120 })).toEqual(['10:00', '14:00', '14:30', '15:00'])
  })

  it('keeps the buffer free on both sides of an appointment', () => {
    const schedule = { ...shmoky, busy: [{ startsAt: '2026-11-09T11:00:00Z', endsAt: '2026-11-09T13:00:00Z' }] }
    expect(times('2026-11-09', schedule, { durationMinutes: 120, bufferMinutes: 15 })).toEqual(['14:30', '15:00'])
  })

  it('treats a weekday without hours as unavailable (Wednesday)', () => {
    expect(times('2026-11-11', shmoky, { durationMinutes: 30 })).toEqual([])
  })

  it('removes whole days marked unavailable, e.g. vacation', () => {
    const schedule = { ...shmoky, exceptions: [{ date: '2026-11-09', startTime: null, endTime: null, isAvailable: false }] }
    expect(times('2026-11-09', schedule, { durationMinutes: 30 })).toEqual([])
  })

  it('blocks a partial window on a specific date', () => {
    const schedule = { ...shmoky, exceptions: [{ date: '2026-11-09', startTime: '10:00', endTime: '15:00', isAvailable: false }] }
    expect(times('2026-11-09', schedule, { durationMinutes: 120 })).toEqual(['15:00'])
  })

  it('uses custom hours for a specific date, including normally closed days', () => {
    const schedule = { ...shmoky, exceptions: [{ date: '2026-11-11', startTime: '18:00', endTime: '20:00', isAvailable: true }] }
    expect(times('2026-11-11', schedule, { durationMinutes: 120 })).toEqual(['18:00'])
  })

  it('hides start times before the earliest allowed instant', () => {
    const earliestStart = studioDateTime('2026-11-09', '15:10')
    expect(times('2026-11-09', shmoky, { durationMinutes: 60, earliestStart })).toEqual(['15:30', '16:00'])
  })
})

describe('daylight saving time (Europe/Oslo)', () => {
  it('maps 10:00 to 09:00Z in winter and 08:00Z in summer', () => {
    expect(studioDateTime('2026-03-27', '10:00').toISOString()).toBe('2026-03-27T09:00:00.000Z')
    expect(studioDateTime('2026-03-30', '10:00').toISOString()).toBe('2026-03-30T08:00:00.000Z')
    const [winter] = slotsForDate('2026-03-27', shmoky, { ...base, durationMinutes: 60 })
    const [summer] = slotsForDate('2026-03-30', shmoky, { ...base, durationMinutes: 60 })
    expect(winter?.startsAt.toISOString()).toBe('2026-03-27T09:00:00.000Z')
    expect(summer?.startsAt.toISOString()).toBe('2026-03-30T08:00:00.000Z')
  })

  it('counts real elapsed time across the spring-forward night', () => {
    // 29 March 2026: clocks jump 02:00 → 03:00, so 00:00–06:00 is only 5 real hours.
    const schedule: ArtistSchedule = {
      weekly: [],
      exceptions: [{ date: '2026-03-29', startTime: '00:00', endTime: '06:00', isAvailable: true }],
      busy: [],
    }
    expect(times('2026-03-29', schedule, { durationMinutes: 240 })).toEqual(['00:00', '00:30', '01:00'])
  })

  it('handles the fall-back night without duplicate instants', () => {
    // 25 October 2026: 03:00 → 02:00, so 00:00–06:00 is 7 real hours.
    const schedule: ArtistSchedule = {
      weekly: [],
      exceptions: [{ date: '2026-10-25', startTime: '00:00', endTime: '06:00', isAvailable: true }],
      busy: [],
    }
    const slots = slotsForDate('2026-10-25', schedule, { ...base, durationMinutes: 360 })
    expect(slots).toHaveLength(3)
    expect(new Set(slots.map((s) => s.startsAt.getTime())).size).toBe(3)
  })
})

describe('availableDates', () => {
  it('lists only dates with at least one free slot', () => {
    const dates = availableDates('2026-11-09', '2026-11-15', shmoky, { ...base, durationMinutes: 240 })
    expect([...dates]).toEqual(['2026-11-09', '2026-11-10', '2026-11-12', '2026-11-13'])
  })
})

describe('isSlotAvailable', () => {
  it('rejects a start time that was booked by someone else in the meantime', () => {
    const start = studioDateTime('2026-11-09', '10:00')
    const opts = { ...base, durationMinutes: 120 }
    expect(isSlotAvailable(start, '2026-11-09', shmoky, opts)).toBe(true)
    const taken = { ...shmoky, busy: [{ startsAt: start.toISOString(), endsAt: '2026-11-09T11:00:00Z' }] }
    expect(isSlotAvailable(start, '2026-11-09', taken, opts)).toBe(false)
  })
})

describe('workingWindows', () => {
  it('supports split shifts on the same day', () => {
    const schedule: ArtistSchedule = {
      weekly: [
        { dayOfWeek: 1, startTime: '14:00', endTime: '17:00' },
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
      ],
      exceptions: [],
      busy: [],
    }
    expect(workingWindows('2026-11-09', schedule)).toHaveLength(2)
    expect(times('2026-11-09', schedule, { durationMinutes: 180 })).toEqual(['09:00', '14:00'])
  })
})
