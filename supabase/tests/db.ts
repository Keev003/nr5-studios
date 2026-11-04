import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const root = join(__dirname, '..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')

/** Fresh database with the Supabase stub, all migrations and the seed applied. */
export async function createTestDb() {
  const db = await PGlite.create({ extensions: { btree_gist, pgcrypto } })
  await db.exec(read('tests/supabase-stub.sql'))
  for (const file of readdirSync(join(root, 'migrations')).sort()) {
    await db.exec(read(join('migrations', file)))
  }
  await db.exec(read('seed.sql'))
  return db
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>

export const USERS = {
  shmoky: 'a0000000-0000-4000-8000-000000000001',
  aj: 'a0000000-0000-4000-8000-000000000002',
  admin: 'a0000000-0000-4000-8000-000000000003',
} as const

export const ARTISTS = {
  shmoky: '6f1c2c1e-0000-4000-8000-000000000001',
  aj: '6f1c2c1e-0000-4000-8000-000000000002',
} as const

export const SERVICES = {
  consultation: 'b0000000-0000-4000-8000-000000000001',
  small: 'b0000000-0000-4000-8000-000000000002',
  halfDay: 'b0000000-0000-4000-8000-000000000003',
} as const

/** Runs `fn` as an API client: anonymous visitor, or a signed-in user id. */
export async function as<T>(db: TestDb, user: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`select set_config('request.jwt.claim.sub', '${user ?? ''}', false)`)
  await db.exec(`set role ${user ? 'authenticated' : 'anon'}`)
  try {
    return await fn()
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`)
  }
}
