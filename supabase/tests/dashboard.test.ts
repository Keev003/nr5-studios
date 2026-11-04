// @vitest-environment node
import { ARTISTS, as, createTestDb, USERS, type TestDb } from './db'

let db: TestDb
beforeEach(async () => {
  db = await createTestDb()
}, 30_000)

const hours = (rows: { dayOfWeek: number; startTime: string; endTime: string }[]) => JSON.stringify(rows)
const setHours = (artist: string, json: string) => db.query(`select public.set_weekly_hours($1, $2::jsonb)`, [artist, json])

describe('set_weekly_hours', () => {
  it('replaces the artist’s own weekly schedule atomically', async () => {
    await as(db, USERS.aj, () =>
      setHours(ARTISTS.aj, hours([
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
        { dayOfWeek: 1, startTime: '13:00', endTime: '17:00' },
      ])),
    )
    const rows = await db.query(`select day_of_week from artist_availability where artist_id = $1`, [ARTISTS.aj])
    expect(rows.rows).toHaveLength(2)
  })

  it('rejects overlapping or reversed windows and leaves the old schedule intact', async () => {
    await expect(
      as(db, USERS.aj, () =>
        setHours(ARTISTS.aj, hours([
          { dayOfWeek: 2, startTime: '10:00', endTime: '14:00' },
          { dayOfWeek: 2, startTime: '13:00', endTime: '16:00' },
        ])),
      ),
    ).rejects.toThrow('overlapping_hours')
    await expect(
      as(db, USERS.aj, () => setHours(ARTISTS.aj, hours([{ dayOfWeek: 2, startTime: '14:00', endTime: '10:00' }]))),
    ).rejects.toThrow('invalid_hours')
    const rows = await db.query(`select 1 from artist_availability where artist_id = $1`, [ARTISTS.aj])
    expect(rows.rows).toHaveLength(4)
  })

  it('does not let an artist change someone else’s schedule, but admins can', async () => {
    await expect(as(db, USERS.aj, () => setHours(ARTISTS.shmoky, '[]'))).rejects.toThrow('forbidden')
    await as(db, USERS.admin, () => setHours(ARTISTS.shmoky, '[]'))
    const rows = await db.query(`select 1 from artist_availability where artist_id = $1`, [ARTISTS.shmoky])
    expect(rows.rows).toHaveLength(0)
  })

  it('is not callable by anonymous visitors', async () => {
    await expect(as(db, null, () => setHours(ARTISTS.aj, '[]'))).rejects.toThrow(/permission denied/)
  })
})

describe('artist profile editing', () => {
  it('artists edit their own bio and buffer but cannot deactivate themselves', async () => {
    await as(db, USERS.aj, async () => {
      const res = await db.query(`update artists set bio = 'Ny bio', buffer_minutes = 45 where id = $1`, [ARTISTS.aj])
      expect(res.affectedRows).toBe(1)
      await expect(db.query(`update artists set active = false where id = $1`, [ARTISTS.aj])).rejects.toThrow('only_admin')
      const other = await db.query(`update artists set bio = 'Hacket' where id = $1`, [ARTISTS.shmoky])
      expect(other.affectedRows).toBe(0)
    })
  })

  it('admins can deactivate an artist, hiding them from the public', async () => {
    await as(db, USERS.admin, () => db.query(`update artists set active = false where id = $1`, [ARTISTS.aj]))
    const visible = await as(db, null, async () => (await db.query('select slug from artists')).rows)
    expect(visible).toEqual([{ slug: 'shmoky' }])
  })
})

describe('artist photos', () => {
  const upload = (name: string) => db.query(`insert into storage.objects (bucket_id, name) values ('artist-photos', $1)`, [name])

  it('artists upload only into their own folder; admins anywhere; visitors never', async () => {
    await as(db, USERS.aj, () => upload(`${ARTISTS.aj}/portrett.jpg`))
    await expect(as(db, USERS.aj, () => upload(`${ARTISTS.shmoky}/portrett.jpg`))).rejects.toThrow(/row-level security/)
    await as(db, USERS.admin, () => upload(`${ARTISTS.shmoky}/portrett.jpg`))
    await expect(as(db, null, () => upload(`${ARTISTS.aj}/x.jpg`))).rejects.toThrow(/row-level security/)
  })
})

describe('cancellation reason', () => {
  it('artists can record why an appointment was cancelled', async () => {
    await db.exec(`insert into bookings (booking_reference, artist_id, service_id, service_name, price_nok, customer_name,
      customer_email, customer_phone, customer_date_of_birth, tattoo_placement, tattoo_description, starts_at, ends_at,
      status, cancellation_policy_accepted_at, cancellation_policy_version)
      values ('NR5-CANCEL', '${ARTISTS.aj}', 'b0000000-0000-4000-8000-000000000001', 'Consultation', 0, 'Test Kunde',
      'k@example.com', '12345678', '1990-01-01', 'arm', 'en testbeskrivelse', now() + interval '3 days',
      now() + interval '3 days 30 minutes', 'confirmed', now(), 'v')`)
    await as(db, USERS.aj, async () => {
      const res = await db.query(`update bookings set status = 'cancelled', cancellation_reason = 'Artisten er syk' where booking_reference = 'NR5-CANCEL'`)
      expect(res.affectedRows).toBe(1)
    })
  })
})

describe('trusted server code', () => {
  it('the SQL editor / service role can still change artist visibility', async () => {
    const res = await db.query(`update artists set active = false where id = $1`, [ARTISTS.aj])
    expect(res.affectedRows).toBe(1)
  })
})

describe('staff profiles for users created through the admin API', () => {
  it('creates the profile when the role is set in a follow-up update (as Supabase does)', async () => {
    const id = 'c0000000-0000-4000-8000-000000000042'
    await db.exec(`insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
      values ('${id}', 'ny@nr5studios.test', '{"provider":"email"}', '{"full_name":"Ny Artist"}')`)
    expect((await db.query(`select 1 from profiles where id = $1`, [id])).rows).toHaveLength(0)

    await db.exec(`update auth.users set raw_app_meta_data = raw_app_meta_data || '{"studio_role":"artist"}' where id = '${id}'`)
    expect((await db.query(`select full_name, role from profiles where id = $1`, [id])).rows).toEqual([{ full_name: 'Ny Artist', role: 'artist' }])
  })
})
