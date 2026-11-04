import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LogIn, LogOut } from 'lucide-react'
import { Alert, Button, ButtonLink, Card, Container, InputField, Spinner } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useI18n } from '@/i18n/useI18n'
import { isSupabaseConfigured } from '@/lib/supabase'
import { usePageTitle } from '@/hooks/usePageTitle'

function LoginForm() {
  const { t } = useI18n()
  const { session, profile, loading, signIn, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  if (!isSupabaseConfigured) return <Alert tone="warning">{t.login.notConfigured}</Alert>
  if (loading) return <Spinner />

  // Staff go straight to where they were heading.
  if (session && profile) return <Navigate to={from} replace />
  if (session) {
    return (
      <div className="space-y-4">
        <Alert tone="success">{t.login.signedInAs(profile?.fullName || session.user.email || '')}</Alert>
        <div className="flex flex-wrap gap-3">
          <ButtonLink to="/dashboard">{t.login.toDashboard}</ButtonLink>
          <Button variant="outline" onClick={() => void signOut()}>
            <LogOut className="size-4" aria-hidden /> {t.login.signOut}
          </Button>
        </div>
      </div>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const { ok } = await signIn(email.trim(), password)
    setError(!ok)
    setSubmitting(false)
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {error && <Alert tone="error">{t.login.invalid}</Alert>}
      <InputField label={t.login.email} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <InputField label={t.login.password} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button type="submit" loading={submitting} disabled={!email || !password} className="w-full">
        <LogIn className="size-4" aria-hidden /> {t.login.submit}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  const { t } = useI18n()
  usePageTitle(t.login.title)
  return (
    <Container className="max-w-md py-16 sm:py-24">
      <h1 className="text-3xl font-light">{t.login.title}</h1>
      <p className="mt-2 text-muted">{t.login.intro}</p>
      <Card className="mt-8 p-6 sm:p-8">
        <LoginForm />
      </Card>
    </Container>
  )
}
