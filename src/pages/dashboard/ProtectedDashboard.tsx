import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { RequireStaff } from '@/components/dashboard/RequireStaff'

export default function ProtectedDashboard() {
  return (
    <RequireStaff>
      <DashboardLayout />
    </RequireStaff>
  )
}
