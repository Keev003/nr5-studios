// Admin-only user management for the studio dashboard.
// Runs on Supabase's servers, where the service-role key is available as an
// environment variable; the browser never sees it.
//
// Actions (POST JSON):
//   { action: 'create', email, fullName, role: 'artist' | 'admin', password, isArtist, slug? }
//   { action: 'set_password', userId, password }
//   { action: 'set_active', userId, active }
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const fail = (code: string, status = 400) => json({ error: code }, status)

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const validPassword = (p: unknown): p is string => typeof p === 'string' && p.length >= 10 && p.length <= 72

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail('method_not_allowed', 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // 1. Who is calling? Use their own token, so RLS and is_admin() see them.
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: userData } = await caller.auth.getUser()
  if (!userData.user) return fail('not_signed_in', 401)
  const { data: isAdmin } = await caller.rpc('is_admin')
  if (isAdmin !== true) return fail('forbidden', 403)

  // 2. Only now use the service role.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return fail('invalid_json')
  }

  switch (body.action) {
    case 'create': {
      const email = String(body.email ?? '').trim().toLowerCase()
      const fullName = String(body.fullName ?? '').trim()
      const role = body.role === 'admin' ? 'admin' : 'artist'
      const isArtist = body.isArtist !== false
      if (!EMAIL.test(email) || fullName.length < 1 || fullName.length > 60) return fail('invalid_input')
      if (!validPassword(body.password)) return fail('weak_password')

      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password: body.password,
        email_confirm: true,
        app_metadata: { studio_role: role },
        user_metadata: { full_name: fullName },
      })
      if (error || !created.user) {
        return fail(/already/i.test(error?.message ?? '') ? 'email_taken' : 'create_failed')
      }

      // Create the staff profile here too, instead of relying on the database trigger's timing.
      const { error: profileError } = await admin
        .from('profiles')
        .upsert({ id: created.user.id, email, full_name: fullName, role }, { onConflict: 'id' })
      if (profileError) {
        await admin.auth.admin.deleteUser(created.user.id)
        return fail('create_failed')
      }

      if (isArtist) {
        const slug = slugify(String(body.slug ?? '') || fullName) || `artist-${created.user.id.slice(0, 8)}`
        const { data: last } = await admin.from('artists').select('sort_order').order('sort_order', { ascending: false }).limit(1)
        const { error: artistError } = await admin.from('artists').insert({
          profile_id: created.user.id,
          slug,
          name: fullName,
          sort_order: (last?.[0]?.sort_order ?? 0) + 1,
          // New artists start hidden until they have added a bio, photo and hours.
          active: false,
        })
        if (artistError) {
          // Roll back so we never leave a login without its artist profile.
          await admin.auth.admin.deleteUser(created.user.id)
          return fail(artistError.code === '23505' ? 'slug_taken' : 'create_failed')
        }
      }
      return json({ userId: created.user.id })
    }

    case 'set_password': {
      const userId = String(body.userId ?? '')
      if (!validPassword(body.password)) return fail('weak_password')
      const { error } = await admin.auth.admin.updateUserById(userId, { password: body.password })
      return error ? fail('update_failed') : json({ ok: true })
    }

    case 'set_active': {
      const userId = String(body.userId ?? '')
      const active = body.active === true
      if (userId === userData.user.id && !active) return fail('cannot_deactivate_self')
      // Blocking sign-in is what actually removes access; hiding the artist removes them from the website.
      const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: active ? 'none' : '876000h' })
      if (error) return fail('update_failed')
      await admin.from('artists').update({ active }).eq('profile_id', userId)
      return json({ ok: true })
    }

    default:
      return fail('unknown_action')
  }
})
