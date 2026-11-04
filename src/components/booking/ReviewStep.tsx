import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { Alert, Button, Checkbox } from '@/components/ui'
import { useBooking } from '@/hooks/useBooking'
import { useI18n } from '@/i18n/useI18n'
import { formatServiceDuration } from '@/lib/services'
import { checkAge } from '@/lib/age'
import { formatPrice, formatStudioDateLong, formatStudioTime } from '@/lib/time'
import { bookingRepository } from '@/services/bookingRepository'
import { BookingRejectedError, SlotUnavailableError } from '@/services/errors'
import type { Artist, BookingConfirmation, CustomerInfo, Service, StudioSettings } from '@/types/booking'
import { AgeNotice } from './AgeNotice'
import { CancellationPolicy } from './CancellationPolicy'
import { BookingNav } from './BookingNav'
import { StepHeading } from './StepHeading'

interface ReviewStepProps {
  artist: Artist
  service: Service
  settings: StudioSettings
  onEdit: (step: number) => void
  onBack: () => void
  onBooked: (confirmation: BookingConfirmation) => void
}

function SummaryBlock({ title, step, onEdit, children }: { title: string; step: number; onEdit: (s: number) => void; children: ReactNode }) {
  const { t } = useI18n()
  return (
    <section className="border-b border-line py-5 first:pt-0 last:border-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-muted">{title}</h3>
        <button type="button" onClick={() => onEdit(step)} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium text-olive hover:bg-olive-light">
          <Pencil className="size-3.5" aria-hidden /> {t.booking.edit}<span className="sr-only"> {title.toLowerCase()}</span>
        </button>
      </div>
      {children}
    </section>
  )
}

export function ReviewStep({ artist, service, settings, onEdit, onBack, onBooked }: ReviewStepProps) {
  const { draft, referenceImage, clearTime } = useBooking()
  const { t, lang } = useI18n()
  const customer = draft.customer as CustomerInfo
  const startsAt = draft.startsAt!
  const endsAt = new Date(new Date(startsAt).getTime() + service.durationMinutes * 60_000)
  const ageCheck = checkAge(customer.dateOfBirth, draft.date!, settings)

  const [accepted, setAccepted] = useState(false)
  const [showConsentError, setShowConsentError] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<{ message: string; slotTaken: boolean } | null>(null)
  const inFlight = useRef(false)

  const submit = async () => {
    if (!accepted) {
      setShowConsentError(true)
      return
    }
    if (inFlight.current) return // guards against double clicks before React re-renders
    inFlight.current = true
    setSubmitting(true)
    setError(null)
    try {
      const confirmation = await bookingRepository.createBooking({
        artistId: artist.id,
        serviceId: service.id,
        startsAt,
        customer,
        referenceImage,
        cancellationPolicyAccepted: true,
        cancellationPolicyVersion: settings.policyVersion,
        website: honeypot,
        language: lang,
      })
      onBooked(confirmation)
    } catch (e) {
      inFlight.current = false
      setSubmitting(false)
      if (e instanceof SlotUnavailableError) setError({ message: t.booking.slotTaken, slotTaken: true })
      else if (e instanceof BookingRejectedError) setError({ message: t.booking.rejected[e.code], slotTaken: false })
      else setError({ message: t.booking.networkError, slotTaken: false })
    }
  }

  return (
    <>
      <StepHeading title={t.booking.reviewTitle}>{t.booking.reviewIntro}</StepHeading>

      <div className="rounded-card border border-line bg-paper p-5 sm:p-7">
        <SummaryBlock title={t.booking.artistAndService} step={0} onEdit={onEdit}>
          <p className="font-medium">{t.booking.serviceWith(service.name, artist.name)}</p>
          <p className="text-sm text-muted">
            {formatServiceDuration(service, lang)} · {t.booking.estimatedPriceLabel} {formatPrice(service.priceNok, lang)}
          </p>
        </SummaryBlock>
        <SummaryBlock title={t.booking.time} step={2} onEdit={onEdit}>
          <p className="font-medium first-letter:uppercase">{formatStudioDateLong(startsAt, lang)}</p>
          <p className="text-sm text-muted tabular-nums">{formatStudioTime(startsAt)}–{formatStudioTime(endsAt)}</p>
        </SummaryBlock>
        <SummaryBlock title={t.booking.contactInfo} step={3} onEdit={onEdit}>
          <p className="font-medium">{customer.fullName}</p>
          <p className="text-sm text-muted">{customer.email} · {customer.phone}</p>
        </SummaryBlock>
        <SummaryBlock title={t.booking.tattoo} step={3} onEdit={onEdit}>
          <p className="text-sm"><span className="text-muted">{t.booking.placementLabel}</span> {customer.tattooPlacement}</p>
          <p className="mt-1 whitespace-pre-line text-sm">{customer.tattooDescription}</p>
          <p className="mt-2 text-xs text-muted">{referenceImage ? t.booking.referenceFile(referenceImage.name) : t.booking.noReference}</p>
        </SummaryBlock>
      </div>

      <div className="mt-6 space-y-4">
        <AgeNotice check={ageCheck} settings={settings} />
        {service.priceNok > 0 && (
          <Alert tone="info">{t.booking.priceNotice}</Alert>
        )}
      </div>

      <div className="mt-6 rounded-card border border-line bg-paper p-5 text-sm leading-relaxed text-muted">
        <CancellationPolicy settings={settings} headingLevel="h3" />
        <p className="mt-2">
          <Link to="/vilkar" target="_blank" className="font-medium text-olive underline underline-offset-4">
            {t.booking.readTerms}
          </Link>
        </p>
        <Checkbox
          className="mt-5 border-t border-line pt-5"
          checked={accepted}
          onChange={(e) => {
            setAccepted(e.target.checked)
            if (e.target.checked) setShowConsentError(false)
          }}
          error={showConsentError ? t.booking.policyRequired : undefined}
          label={<span className="font-medium">{t.booking.policyCheckbox}</span>}
        />
      </div>

      {/* Honeypot: hidden from people, often filled in by spam bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          {t.booking.honeypot}
          <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
        </label>
      </div>

      {error && (
        <Alert tone="error" title={error.slotTaken ? t.booking.slotTakenTitle : t.booking.notSentTitle} className="mt-6">
          <p>{error.message}</p>
          {error.slotTaken && (
            <Button
              size="sm"
              className="mt-3"
              onClick={() => {
                clearTime()
                onEdit(2)
              }}
            >
              {t.booking.chooseAnother}
            </Button>
          )}
        </Alert>
      )}

      <BookingNav
        onBack={onBack}
        onNext={submit}
        nextLabel={t.booking.confirm}
        loading={submitting}
        nextDisabled={ageCheck.kind === 'not_permitted'}
      />
    </>
  )
}
