import { useEffect, useMemo, useState } from 'react'
import { CalendarOff, Clock, Plus, Trash2 } from 'lucide-react'
import { Alert, Button, Card, InputField, SelectField } from '@/components/ui'
import { useToast } from '@/hooks/useToast'
import { addStudioDays, formatStudioDateLong, formatStudioTime, studioDateTime, toStudioDate } from '@/lib/time'
import { addExceptions, deleteException, listBookings } from '@/services/dashboardApi'
import type { ExceptionRow, StaffBooking } from '@/types/dashboard'

type Kind = 'off' | 'block' | 'custom'

const KIND_LABEL: Record<Kind, string> = {
  off: 'Fri / ferie (hele dager)',
  block: 'Blokker et tidsrom',
  custom: 'Egne arbeidstider en dag',
}

const pretty = (date: string) => formatStudioDateLong(studioDateTime(date, '12:00'))

interface Group {
  ids: string[]
  kind: Kind
  from: string
  to: string
  startTime: string | null
  endTime: string | null
  reason: string | null
}

/** Merges consecutive full days off with the same reason into one line ("21.–27. desember"). */
function group(rows: ExceptionRow[]): Group[] {
  const groups: Group[] = []
  for (const r of rows) {
    const kind: Kind = !r.isAvailable && !r.startTime ? 'off' : r.isAvailable ? 'custom' : 'block'
    const last = groups.at(-1)
    if (kind === 'off' && last?.kind === 'off' && last.reason === r.reason && addStudioDays(last.to, 1) === r.date) {
      last.to = r.date
      last.ids.push(r.id)
    } else {
      groups.push({ ids: [r.id], kind, from: r.date, to: r.date, startTime: r.startTime, endTime: r.endTime, reason: r.reason })
    }
  }
  return groups
}

interface Props {
  artistId: string
  exceptions: ExceptionRow[]
  onChanged: () => void
  /** Date chosen in the calendar, used to prefill the form. */
  prefillDate: string | null
}

