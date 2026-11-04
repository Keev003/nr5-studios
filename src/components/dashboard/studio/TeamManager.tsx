import { useEffect, useState, type FormEvent } from 'react'
import { Copy, Eye, EyeOff, KeyRound, Lock, Mail, MessageSquare, Share2, Unlock, UserPlus } from 'lucide-react'
import { Alert, Badge, Button, buttonClasses, Card, InputField, Modal, SelectField, Spinner } from '@/components/ui'
import { useDashboard } from '@/hooks/useDashboard'
import { useToast } from '@/hooks/useToast'
import { adminUsers, listTeam, setArtistActive } from '@/services/dashboardApi'
import type { TeamMember } from '@/types/dashboard'
import { generatePassword } from '@/utils/password'

const ERRORS: Record<string, string> = {
  email_taken: 'Det finnes allerede en bruker med denne e-posten.',
  slug_taken: 'Det finnes allerede en artist med dette navnet.',
  invalid_input: 'Sjekk navn og e-post.',
  weak_password: 'Passordet må ha minst 10 tegn.',
  forbidden: 'Bare administratorer kan gjøre dette.',
  cannot_deactivate_self: 'Du kan ikke stenge din egen konto.',
  function_unavailable: 'Brukeradministrasjon er ikke satt opp ennå (Edge Function «admin-users» mangler).',
}
const message = (e: unknown) => ERRORS[e instanceof Error ? e.message : ''] ?? 'Noe gikk galt.'

