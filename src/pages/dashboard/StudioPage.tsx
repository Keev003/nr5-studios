import { Navigate } from 'react-router-dom'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { StudioSettingsForm } from '@/components/dashboard/studio/StudioSettingsForm'
import { TeamManager } from '@/components/dashboard/studio/TeamManager'
import { useDashboard } from '@/hooks/useDashboard'

export default function StudioPage() {
  const { isAdmin } = useDashboard()
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return (
    <>
      <PageHeader title="Studio og team" intro="Kun synlig for administratorer." />
      <div className="space-y-6">
        <TeamManager />
        <StudioSettingsForm />
      </div>
    </>
  )
}
