import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Camera, KeyRound } from 'lucide-react'
import { Alert, Badge, Button, Card, InputField, TextareaField } from '@/components/ui'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { useDashboard } from '@/hooks/useDashboard'
import { useToast } from '@/hooks/useToast'
import { validateReferenceImage } from '@/lib/validation'
import { changeOwnPassword, updateArtist, uploadArtistPhoto } from '@/services/dashboardApi'

function ArtistProfileForm() {
  const { editArtist, isAdmin, reloadArtists } = useDashboard()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [bioEn, setBioEn] = useState('')
  const [specialties, setSpecialties] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!editArtist) return
    /* eslint-disable react-hooks/set-state-in-effect -- reset the form when another artist is selected */
    setName(editArtist.name)
    setBio(editArtist.bio)
    setBioEn(editArtist.bioEn ?? '')
    setSpecialties(editArtist.specialties.join(', '))
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [editArtist])

  if (!editArtist) return <Alert tone="info">Denne kontoen er ikke koblet til en artist.</Alert>

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateArtist(editArtist.id, {
        name: name.trim(),
        bio: bio.trim(),
        bioEn: bioEn.trim(),
        specialties: specialties.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 6),
      })
      await reloadArtists()
      toast.success('Profilen er lagret.')
    } catch {
      toast.error('Kunne ikke lagre profilen.')
    } finally {
      setSaving(false)
    }
  }

  const uploadPhoto = async (file: File | undefined) => {
    if (!file) return
    const problem = validateReferenceImage(file)
    if (problem || file.size > 5 * 1024 * 1024) {
      toast.error('Bildet må være JPG, PNG eller WebP og maks 5 MB.')
      return
    }
    setUploading(true)
    try {
      const url = await uploadArtistPhoto(editArtist.id, file)
      await updateArtist(editArtist.id, { imageUrl: url })
      await reloadArtists()
      toast.success('Bildet er oppdatert.')
    } catch {
      toast.error('Kunne ikke laste opp bildet.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl">Artistprofil{isAdmin ? ` – ${editArtist.name}` : ''}</h2>
        {!editArtist.active && <Badge tone="warning">Skjult på nettsiden</Badge>}
      </div>
      <p className="mt-1 text-sm text-muted">Dette vises for kunder på nettsiden og i bookingen.</p>

      <div className="mt-6 grid gap-6 md:grid-cols-[180px_1fr]">
        <div>
          <div className="aspect-[4/5] overflow-hidden rounded-xl bg-cream">
            {editArtist.imageUrl && <img src={editArtist.imageUrl} alt={`Portrett av ${editArtist.name}`} className="size-full object-cover" />}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Velg nytt profilbilde" onChange={(e) => { void uploadPhoto(e.target.files?.[0]); e.target.value = '' }} />
          <Button variant="outline" size="sm" className="mt-3 w-full" loading={uploading} onClick={() => fileRef.current?.click()}>
            <Camera className="size-4" aria-hidden /> Bytt bilde
          </Button>
        </div>
        <form onSubmit={save} className="space-y-4">
          <InputField label="Artistnavn" required value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          <TextareaField label="Om meg (norsk)" rows={4} value={bio} maxLength={600} onChange={(e) => setBio(e.target.value)} hint={`${bio.length}/600`} />
          <TextareaField label="About me (English)" rows={4} value={bioEn} maxLength={600} onChange={(e) => setBioEn(e.target.value)} hint="Vises når besøkende har valgt engelsk. Tom = norsk tekst brukes." />
          <InputField label="Stilarter" value={specialties} onChange={(e) => setSpecialties(e.target.value)} hint="Skill med komma, f.eks. Fine line, Botanical, Lettering" />
          <div className="flex justify-end">
            <Button type="submit" loading={saving} disabled={!name.trim()}>Lagre profil</Button>
          </div>
        </form>
      </div>
    </Card>
  )
}

function PasswordForm() {
  const toast = useToast()
  const { profile } = useDashboard()
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [saving, setSaving] = useState(false)
  const tooShort = password.length > 0 && password.length < 10
  const mismatch = repeat.length > 0 && password !== repeat

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await changeOwnPassword(password)
      setPassword('')
      setRepeat('')
      toast.success('Passordet er endret.')
    } catch {
      toast.error('Kunne ikke endre passordet. Prøv et annet passord.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-display text-2xl">Passord</h2>
      <p className="mt-1 text-sm text-muted">For {profile.email}. Har du fått et midlertidig passord, bør du bytte det her.</p>
      <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <input type="text" autoComplete="username" value={profile.email} readOnly hidden />
        <InputField label="Nytt passord" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={tooShort ? 'Minst 10 tegn' : undefined} />
        <InputField label="Gjenta passord" type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} error={mismatch ? 'Passordene er ikke like' : undefined} />
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" variant="secondary" loading={saving} disabled={password.length < 10 || password !== repeat}>
            <KeyRound className="size-4" aria-hidden /> Endre passord
          </Button>
        </div>
      </form>
    </Card>
  )
}

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Min profil" />
      <div className="space-y-6">
        <ArtistProfileForm />
        <PasswordForm />
      </div>
    </>
  )
}
