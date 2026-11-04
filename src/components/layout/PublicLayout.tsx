import { Outlet } from 'react-router-dom'
import { Footer } from './Footer'
import { Header } from './Header'
import { ScrollToHash } from './ScrollToHash'

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToHash />
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
