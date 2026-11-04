// @vitest-environment node
import { addStudioDays, studioDateTime, studioDayOfWeek, toStudioDate } from '@/lib/time'
import { ARTISTS, as, createTestDb, SERVICES, USERS, type TestDb } from './db'

/** A date at least a week ahead that falls on the given weekday (0 = Sunday). */
function upcoming(dayOfWeek: number, weeksAhead = 1): string {
  let date = addStudioDays(toStudioDate(new Date()), 7 * weeksAhead)
  while (studioDayOfWeek(date) !== dayOfWeek) date = addStudioDays(date, 1)
  return date
}

const monday = upcoming(1)
const wednesday = upcoming(3)
const at = (time: string, date = monday) => studioDateTime(date, time).toISOString()

interface BookingArgs {
  artist?: string
  service?: string
  startsAt?: string
  name?: string
  email?: string
  phone?: string
  dob?: string
  placement?: string
  description?: string
  image?: string | null
  accepted?: boolean
  version?: string
  website?: string | null
}

async function book(db: TestDb, a: BookingArgs = {}) {
  const res = await db.query<{ r: Record<string, unknown> }>(
    'select public.create_booking($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) as r',
    [
      a.artist ?? ARTISTS.shmoky,
      a.service ?? SERVICES.small,
      a.startsAt ?? at('10:00'),
      a.name ?? 'Test Testesen',
      a.email ?? `test-${Math.random().toString(36).slice(2)}@example.com`,
      a.phone ?? '+47 400 00 000',
      a.dob ?? '1990-05-05',
      a.placement ?? 'Venstre underarm',
      a.description ?? 'En liten botanisk linjetegning.',
      a.image ?? null,
      a.accepted ?? true,
      a.version ?? '2026-11-01',
      a.website ?? null,
    ],
  )
  return res.rows[0]!.r
}

const asAnon = <T>(db: TestDb, fn: () => Promise<T>) => as(db, null, fn)

let db: TestDb
beforeEach(async () => {
  db = await createTestDb()
}, 30_000)

describe('public access (anonymous visitor)', () => {
  it('can read the catalogue and settings', async () => {
    await asAnon(db, async () => {
      expect((await db.query('select * from artists')).rows).toHaveLength(2)
      expect((await db.query('select * from services')).rows).toHaveLength(4)
      expect((await db.query('select minimum_age from studio_settings')).rows).toEqual([{ minimum_age: 18 }])
    })
  })

  it('cannot read bookings, raw availability or staff profiles', async () => {
    await book(db)
    await asAnon(db, async () => {
      await expect(db.query('select * from bookings')).rejects.toThrow(/permission denied/)
      await expect(db.query('select * from availability_exceptions')).rejects.toThrow(/permission denied/)
      await expect(db.query('select * from profiles')).rejects.toThrow(/permission denied/)
    })
  })

  it('cannot insert bookings directly, bypassing validation', async () => {
    await asAnon(db, async () => {
      await expect(
        db.query(`insert into bookings (booking_reference, artist_id, service_id, service_name, price_nok, customer_name,
          customer_email, customer_phone, customer_date_of_birth, tattoo_placement, tattoo_description, starts_at, ends_at,
          status, cancellation_policy_accepted_at, cancellation_policy_version)
          values ('X', '${ARTISTS.shmoky}', '${SERVICES.small}', 'x', 0, 'Hacker', 'h@x.no', '12345678', '1990-01-01',
          'arm', 'xxxxxxxxxxxx', now(), now() + interval '1 hour', 'confirmed', now(), 'v')`),
      ).rejects.toThrow(/permission denied/)
    })
  })

  it('gets the schedule with busy times but no booking details or exception reasons', async () => {
    await book(db, { startsAt: at('10:00') })
    const schedule = await asAnon(db, async () => {
      const res = await db.query<{ s: { weekly: unknown[]; busy: Record<string, unknown>[]; exceptions: Record<string, unknown>[] } }>(
        `select public.get_artist_schedule($1, $2::date, $3::date) as s`,
        [ARTISTS.aj, toStudioDate(new Date()), '2027-01-31'],
      )
      return res.rows[0]!.s
    })
    expect(schedule.weekly).toHaveLength(4)
    expect(schedule.exceptions.length).toBeGreaterThan(0)
    expect(Object.keys(schedule.exceptions[0]!)).not.toContain('reason')
  })
})