/** Login details to hand over to a new or reset user. Shown once. */
function Credentials({ email, password }: { email: string; password: string }) {
  const toast = useToast()
  const text = `Innlogging til Nr5 Studios-dashbordet\nAdresse: ${window.location.origin}/login\nE-post: ${email}\nMidlertidig passord: ${password}\n\nBytt passord under «Min profil» etter første innlogging.`
  const body = encodeURIComponent(text)
  // "sms:?&body=" opens the Messages app with the text ready on both iPhone and Android.
  const smsHref = `sms:?&body=${body}`
  const mailHref = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Din innlogging til Nr5 Studios')}&body=${body}`
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const copy = () => void navigator.clipboard.writeText(text).then(() => toast.success('Kopiert.'))
  const share = () => void navigator.share({ title: 'Innlogging til Nr5 Studios', text }).catch(() => {})

  return (
    <div className="space-y-3">
      <pre className="whitespace-pre-wrap rounded-xl bg-cream p-4 font-mono text-sm">{text}</pre>
      <Alert tone="info">
        <p>Del dette direkte med personen. Passordet vises ikke igjen.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={smsHref} className={buttonClasses('primary', 'sm')}>
            <MessageSquare className="size-4" aria-hidden /> Send SMS
          </a>
          <a href={mailHref} className={buttonClasses('outline', 'sm')}>
            <Mail className="size-4" aria-hidden /> Send e-post
          </a>
          {canShare && (
            <Button variant="outline" size="sm" onClick={share}>
              <Share2 className="size-4" aria-hidden /> Del …
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={copy}>
            <Copy className="size-4" aria-hidden /> Kopier
          </Button>
        </div>
      </Alert>
    </div>
  )
}

type RoleChoice = 'artist' | 'admin-artist' | 'admin'

function AddMemberModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<RoleChoice>('artist')
  const [password, setPassword] = useState(generatePassword)
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const close = () => {
    setName('')
    setEmail('')
    setRole('artist')
    setPassword(generatePassword())
    setError(null)
    setDone(false)
    onClose()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await adminUsers({
        action: 'create',
        email,
        fullName: name,
        role: role === 'artist' ? 'artist' : 'admin',
        isArtist: role !== 'admin',
        password,
      })
      setDone(true)
      onCreated()
    } catch (err) {
      setError(message(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title={done ? 'Bruker opprettet' : 'Legg til person'}>
      {done ? (
        <>
          <Credentials email={email} password={password} />
          {role !== 'admin' && (
            <p className="mt-4 text-sm text-muted">
              Artisten er skjult på nettsiden til du trykker «Vis på nettsiden» – gjerne etter at bilde, tekst og arbeidstider er lagt inn.
            </p>
          )}
          <div className="mt-6 flex justify-end">
            <Button onClick={close}>Ferdig</Button>
          </div>
        </>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <InputField label="Navn" required value={name} maxLength={60} onChange={(e) => setName(e.target.value)} hint="Brukes som artistnavn på nettsiden" />
          <InputField label="E-post" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} hint="Brukes til innlogging" />
          <SelectField label="Rolle" value={role} onChange={(e) => setRole(e.target.value as RoleChoice)}>
            <option value="artist">Artist – styrer egen kalender og egne avtaler</option>
            <option value="admin-artist">Artist og administrator – ser alt og kan legge til folk</option>
            <option value="admin">Kun administrator (ikke artist)</option>
          </SelectField>
          <div className="space-y-1.5">
            <label htmlFor="temp-password" className="block text-sm font-medium">Midlertidig passord</label>
            <div className="flex gap-2">
              <input
                id="temp-password"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 font-mono text-sm"
              />
              <Button variant="ghost" onClick={() => setShow((s) => !s)} aria-label={show ? 'Skjul passord' : 'Vis passord'}>
                {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </Button>
              <Button variant="ghost" onClick={() => setPassword(generatePassword())}>Nytt</Button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={close}>Avbryt</Button>
            <Button type="submit" loading={saving} disabled={!name.trim() || !email.trim() || password.length < 10}>
              <UserPlus className="size-4" aria-hidden /> Opprett bruker
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

function ResetPasswordModal({ member, onClose }: { member: TeamMember | null; onClose: () => void }) {
  const toast = useToast()
  const [password, setPassword] = useState(generatePassword)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  const close = () => {
    setPassword(generatePassword())
    setDone(false)
    onClose()
  }

  const confirm = async () => {
    if (!member) return
    setSaving(true)
    try {
      await adminUsers({ action: 'set_password', userId: member.id, password })
      setDone(true)
    } catch (e) {
      toast.error(message(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!member} onClose={close} title={`Nytt passord for ${member?.fullName || member?.email || ''}`} size="sm">
      {member && done ? (
        <>
          <Credentials email={member.email} password={password} />
          <div className="mt-6 flex justify-end"><Button onClick={close}>Ferdig</Button></div>
        </>
      ) : (
        <div className="space-y-4">
          <p className="text-sm">Det gamle passordet slutter å virke med en gang. Personen får dette midlertidige passordet:</p>
          <p className="rounded-xl bg-cream p-3 font-mono">{password}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>Avbryt</Button>
            <Button onClick={confirm} loading={saving}>Sett nytt passord</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export function TeamManager() {
  const toast = useToast()
  const { profile, reloadArtists } = useDashboard()
  const [team, setTeam] = useState<TeamMember[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [resetFor, setResetFor] = useState<TeamMember | null>(null)
  const [version, setVersion] = useState(0)
  const reload = () => setVersion((v) => v + 1)

  useEffect(() => {
    let active = true
    listTeam().then((t) => active && setTeam(t), () => toast.error('Kunne ikke hente teamet.'))
    return () => {
      active = false
    }
  }, [version, toast])

  const toggleVisible = async (m: TeamMember) => {
    if (!m.artist) return
    try {
      await setArtistActive(m.artist.id, !m.artist.active)
      toast.success(m.artist.active ? `${m.artist.name} er skjult på nettsiden.` : `${m.artist.name} vises nå på nettsiden.`)
      reload()
      await reloadArtists()
    } catch {
      toast.error('Kunne ikke endre synlighet.')
    }
  }

  const setAccess = async (m: TeamMember, active: boolean) => {
    if (!active && !window.confirm(`Stenge kontoen til ${m.fullName || m.email}? Personen kan ikke logge inn og skjules fra nettsiden. Bookinger beholdes.`)) return
    try {
      await adminUsers({ action: 'set_active', userId: m.id, active })
      toast.success(active ? 'Kontoen er åpnet igjen.' : 'Kontoen er stengt.')
      reload()
      await reloadArtists()
    } catch (e) {
      toast.error(message(e))
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Team og tilganger</h2>
          <p className="mt-1 text-sm text-muted">Legg til nye artister, gi nytt passord eller steng en konto.</p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <UserPlus className="size-4" aria-hidden /> Legg til person
        </Button>
      </div>

      {!team ? (
        <Spinner />
      ) : (
        <ul className="mt-6 divide-y divide-line">
          {team.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {m.fullName || m.email} {m.id === profile.id && <span className="text-sm font-normal text-muted">(deg)</span>}
                </p>
                <p className="truncate text-sm text-muted">{m.email}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {m.role === 'admin' && <Badge tone="olive">Administrator</Badge>}
                  {m.artist && (
                    <Badge tone={m.artist.active ? 'success' : 'warning'}>{m.artist.active ? 'Vises på nettsiden' : 'Skjult på nettsiden'}</Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {m.artist && (
                  <Button size="sm" variant="outline" onClick={() => toggleVisible(m)}>
                    {m.artist.active ? 'Skjul på nettsiden' : 'Vis på nettsiden'}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setResetFor(m)}>
                  <KeyRound className="size-4" aria-hidden /> Nytt passord
                </Button>
                {m.id !== profile.id && (
                  <>
                    <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-light" onClick={() => setAccess(m, false)}>
                      <Lock className="size-4" aria-hidden /> Steng
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAccess(m, true)} title="Åpne en stengt konto igjen">
                      <Unlock className="size-4" aria-hidden /> Åpne
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddMemberModal
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={() => {
          reload()
          void reloadArtists()
        }}
      />
      <ResetPasswordModal member={resetFor} onClose={() => setResetFor(null)} />
    </Card>
  )
}
