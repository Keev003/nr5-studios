import { ageOn, checkAge } from './age'

describe('ageOn', () => {
  it('counts whole years and handles the birthday itself', () => {
    expect(ageOn('2008-11-10', '2026-11-09')).toBe(17)
    expect(ageOn('2008-11-10', '2026-11-10')).toBe(18)
    expect(ageOn('1990-01-01', '2026-11-09')).toBe(36)
  })

  it('handles leap-day birthdays', () => {
    expect(ageOn('2008-02-29', '2026-02-28')).toBe(17)
    expect(ageOn('2008-02-29', '2026-03-01')).toBe(18)
  })
})

describe('checkAge', () => {
  const policy = { minimumAge: 18, minorPolicy: 'pending_with_guardian_consent' as const }

  it('uses the appointment date, not today', () => {
    // 17 today, but 18 on the appointment day.
    expect(checkAge('2008-11-20', '2026-11-25', policy).kind).toBe('adult')
    expect(checkAge('2008-11-20', '2026-11-19', policy).kind).toBe('requires_guardian_consent')
  })

  it('blocks minors entirely when the studio does not accept guardian consent', () => {
    expect(checkAge('2010-05-05', '2026-11-25', { minimumAge: 18, minorPolicy: 'reject' })).toEqual({
      kind: 'not_permitted',
      age: 16,
    })
  })
})
