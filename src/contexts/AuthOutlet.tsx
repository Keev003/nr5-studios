import { Outlet } from 'react-router-dom'
import { AuthProvider } from './AuthContext'

/** Route element that provides auth to login and dashboard pages (lazy-loaded with Supabase). */
export default function AuthOutlet() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}
