import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Alert, Button, Card, InputField, SelectField, Spinner, TextareaField } from '@/components/ui'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { useToast } from '@/hooks/useToast'
import { formatDuration } from '@/lib/time'
import { listAllServices, saveService } from '@/services/dashboardApi'
import type { ServiceRow } from '@/types/dashboard'

const DURATIONS = Array.from({ length: 48 }, (_, i) => (i + 1) * 15)

const slugify = (s: string) =>
  s.toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

function ServiceEditor({ service, onSaved }: { service: ServiceRow | Omit<ServiceRow, 'id'>; onSaved: () => void }) {
  const toast = useToast()
  const [draft, setDraft] = useState(service)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(service)
  const isNew = !('id' in service)
  const invalid = !draft.name.trim() || draft.priceNok < 0 || !Number.isFinite(draft.priceNok)
  const set = <K extends keyof ServiceRow>(key: K, value: ServiceRow[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const save = async () => {
    setSaving(true)
    try {
      await saveService({ ...draft, slug: isNew ? slugify(draft.name) : draft.slug })
      toast.success(`«${draft.name}» er lagret.`)
      onSaved()
    } catch {
      toast.error('Kunne ikke lagre tjenesten. Finnes navnet allerede?')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Navn (vises på engelsk)" value={draft.name} onChange={(e) => set('name', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Pris (kr)" type="number" inputMode="numeric" min={0} step={50} value={draft.priceNok} onChange={(e) => set('priceNok', Math.max(0, Math.round(Number(e.target.value))))} hint="0 = gratis" />
          <SelectField label="Varighet" value={draft.durationMinutes} onChange={(e) => set('durationMinutes', Number(e.target.value))}>
            {DURATIONS.map((m) => <option key={m} value={m}>{formatDuration(m)}</option>)}
          </SelectField>
        </div>
        <TextareaField label="Beskrivelse (vises på engelsk)" rows={2} className="sm:col-span-2" value={draft.description} onChange={(e) => set('description', e.target.value)} />
        <InputField label="Visningstekst for varighet (valgfritt)" placeholder="F.eks. 1–2 timer" value={draft.durationLabel ?? ''} onChange={(e) => set('durationLabel', e.target.value || null)} hint="Erstatter den beregnede varigheten på nettsiden" />
        <label className="flex items-center gap-3 self-end pb-3">
          <input type="checkbox" className="size-5 accent-olive" checked={draft.active} onChange={(e) => set('active', e.target.checked)} />
          <span className="text-sm font-medium">Kan bookes på nettsiden</span>
        </label>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {dirty && !isNew && <span className="text-sm text-warning">Ulagrede endringer</span>}
        {!isNew && <Button variant="ghost" disabled={!dirty || saving} onClick={() => setDraft(service)}>Angre</Button>}
        <Button onClick={save} loading={saving} disabled={(!dirty && !isNew) || invalid}>{isNew ? 'Opprett tjeneste' : 'Lagre'}</Button>
      </div>
    </Card>
  )
}

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    listAllServices().then(
      (rows) => active && setServices(rows),
      (e: unknown) => active && setError(e instanceof Error ? e.message : String(e)),
    )
    return () => {
      active = false
    }
  }, [version])

  const reload = () => {
    setAdding(false)
    setVersion((v) => v + 1)
  }

  return (
    <>
      <PageHeader
        title="Tjenester og priser"
        intro="Endringer vises på nettsiden med en gang. Bookinger som allerede er gjort, beholder prisen de ble booket med."
        actions={!adding && <Button onClick={() => setAdding(true)}><Plus className="size-4" aria-hidden /> Ny tjeneste</Button>}
      />
      {error && <Alert tone="error">{error}</Alert>}
      {!services && !error && <Spinner />}
      <div className="space-y-4">
        {adding && (
          <ServiceEditor
            service={{ slug: '', name: '', description: '', priceNok: 0, durationMinutes: 60, durationLabel: null, sortOrder: (services?.length ?? 0) + 1, active: true }}
            onSaved={reload}
          />
        )}
        {services?.map((s) => <ServiceEditor key={`${s.id}-${version}`} service={s} onSaved={reload} />)}
      </div>
    </>
  )
}
