// @vitest-environment node
import { ARTISTS, as, createTestDb, SERVICES, USERS, type TestDb } from './db'

let db: TestDb
beforeEach(async () => {
  db = await createTestDb()
}, 30_000)

/** Inserts a booking directly (bypassing availability rules, which other tests cover). */
async function insertBooking(status = 'confirmed', artist: string = ARTISTS.shmoky) {
  const res = await db.query<{ id: string }>(`insert into bookings (booking_reference, artist_id, service_id, service_name, price_nok,
      customer_name, customer_email, customer_phone, customer_date_of_birth, tattoo_placement, tattoo_description,
      starts_at, ends_at, status, cancellation_policy_accepted_at, cancellation_policy_version)
    values ('NR5-' || substr(md5(random()::text), 1, 6), '${artist}', '${SERVICES.small}', 'Small Piece', 1500, 'Kari Kunde',
      'kari@example.com', '+47 400 00 000', '1990-01-01', 'Arm', 'En liten testtatovering.',
      now() + interval '5 days', now() + interval '5 days 2 hours', '${status}', now(), '2026-11-01')
    returning id`)
  return res.rows[0]!.id
}

const queue = async (bookingId: string) =>
  (await db.query<{ kind: string; recipient: string; previous_status: string | null; calendar_sequence: number }>(
    `select kind, recipient, previous_status, calendar_sequence from notifications where booking_id = $1 order by created_at, recipient`,
    [bookingId],
  )).rows

describe('notification outbox', () => {
  it('queues a customer and an artist email when a booking is created', async () => {
    const id = await insertBooking()
    expect(await queue(id)).toEqual([
      { kind: 'booking_received', recipient: 'customer', previous_status: null, calendar_sequence: 0 },
      { kind: 'booking_received', recipient: 'artist', previous_status: null, calendar_sequence: 0 },
    ])
  })

  it('queues confirmation and cancellation emails with increasing calendar sequence', async () => {
    const id = await insertBooking('pending')
    await db.query(`update bookings set guardian_consent_verified_at = now(), status = 'confirmed' where id = $1`, [id])
    await db.query(`update bookings set status = 'cancelled' where id = $1`, [id])
    const rows = await queue(id)
    expect(rows.map((r) => `${r.kind}:${r.recipient}:${r.calendar_sequence}`)).toEqual([
      'booking_received:customer:0', 'booking_received:artist:0',
      'booking_confirmed:customer:1', 'booking_confirmed:artist:1',
      'booking_cancelled:customer:2', 'booking_cancelled:artist:2',
    ])
    expect(rows.at(-1)!.previous_status).toBe('confirmed')
  })

  it('does not email anyone for completed or no-show', async () => {
    const id = await insertBooking()
    await db.query(`update bookings set status = 'completed' where id = $1`, [id])
    expect(await queue(id)).toHaveLength(2)
  })

  it('records the customer language from create_booking', async () => {
    let date = new Date(Date.now() + 9 * 86_400_000)
    while (date.getUTCDay() !== 1) date = new Date(date.getTime() + 86_400_000)
    const startsAt = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 11, 0)) // 12:00 or 13:00 Oslo
    await db.query(
      `select public.create_booking($1,$2,$3,'Test Testesen','t@example.com','+47 400 00 000','1990-01-01','Arm','En testbeskrivelse her',null,true,'2026-11-04',null,'en')`,
      [ARTISTS.shmoky, SERVICES.small, startsAt.toISOString()],
    )
    expect((await db.query(`select language from bookings`)).rows).toEqual([{ language: 'en' }])
  })
})

describe('claim_notifications', () => {
  it('hands each due row to exactly one sender and is not callable from the browser', async () => {
    await insertBooking()
    const first = await db.query(`select id from public.claim_notifications(20)`)
    const second = await db.query(`select id from public.claim_notifications(20)`)
    expect(first.rows).toHaveLength(2)
    expect(second.rows).toHaveLength(0) // claimed rows wait 10 minutes before being retried
    await expect(as(db, null, () => db.query(`select public.claim_notifications(20)`))).rejects.toThrow(/permission denied/)
    await expect(as(db, USERS.shmoky, () => db.query(`select public.claim_notifications(20)`))).rejects.toThrow(/permission denied/)
  })

  it('stops retrying after five attempts', async () => {
    await insertBooking()
    await db.exec(`update notifications set attempts = 5, status = 'failed', next_attempt_at = now() - interval '1 minute'`)
    expect((await db.query(`select id from public.claim_notifications(20)`)).rows).toHaveLength(0)
  })
})

describe('notification access for staff', () => {
  it('artists see delivery status only for their own bookings and can requeue them', async () => {
    const mine = await insertBooking('confirmed', ARTISTS.shmoky)
    const theirs = await insertBooking('confirmed', ARTISTS.aj)
    await db.exec(`update notifications set status = 'failed', attempts = 5, last_error = 'boom'`)

    await as(db, USERS.shmoky, async () => {
      const visible = await db.query<{ booking_id: string }>(`select booking_id from notifications`)
      expect(new Set(visible.rows.map((r) => r.booking_id))).toEqual(new Set([mine]))

      const own = await db.query<{ id: string }>(`select id from notifications where booking_id = $1 limit 1`, [mine])
      await db.query(`select public.requeue_notification($1)`, [own.rows[0]!.id])
    })
    const other = await db.query<{ id: string }>(`select id from notifications where booking_id = $1 limit 1`, [theirs])
    await expect(as(db, USERS.shmoky, () => db.query(`select public.requeue_notification($1)`, [other.rows[0]!.id]))).rejects.toThrow('forbidden')
    expect((await db.query(`select count(*)::int as n from notifications where status = 'pending'`)).rows).toEqual([{ n: 1 }])
  })

  it('visitors cannot read the outbox', async () => {
    await insertBooking()
    await expect(as(db, null, () => db.query(`select * from notifications`))).rejects.toThrow(/permission denied/)
  })
})
