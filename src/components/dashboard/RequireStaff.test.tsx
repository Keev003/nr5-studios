import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue, type StaffProfile } from '@/contexts/AuthContext'
import { RequireStaff } from './RequireStaff'

const profile: StaffProfile = { id: 'u1', fullName: 'Shmoky', role: 'artist', email: 's@x.no', artistId: 'a1' }
const session = { user: { id: 'u1', email: 's@x.no' } } as unknown as Session

function renderWith(auth: Partial<AuthContextValue>, child: ReactNode = <p>Hemmelig dashbord</p>) {
  const value: AuthContextValue = { session: null, profile: null, loading: false, signIn: vi.fn(), signOut: vi.fn(), ...auth }
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<RequireStaff>{child}</RequireStaff>} />
          <Route path="/login" element={<p>Innloggingsside</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('RequireStaff (dashboard access)', () => {
  it('sends visitors who are not signed in to the login page', () => {
    renderWith({})
    expect(screen.getByText('Innloggingsside')).toBeInTheDocument()
    expect(screen.queryByText('Hemmelig dashbord')).not.toBeInTheDocument()
  })

  it('blocks signed-in users who are not studio staff', () => {
    renderWith({ session, profile: null })
    expect(screen.getByRole('heading', { name: 'Ingen tilgang' })).toBeInTheDocument()
    expect(screen.queryByText('Hemmelig dashbord')).not.toBeInTheDocument()
  })

  it('lets artists and admins in', () => {
    renderWith({ session, profile })
    expect(screen.getByText('Hemmelig dashbord')).toBeInTheDocument()
  })

  it('shows nothing private while the session is still loading', () => {
    renderWith({ loading: true })
    expect(screen.queryByText('Hemmelig dashbord')).not.toBeInTheDocument()
  })
})
