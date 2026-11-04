import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True when the frontend has been given Supabase credentials. */
export const isSupabaseConfigured = Boolean(url && anonKey)

let client: SupabaseClient | null = null

/**
 * Returns the shared Supabase client. Throws a readable error if the
 * environment variables are missing so the UI can show a setup hint.
 */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase er ikke konfigurert. Kopier .env.example til .env og fyll inn verdiene.')
  }
  client ??= createClient(url!, anonKey!, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
  return client
}
