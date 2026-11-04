// @vitest-environment node
import { as, createTestDb, USERS, type TestDb } from './db'

let db: TestDb
beforeEach(async () => {
  db = await createTestDb()
}, 30_000)

describe('tiered cancellation policy settings', () => {
  it('stores the studio’s 48 h / 24 h / 50 % terms under a new policy version', async () => {
    const rows = await as(db, null, async () =>
      (await db.query(`select cancellation_deadline_hours, late_cancellation_hours, late_cancellation_percent, policy_version from studio_settings`)).rows,
    )
    expect(rows).toEqual([{ cancellation_deadline_hours: 48, late_cancellation_hours: 24, late_cancellation_percent: 50, policy_version: '2026-11-04' }])
  })

  it('rejects impossible windows and percentages', async () => {
    await expect(db.query(`update studio_settings set late_cancellation_hours = 72`)).rejects.toThrow(/cancellation_windows/)
    await expect(db.query(`update studio_settings set late_cancellation_percent = 150`)).rejects.toThrow(/check/)
  })

  it('bookings must accept the current terms version', async () => {
    await expect(
      db.query(`select public.create_booking('6f1c2c1e-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001', now() + interval '20 days',
        'Test Testesen','t@example.com','+47 400 00 000','1990-01-01','Arm','En testbeskrivelse her',null,true,'2026-11-01')`),
    ).rejects.toThrow('policy')
  })

  it('only admins can change the terms', async () => {
    const res = await as(db, USERS.shmoky, () => db.query(`update studio_settings set late_cancellation_percent = 0`))
    expect(res.affectedRows).toBe(0)
  })
})
