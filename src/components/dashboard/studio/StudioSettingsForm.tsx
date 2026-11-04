import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Button, Card, InputField, SelectField, Spinner } from '@/components/ui'
import { useToast } from '@/hooks/useToast'
import { getStudioSettings, saveStudioSettings } from '@/services/dashboardApi'
import type { StudioSettings } from '@/types/booking'

export function StudioSettingsForm() {
  const toast = useToast()
  const [settings, setSettings] = useState<StudioSettings | null>(null)
  const [original, setOriginal] = useState<StudioSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    getStudioSettings().then((s) => {
      if (!active) return
      setSettings(s)
      setOriginal(s)
    }, () => toast.error('Kunne ikke hente innstillingene.'))
    return () => {
      active = false
    }
  }, [toast])

  if (!settings || !original) return <Spinner />
  const set = <K extends keyof StudioSettings>(k: K, v: StudioSettings[K]) => setSettings({ ...settings, [k]: v })
  const num = (k: keyof StudioSettings) => (e: { target: { value: string } }) => set(k, Math.max(0, Math.round(Number(e.target.value))) as never)
  const termsChanged =
    settings.cancellationFeeNok !== original.cancellationFeeNok || settings.cancellationDeadlineHours !== original.cancellationDeadlineHours
  const dirty = JSON.stringify(settings) !== JSON.stringify(original)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await saveStudioSettings(settings)
      setOriginal(settings)
      toast.success('Innstillingene er lagret.')
    } catch {
      toast.error('Kunne ikke lagre. Sjekk verdiene.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-display text-2xl">Bookingregler</h2>
      <p className="mt-1 text-sm text-muted">Gjelder hele studioet. Endringer brukes på nye bookinger med en gang.</p>
      <form onSubmit={save} className="mt-6 space-y-8">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-muted">Avbestilling</legend>
          <InputField label="Gebyr ved sen avbestilling / ikke møtt (kr)" type="number" min={0} step={50} value={settings.cancellationFeeNok} onChange={num('cancellationFeeNok')} />
          <InputField label="Frist for gratis avbestilling (timer før)" type="number" min={0} value={settings.cancellationDeadlineHours} onChange={num('cancellationDeadlineHours')} />
          <InputField label="Versjon av vilkårene" value={settings.policyVersion} onChange={(e) => set('policyVersion', e.target.value)} hint="Lagres med hver booking som bevis på hva kunden godtok" className="sm:col-span-2" />
          {termsChanged && settings.policyVersion === original.policyVersion && (
            <Alert tone="warning" className="sm:col-span-2">
              Du har endret vilkårene. Gi dem en ny versjon (f.eks. dagens dato), så det er tydelig hvilke vilkår nye kunder har godtatt.
            </Alert>
          )}
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-muted">Alder</legend>
          <InputField label="Aldersgrense" type="number" min={0} max={99} value={settings.minimumAge} onChange={num('minimumAge')} />
          <SelectField label="Kunder under aldersgrensen" value={settings.minorPolicy} onChange={(e) => set('minorPolicy', e.target.value as StudioSettings['minorPolicy'])}>
            <option value="pending_with_guardian_consent">Kan sende forespørsel (krever samtykke og godkjenning)</option>
            <option value="reject">Kan ikke booke</option>
          </SelectField>
          <InputField label="Lenke til samtykkeskjema" value={settings.guardianConsentFormUrl} onChange={(e) => set('guardianConsentFormUrl', e.target.value)} className="sm:col-span-2" />
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-muted">Kalender</legend>
          <SelectField label="Starttider hvert" value={settings.slotIntervalMinutes} onChange={(e) => set('slotIntervalMinutes', Number(e.target.value))}>
            {[15, 30, 60].map((m) => <option key={m} value={m}>{m} minutt</option>)}
          </SelectField>
          <InputField label="Minste varsel (timer)" type="number" min={0} value={settings.minNoticeHours} onChange={num('minNoticeHours')} hint="Hvor tidlig kunder senest kan booke" />
          <InputField label="Kan booke inntil (dager frem)" type="number" min={1} max={400} value={settings.bookingHorizonDays} onChange={num('bookingHorizonDays')} />
        </fieldset>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" disabled={!dirty || saving} onClick={() => setSettings(original)}>Angre</Button>
          <Button type="submit" loading={saving} disabled={!dirty}>Lagre bookingregler</Button>
        </div>
      </form>
    </Card>
  )
}
