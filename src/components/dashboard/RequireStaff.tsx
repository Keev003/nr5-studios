import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Button, Container, Spinner } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

/** Lets only signed-in studio staff through; everyone else goes to the login page. */
export function RequireStaff({ children }: { children: ReactNode }) {
  const { session, profile, loading, signOut } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner className="min-h-dvh" />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!profile) {
    return (
      <Container className="max-w-md py-24 text-center">
        <ShieldAlert className="mx-auto size-10 text-danger" aria-hidden />
        <h1 className="mt-4 text-3xl font-light">Ingen tilgang</h1>
        <p className="mt-2 text-muted">Denne kontoen er ikke registrert som artist eller administrator i studioet.</p>
        <Button variant="outline" className="mt-6" onClick={() => void signOut()}>Logg ut</Button>
      </Container>
    )
  }
  return <>{children}</>
}