describe('create_booking', () => {
  it('confirms a valid adult booking and prices it server-side', async () => {
    const r = await asAnon(db, () => book(db))
    expect(r.reference).toMatch(/^NR5-[A-Z2-9]{6}$/)
    expect(r).toMatchObject({ status: 'confirmed', requiresGuardianConsent: false, priceNok: 1500, serviceName: 'Small Piece' })
    expect(new Date(r.endsAt as string).getTime() - new Date(r.startsAt as string).getTime()).toBe(120 * 60_000)
  })

  it('rejects a second booking for the same time (double booking)', async () => {
    await asAnon(db, () => book(db, { startsAt: at('10:00') }))
    await expect(asAnon(db, () => book(db, { startsAt: at('10:00') }))).rejects.toThrow('slot_unavailable')
    await expect(asAnon(db, () => book(db, { startsAt: at('11:00') }))).rejects.toThrow('slot_unavailable')
  })

  it('lets exactly one of two simultaneous requests for the same slot through', async () => {
    const results = await Promise.allSettled([
      asAnon(db, () => book(db, { startsAt: at('13:00') })),
      asAnon(db, () => book(db, { startsAt: at('13:00') })),
    ])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1)
  })

  it('keeps the artist buffer free (Shmoky: 30 min)', async () => {
    await asAnon(db, () => book(db, { startsAt: at('10:00') })) // 10:00–12:00
    await expect(asAnon(db, () => book(db, { startsAt: at('12:00') }))).rejects.toThrow('slot_unavailable')
    await expect(asAnon(db, () => book(db, { startsAt: at('12:30') }))).resolves.toMatchObject({ status: 'confirmed' })
  })

  it.each([
    ['outside working hours', () => at('16:00')], // 2h ends 18:00, Shmoky stops 17:00 on Mondays
    ['on a day off', () => at('12:00', wednesday)],
    ['off the slot grid', () => at('10:10')],
    ['in the past', () => new Date(Date.now() - 86_400_000).toISOString()],
  ])('rejects a start time %s', async (_label, startsAt) => {
    await expect(asAnon(db, () => book(db, { startsAt: startsAt() }))).rejects.toThrow('slot_unavailable')
  })

  it('respects vacation exceptions', async () => {
    await db.exec(`insert into availability_exceptions (artist_id, date, is_available) values ('${ARTISTS.shmoky}', '${monday}', false)`)
    await expect(asAnon(db, () => book(db))).rejects.toThrow('slot_unavailable')
  })

  it('turns under-18 bookings into pending requests that need guardian consent', async () => {
    const dob = `${Number(monday.slice(0, 4)) - 17}-01-01`
    const r = await asAnon(db, () => book(db, { dob }))
    expect(r).toMatchObject({ status: 'pending', requiresGuardianConsent: true })
  })

  it('refuses minors entirely when the studio policy is "reject"', async () => {
    await db.exec(`update studio_settings set minor_policy = 'reject'`)
    const dob = `${Number(monday.slice(0, 4)) - 16}-01-01`
    await expect(asAnon(db, () => book(db, { dob }))).rejects.toThrow('minor_not_permitted')
  })

  it.each([
    ['policy', { accepted: false }],
    ['policy', { version: 'old-version' }],
    ['spam', { website: 'http://spam.example' }],
    ['invalid', { email: 'not-an-email' }],
    ['invalid', { phone: '123' }],
    ['invalid', { description: 'short' }],
    ['invalid', { image: 'uploads/does-not-exist.jpg' }],
    ['not_found', { service: '00000000-0000-0000-0000-000000000000' }],
  ] as const)('rejects with %s for %j', async (code, args) => {
    await expect(asAnon(db, () => book(db, args))).rejects.toThrow(code)
  })

  it('rate-limits repeated bookings from the same email', async () => {
    const email = 'spammy@example.com'
    for (const time of ['10:00', '12:30']) await asAnon(db, () => book(db, { email, startsAt: at(time) }))
    await asAnon(db, () => book(db, { email, startsAt: at('12:00', upcoming(2)) }))
    await expect(asAnon(db, () => book(db, { email, startsAt: at('16:00', upcoming(2)) }))).rejects.toThrow('rate_limited')
  })
})

describe('database-level overlap guarantee', () => {
  it('rejects overlapping active bookings even when inserted directly', async () => {
    await book(db, { startsAt: at('10:00') })
    await expect(
      db.query(`insert into bookings (booking_reference, artist_id, service_id, service_name, price_nok, customer_name,
        customer_email, customer_phone, customer_date_of_birth, tattoo_placement, tattoo_description, starts_at, ends_at,
        status, cancellation_policy_accepted_at, cancellation_policy_version)
        values ('NR5-DIRECT', '${ARTISTS.shmoky}', '${SERVICES.small}', 'x', 0, 'Direkte Test', 'd@example.com', '12345678',
        '1990-01-01', 'arm', 'direkte innsatt booking', '${at('11:00')}', '${at('12:00')}', 'pending', now(), 'v')`),
    ).rejects.toThrow(/bookings_no_overlap/)
  })

  it('frees the slot once a booking is cancelled', async () => {
    const r = await book(db, { startsAt: at('10:00') })
    await db.query(`update bookings set status = 'cancelled' where booking_reference = $1`, [r.reference])
    await expect(book(db, { startsAt: at('10:00') })).resolves.toMatchObject({ status: 'confirmed' })
  })
})

