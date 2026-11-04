import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

export interface StaffProfile {
  id: string
  fullName: string
  role: 'artist' | 'admin'
  email: string
  artistId: string | null
}

export interface AuthContextValue {
  session: Session | null
  profile: StaffProfile | null
  /** True until the stored session (and profile) has been checked. */
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ ok: boolean }>
  signOut: () => Promise<void>
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null)

async function loadProfile(userId: string): Promise<StaffProfile | null> {
  const supabase = getSupabase()
  const [{ data: profile }, { data: artist }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, email').eq('id', userId).maybeSingle(),
    supabase.from('artists').select('id').eq('profile_id', userId).maybeSingle(),
  ])
  if (!profile) return null
  return {
    id: profile.id as string,
    fullName: profile.full_name as string,
    role: profile.role as StaffProfile['role'],
    email: profile.email as string,
    artistId: (artist?.id as string | undefined) ?? null,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    const supabase = getSupabase()
    let active = true

    const apply = async (next: Session | null) => {
      const nextProfile = next ? await loadProfile(next.user.id) : null
      if (!active) return
      setSession(next)
      setProfile(nextProfile)
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => apply(data.session))
    // Defer profile loading out of the auth callback, as Supabase recommends.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setTimeout(() => void apply(next), 0)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      async signIn(email, password) {
        const { error } = await getSupabase().auth.signInWithPassword({ email, password })
        return { ok: !error }
      },
      async signOut() {
        await getSupabase().auth.signOut()
      },
    }),
    [session, profile, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
