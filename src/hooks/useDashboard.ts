import { useContext } from 'react'
import { DashboardContext } from '@/contexts/DashboardContext'

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used inside <DashboardProvider>')
  return ctx
}