describe('staff access (row level security)', () => {
  beforeEach(async () => {
    await book(db, { artist: ARTISTS.shmoky, startsAt: at('10:00') })
    await book(db, { artist: ARTISTS.aj, startsAt: studioDateTime(upcoming(2), '10:00').toISOString() })
  })

  it('artists only see their own bookings; admins see all', async () => {
    const count = (user: string) => as(db, user, async () => (await db.query('select artist_id from bookings')).rows)
    expect(await count(USERS.shmoky)).toEqual([{ artist_id: ARTISTS.shmoky }])
    expect(await count(USERS.aj)).toEqual([{ artist_id: ARTISTS.aj }])
    expect(await count(USERS.admin)).toHaveLength(2)
  })

  it('artists cannot change other artists’ bookings', async () => {
    const res = await as(db, USERS.shmoky, () =>
      db.query(`update bookings set status = 'cancelled' where artist_id = '${ARTISTS.aj}'`),
    )
    expect(res.affectedRows).toBe(0)
  })

  it('artists can update status but not prices or customer data', async () => {
    await as(db, USERS.shmoky, async () => {
      const res = await db.query(`update bookings set status = 'completed' where artist_id = '${ARTISTS.shmoky}'`)
      expect(res.affectedRows).toBe(1)
      await expect(db.query(`update bookings set price_nok = 0`)).rejects.toThrow(/permission denied/)
      await expect(db.query(`update bookings set customer_email = 'x@y.no'`)).rejects.toThrow(/permission denied/)
    })
  })

  it('enforces valid status transitions', async () => {
    await as(db, USERS.shmoky, async () => {
      await db.query(`update bookings set status = 'completed'`)
      await expect(db.query(`update bookings set status = 'pending'`)).rejects.toThrow(/Ugyldig statusendring/)
    })
  })

  it('cannot confirm an under-age request before guardian consent is verified', async () => {
    const dob = `${Number(monday.slice(0, 4)) - 17}-01-01`
    const r = await book(db, { startsAt: at('13:00'), dob })
    await as(db, USERS.shmoky, async () => {
      const confirm = () => db.query(`update bookings set status = 'confirmed' where booking_reference = $1`, [r.reference])
      await expect(confirm()).rejects.toThrow('guardian_consent_not_verified')
      await db.query(`update bookings set guardian_consent_verified_at = now() where booking_reference = $1`, [r.reference])
      await expect(confirm()).resolves.toMatchObject({ affectedRows: 1 })
    })
  })

  it('artists manage only their own availability', async () => {
    await as(db, USERS.aj, async () => {
      await db.query(`insert into artist_availability (artist_id, day_of_week, start_time, end_time) values ('${ARTISTS.aj}', 0, '10:00', '14:00')`)
      await expect(
        db.query(`insert into artist_availability (artist_id, day_of_week, start_time, end_time) values ('${ARTISTS.shmoky}', 0, '10:00', '14:00')`),
      ).rejects.toThrow(/row-level security/)
    })
  })

  it('a random sign-up gets no staff access', async () => {
    const stranger = 'c0000000-0000-4000-8000-000000000099'
    await db.exec(`insert into auth.users (id, email, raw_app_meta_data) values ('${stranger}', 'x@example.com', '{}')`)
    await as(db, stranger, async () => {
      expect((await db.query('select * from bookings')).rows).toHaveLength(0)
      expect((await db.query(`select public.is_staff() as s`)).rows).toEqual([{ s: false }])
    })
  })
})

describe('reference image storage', () => {
  const path = 'uploads/123e4567-e89b-42d3-a456-426614174000.jpg'

  it('visitors can upload to uploads/ but cannot read anything back', async () => {
    await asAnon(db, async () => {
      await db.query(`insert into storage.objects (bucket_id, name) values ('reference-images', $1)`, [path])
      await expect(db.query(`insert into storage.objects (bucket_id, name) values ('reference-images', 'evil/x.jpg')`)).rejects.toThrow(
        /row-level security/,
      )
      expect((await db.query('select * from storage.objects')).rows).toHaveLength(0)
    })
  })

  it('only the assigned artist and admins can see an attached image', async () => {
    await asAnon(db, () => db.query(`insert into storage.objects (bucket_id, name) values ('reference-images', $1)`, [path]))
    await asAnon(db, () => book(db, { image: path }))
    const visible = (user: string) => as(db, user, async () => (await db.query('select name from storage.objects')).rows.length)
    expect(await visible(USERS.shmoky)).toBe(1)
    expect(await visible(USERS.aj)).toBe(0)
    expect(await visible(USERS.admin)).toBe(1)
    // An image can't be reused by a second booking.
    await expect(asAnon(db, () => book(db, { image: path, startsAt: at('13:00') }))).rejects.toThrow('invalid')
  })
})
