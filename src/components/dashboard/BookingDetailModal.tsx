import { useEffect, useState, type ReactNode } from 'react'
import { Ban, CheckCircle2, ExternalLink, ShieldCheck, UserX } from 'lucide-react'
import { Alert, Button, Modal, TextareaField } from '@/components/ui'
import { useDashboard } from '@/hooks/useDashboard'
import { useToast } from '@/hooks/useToast'
import { ageOn } from '@/lib/age'
import { formatPrice, formatStudioDateLong, formatStudioTime, toStudioDate } from '@/lib/time'
import { referenceImageUrl, setBookingStatus, verifyGuardianConsent } from '@/services/dashboardApi'
import type { BookingStatus } from '@/types/booking'
import type { StaffBooking } from '@/types/dashboard'
import { BookingStatusBadge } from './BookingStatusBadge'
import { NotificationStatus } from './NotificationStatus'
import { STATUS_LABEL } from './bookingStatus'

interface Props {
  booking: StaffBooking | null
  onClose: () => void
  onChanged: (id: string, changes: Partial<StaffBooking>) => void
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('nb-NO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Oslo' })

export function BookingDetailModal({ booking, onClose, onChanged }: Props) {
  const toast = useToast()
  const { artists } = useDashboard()
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const [now] = useState(() => Date.now())

  const path = booking?.referenceImagePath
  useEffect(() => {
    if (!path) return
    let active = true
    referenceImageUrl(path).then(
      (url) => active && setImageUrl(url),
      () => active && setImageUrl(null),
    )
    return () => {
      active = false
      setImageUrl(null)
    }
  }, [path])

  if (!booking) return <Modal open={false} onClose={onClose} title="">{null}</Modal>

  const b = booking
  const age = ageOn(b.customerDateOfBirth, toStudioDate(b.startsAt))
  const consentMissing = b.requiresGuardianConsent && !b.guardianConsentVerifiedAt
  const past = new Date(b.startsAt).getTime() < now

  const change = async (status: BookingStatus, extra: Partial<StaffBooking> = {}) => {
    setBusy(true)
    try {
      await setBookingStatus(b.id, status, status === 'cancelled' ? reason : undefined)
      onChanged(b.id, { status, ...extra })
      toast.success(`Avtalen er markert som «${STATUS_LABEL[status].toLowerCase()}».`)
      setCancelling(false)
      setReason('')
    } catch (e) {
      toast.error(e instanceof Error && e.message === 'guardian_consent_not_verified' ? 'Registrer samtykke før du bekrefter.' : 'Kunne ikke oppdatere avtalen.')
    } finally {
      setBusy(false)
    }
  }

  const markConsent = async () => {
    setBusy(true)
    try {
      await verifyGuardianConsent(b.id)
      onChanged(b.id, { guardianConsentVerifiedAt: new Date().toISOString() })
      toast.success('Samtykke er registrert.')
    } catch {
      toast.error('Kunne ikke registrere samtykke.')
    } finally {
      setBusy(false)
    }
  }

  const footer = cancelling ? (
    <>
      <Button variant="ghost" onClick={() => setCancelling(false)} disabled={busy}>Tilbake</Button>
      <Button variant="danger" loading={busy} onClick={() => change('cancelled', { cancellationReason: reason || null })}>
        <Ban className="size-4" aria-hidden /> Avlys avtalen
      </Button>
    </>
  ) : (
    <>
      {(b.status === 'pending' || b.status === 'confirmed') && (
        <Button variant="ghost" className="text-danger hover:bg-danger-light" onClick={() => setCancelling(true)} disabled={busy}>
          <Ban className="size-4" aria-hidden /> Avlys
        </Button>
      )}
      {b.status === 'confirmed' && (
        <>
          <Button variant="outline" onClick={() => change('no_show')} loading={busy} disabled={!past} title={past ? undefined : 'Kan markeres etter starttidspunktet'}>
            <UserX className="size-4" aria-hidden /> Ikke møtt
          </Button>
          <Button variant="secondary" onClick={() => change('completed')} loading={busy} disabled={!past} title={past ? undefined : 'Kan markeres etter starttidspunktet'}>
            <CheckCircle2 className="size-4" aria-hidden /> Fullført
          </Button>
        </>
      )}
      {b.status === 'pending' && (
        <Button onClick={() => change('confirmed')} loading={busy} disabled={consentMissing}>
          <CheckCircle2 className="size-4" aria-hidden /> Bekreft avtalen
        </Button>
      )}
    </>
  )

  return (
    <Modal open onClose={onClose} title={b.customerName} footer={footer} size="lg">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <BookingStatusBadge status={b.status} />
        <span className="font-mono text-sm text-muted">{b.reference}</span>
      </div>

      {cancelling ? (
        <div className="space-y-4">
          <Alert tone="warning" title="Avlyse avtalen?">
            Tidspunktet blir ledig for nye bookinger. Dette kan ikke angres.
          </Alert>
          <TextareaField label="Begrunnelse (valgfritt)" hint="Kan vises til kunden" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </div>
      ) : (
        <>
          {consentMissing && (
            <Alert tone="warning" title={`Kunden er ${age} år – samtykke fra foresatte kreves`} className="mb-4">
              <p>Avtalen kan ikke bekreftes før signert samtykke er mottatt og kontrollert, og studioet har vurdert at timen er forsvarlig.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={markConsent} loading={busy}>
                <ShieldCheck className="size-4" aria-hidden /> Samtykke er mottatt og kontrollert
              </Button>
            </Alert>
          )}
          <dl className="divide-y divide-line">
            <Row label="Tidspunkt">
              <span className="first-letter:uppercase">{formatStudioDateLong(b.startsAt)}</span>, {formatStudioTime(b.startsAt)}–{formatStudioTime(b.endsAt)}
            </Row>
            <Row label="Tjeneste">{b.serviceName} · {formatPrice(b.priceNok)} (estimat)</Row>
            {artists.length > 1 && <Row label="Artist">{artists.find((a) => a.id === b.artistId)?.name}</Row>}
            <Row label="E-post"><a href={`mailto:${b.customerEmail}`} className="text-olive underline">{b.customerEmail}</a></Row>
            <Row label="Telefon"><a href={`tel:${b.customerPhone.replace(/\s/g, '')}`} className="text-olive underline">{b.customerPhone}</a></Row>
            <Row label="Alder på timedato">{age} år</Row>
            <Row label="Plassering">{b.tattooPlacement}</Row>
            <Row label="Beskrivelse"><span className="whitespace-pre-line">{b.tattooDescription}</span></Row>
            <Row label="Referansebilde">
              {!b.referenceImagePath ? (
                <span className="text-muted">Ingen</span>
              ) : imageUrl ? (
                <a href={imageUrl} target="_blank" rel="noreferrer" className="group inline-block">
                  <img src={imageUrl} alt={`Referansebilde fra ${b.customerName}`} className="max-h-64 rounded-lg border border-line object-contain" />
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-olive group-hover:underline">
                    <ExternalLink className="size-3" aria-hidden /> Åpne i full størrelse
                  </span>
                </a>
              ) : (
                <span className="text-muted">Laster…</span>
              )}
            </Row>
            {b.requiresGuardianConsent && (
              <Row label="Foresattes samtykke">
                {b.guardianConsentVerifiedAt ? `Registrert ${dateTime(b.guardianConsentVerifiedAt)}` : 'Ikke registrert'}
              </Row>
            )}
            <Row label="Avbestillingsvilkår">Akseptert {dateTime(b.cancellationPolicyAcceptedAt)} (versjon {b.cancellationPolicyVersion})</Row>
            {b.cancellationReason && <Row label="Avlysningsgrunn">{b.cancellationReason}</Row>}
            <Row label="Booket">{dateTime(b.createdAt)}</Row>
            <Row label="E-post">
              <NotificationStatus bookingId={b.id} refreshKey={b.status} />
            </Row>
          </dl>
        </>
      )}
    </Modal>
  )
}