export function ExceptionsEditor({ artistId, exceptions, onChanged, prefillDate }: Props) {
  const toast = useToast()
  const today = toStudioDate(new Date())
  const [kind, setKind] = useState<Kind>('off')
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [startTime, setStartTime] = useState('12:00')
  const [endTime, setEndTime] = useState('14:00')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [conflicts, setConflicts] = useState<StaffBooking[]>([])

  useEffect(() => {
    if (!prefillDate) return
    setFrom(prefillDate) // eslint-disable-line react-hooks/set-state-in-effect -- syncing with the calendar selection
    setTo(prefillDate)
  }, [prefillDate])

  const lastDay = kind === 'off' ? to : from
  const invalid =
    !from || from < today || (kind === 'off' && (!to || to < from)) || (kind !== 'off' && (!startTime || !endTime || endTime <= startTime))
  const dayCount = kind === 'off' && to >= from ? Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1 : 1

  // Warn about existing appointments that the new exception would cover.
  useEffect(() => {
    if (invalid || kind === 'custom') {
      setConflicts([]) // eslint-disable-line react-hooks/set-state-in-effect -- clearing stale results
      return
    }
    let active = true
    const range =
      kind === 'off'
        ? { from: studioDateTime(from, '00:00').toISOString(), to: studioDateTime(addStudioDays(lastDay, 1), '00:00').toISOString() }
        : { from: studioDateTime(from, startTime).toISOString(), to: studioDateTime(from, endTime).toISOString() }
    listBookings({ artistId, ...range }).then(
      (rows) => active && setConflicts(rows.filter((b) => b.status === 'pending' || b.status === 'confirmed')),
      () => active && setConflicts([]),
    )
    return () => {
      active = false
    }
  }, [artistId, kind, from, lastDay, startTime, endTime, invalid])

  const groups = useMemo(() => group(exceptions), [exceptions])

  const submit = async () => {
    if (dayCount > 366) {
      toast.error('Velg en periode på maks ett år.')
      return
    }
    setSaving(true)
    try {
      const rows =
        kind === 'off'
          ? Array.from({ length: dayCount }, (_, i) => ({
              artistId, date: addStudioDays(from, i), startTime: null, endTime: null, isAvailable: false, reason,
            }))
          : [{ artistId, date: from, startTime, endTime, isAvailable: kind === 'custom', reason }]
      await addExceptions(rows)
      toast.success(kind === 'off' ? `${dayCount === 1 ? 'Fridagen' : `${dayCount} fridager`} er lagt inn.` : 'Lagt til.')
      setReason('')
      onChanged()
    } catch {
      toast.error('Kunne ikke lagre. Sjekk at tidene er gyldige.')
    } finally {
      setSaving(false)
    }
  }

  const removeGroup = async (g: Group) => {
    try {
      await Promise.all(g.ids.map(deleteException))
      toast.success('Fjernet.')
      onChanged()
    } catch {
      toast.error('Kunne ikke fjerne.')
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-display text-2xl">Fravær og unntak</h2>
      <p className="mt-1 text-sm text-muted">Ferie, fridager, lunsj eller en ekstra arbeidsdag. Tips: trykk på en dag i kalenderen for å fylle inn datoen.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <SelectField label="Type" value={kind} onChange={(e) => setKind(e.target.value as Kind)} className="sm:col-span-2">
          {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </SelectField>
        <InputField label={kind === 'off' ? 'Fra og med' : 'Dato'} type="date" min={today} value={from} onChange={(e) => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value) }} />
        {kind === 'off' ? (
          <InputField label="Til og med" type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Fra kl." type="time" step={900} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <InputField label="Til kl." type="time" step={900} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        )}
        <InputField label="Notat (valgfritt, vises ikke for kunder)" className="sm:col-span-2" value={reason} maxLength={100} onChange={(e) => setReason(e.target.value)} placeholder={kind === 'off' ? 'F.eks. ferie' : kind === 'block' ? 'F.eks. tannlege' : 'F.eks. kveldsåpent'} />
      </div>

      {conflicts.length > 0 && (
        <Alert tone="warning" title={`Du har ${conflicts.length} avtale${conflicts.length > 1 ? 'r' : ''} i dette tidsrommet`} className="mt-4">
          <ul className="list-disc pl-5">
            {conflicts.slice(0, 5).map((b) => (
              <li key={b.id}>{pretty(toStudioDate(b.startsAt))} {formatStudioTime(b.startsAt)} – {b.customerName}</li>
            ))}
          </ul>
          <p className="mt-1">De blir ikke avlyst automatisk. Avlys eller flytt dem under «Avtaler» hvis nødvendig.</p>
        </Alert>
      )}

      <div className="mt-4 flex justify-end">
        <Button onClick={submit} loading={saving} disabled={invalid}>
          <Plus className="size-4" aria-hidden /> Legg til
        </Button>
      </div>

      <h3 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-muted">Kommende unntak</h3>
      {groups.length === 0 ? (
        <p className="text-sm text-muted">Ingen registrert.</p>
      ) : (
        <ul className="divide-y divide-line">
          {groups.map((g) => (
            <li key={g.ids[0]} className="flex items-center gap-3 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream">
                {g.kind === 'off' ? <CalendarOff className="size-4 text-danger" aria-hidden /> : <Clock className="size-4 text-olive" aria-hidden />}
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium first-letter:uppercase">
                  {g.from === g.to ? pretty(g.from) : `${pretty(g.from)} – ${pretty(g.to)}`}
                </p>
                <p className="text-muted">
                  {g.kind === 'off' ? 'Fri hele dagen' : g.kind === 'block' ? `Opptatt ${g.startTime}–${g.endTime}` : `Jobber ${g.startTime}–${g.endTime}`}
                  {g.reason && ` · ${g.reason}`}
                </p>
              </div>
              <button type="button" onClick={() => removeGroup(g)} aria-label="Fjern unntak" className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-danger-light hover:text-danger">
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
