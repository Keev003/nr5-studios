import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { StaffProfile } from '@/contexts/AuthContext'
import { listArtists } from '@/services/dashboardApi'
import type { StaffArtist } from '@/types/dashboard'

export interface DashboardContextValue {
  profile: StaffProfile
  isAdmin: boolean
  /** All artists for admins; just their own for artists (RLS shows active ones too, harmless). */
  artists: StaffArtist[]
  /** Artist whose data is shown. Admins may pick `null` (= all) for bookings. */
  scopeArtistId: string | null
  setScopeArtistId: (id: string | null) => void
  /** Concrete artist to edit on availability/profile pages. */
  editArtist: StaffArtist | null
  reloadArtists: () => Promise<void>
}

// eslint-disable-next-line react-refresh/only-export-components
export const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({ profile, children }: { profile: StaffProfile; children: ReactNode }) {
  const isAdmin = profile.role === 'admin'
  const [allArtists, setAllArtists] = useState<StaffArtist[]>([])
  const [scope, setScope] = useState<string | null>(isAdmin ? null : profile.artistId)

  const reloadArtists = useCallback(async () => {
    setAllArtists(await listArtists())
  }, [])

  useEffect(() => {
    let active = true
    listArtists().then((rows) => active && setAllArtists(rows), () => {})
    return () => {
      active = false
    }
  }, [])

  const artists = useMemo(
    () => (isAdmin ? allArtists : allArtists.filter((a) => a.id === profile.artistId)),
    [allArtists, isAdmin, profile.artistId],
  )
  const editArtist =
    artists.find((a) => a.id === scope) ?? artists.find((a) => a.id === profile.artistId) ?? artists[0] ?? null

  const value = useMemo<DashboardContextValue>(
    () => ({
      profile,
      isAdmin,
      artists,
      scopeArtistId: isAdmin ? scope : profile.artistId,
      setScopeArtistId: (id) => isAdmin && setScope(id),
      editArtist,
      reloadArtists,
    }),
    [profile, isAdmin, artists, scope, editArtist, reloadArtists],
  )
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}
