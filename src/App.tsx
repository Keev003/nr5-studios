import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { RouteError } from '@/components/layout/RouteError'
import { Spinner } from '@/components/ui'
import HomePage from '@/pages/HomePage'
import NotFoundPage from '@/pages/NotFoundPage'

// Heavier routes are code-split so the homepage stays light.
const BookingPage = lazy(() => import('@/pages/BookingPage'))
const BookingSuccessPage = lazy(() => import('@/pages/BookingSuccessPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const TermsPage = lazy(() => import('@/pages/TermsPage'))
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'))

// Auth + dashboard (loads Supabase Auth only when needed).
const AuthOutlet = lazy(() => import('@/contexts/AuthOutlet'))
const ProtectedDashboard = lazy(() => import('@/pages/dashboard/ProtectedDashboard'))
const OverviewPage = lazy(() => import('@/pages/dashboard/OverviewPage'))
const AppointmentsPage = lazy(() => import('@/pages/dashboard/AppointmentsPage'))
const AvailabilityPage = lazy(() => import('@/pages/dashboard/AvailabilityPage'))
const ServicesPage = lazy(() => import('@/pages/dashboard/ServicesPage'))
const ProfilePage = lazy(() => import('@/pages/dashboard/ProfilePage'))
const StudioPage = lazy(() => import('@/pages/dashboard/StudioPage'))

const withSuspense = (node: ReactNode) => <Suspense fallback={<Spinner />}>{node}</Suspense>

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/booking', element: withSuspense(<BookingPage />) },
      { path: '/booking/bekreftet/:reference', element: withSuspense(<BookingSuccessPage />) },
      { path: '/vilkar', element: withSuspense(<TermsPage />) },
      { path: '/personvern', element: withSuspense(<PrivacyPage />) },
      {
        element: withSuspense(<AuthOutlet />),
        children: [{ path: '/login', element: withSuspense(<LoginPage />) }],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/dashboard',
    element: withSuspense(<AuthOutlet />),
    errorElement: <RouteError />,
    children: [
      {
        element: withSuspense(<ProtectedDashboard />),
        children: [
          { index: true, element: withSuspense(<OverviewPage />) },
          { path: 'avtaler', element: withSuspense(<AppointmentsPage />) },
          { path: 'tilgjengelighet', element: withSuspense(<AvailabilityPage />) },
          { path: 'tjenester', element: withSuspense(<ServicesPage />) },
          { path: 'profil', element: withSuspense(<ProfilePage />) },
          { path: 'studio', element: withSuspense(<StudioPage />) },
        ],
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
