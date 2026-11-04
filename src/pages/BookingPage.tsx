import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArtistStep } from '@/components/booking/ArtistStep'
import { BookingSummary } from '@/components/booking/BookingSummary'
import { CustomerStep } from '@/components/booking/CustomerStep'
import { DateTimeStep } from '@/components/booking/DateTimeStep'
import { ReviewStep } from '@/components/booking/ReviewStep'
import { ServiceStep } from '@/components/booking/ServiceStep'
import { Alert, Button, Container, Spinner, Stepper } from '@/components/ui'
import { BookingProvider } from '@/contexts/BookingContext'
import { furthestReachableStep } from '@/contexts/bookingDraft'
import { useBooking } from '@/hooks/useBooking'
import { useBookingCatalog } from '@/hooks/useBookingCatalog'
import { useI18n } from '@/i18n/useI18n'
import { isDemoData } from '@/services/bookingRepository'
import { saveConfirmation } from '@/services/confirmationStore'
import type { BookingConfirmation } from '@/types/booking'

// The provider lives here (not in App) so the booking code and its validation stay in the lazy-loaded chunk.
export default function BookingPage() {
  return (
    <BookingProvider>
      <BookingWizard />
    </BookingProvider>
  )
}

function BookingWizard() {
  const catalog = useBookingCatalog()
  const { t } = useI18n()
  const booking = useBooking()
  const { draft, customerComplete, selectArtist, reset } = booking
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  // The step lives in the URL (?steg=3) so the browser back button moves between steps.
  const requested = Math.max(0, Number(params.get('steg') ?? '1') - 1) || 0
  const furthest = furthestReachableStep(draft, customerComplete)
  const step = Math.min(requested, furthest)

  const goTo = (index: number) => {
    setParams({ steg: String(index + 1) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Arriving from an artist's "Book med …" button preselects that artist.
  const artistSlug = params.get('artist')
  useEffect(() => {
    if (!artistSlug || catalog.status !== 'success') return
    const artist = catalog.data.artists.find((a) => a.slug === artistSlug)
    if (artist) selectArtist(artist.id)
    setParams({ steg: '1' }, { replace: true })
  }, [artistSlug, catalog.status, catalog.data, selectArtist, setParams])

  if (catalog.status === 'loading') return <Spinner label={t.booking.loading} className="py-32" />
  if (catalog.status === 'error') {
    return (
      <Container className="py-24">
        <Alert tone="error" title={t.booking.unavailableTitle}>
          <p>{t.booking.unavailableText}</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={catalog.reload}>{t.common.tryAgain}</Button>
        </Alert>
      </Container>
    )
  }

  const { artists, services, settings } = catalog.data
  const artist = artists.find((a) => a.id === draft.artistId) ?? null
  const service = services.find((s) => s.id === draft.serviceId) ?? null

  const onBooked = (confirmation: BookingConfirmation) => {
    saveConfirmation(confirmation)
    reset()
    navigate(`/booking/bekreftet/${confirmation.reference}`, { replace: true })
  }

  const next = () => goTo(step + 1)
  const back = () => goTo(step - 1)

  return (
    <Container className="py-10 sm:py-16">
      <div className="mb-8 sm:mb-12">
        <h1 className="sr-only">{t.common.bookTime}</h1>
        <Stepper steps={t.booking.steps} current={step} onStepClick={goTo} />
      </div>

      {isDemoData && (
        <p className="mb-6 rounded-lg bg-warning-light px-3 py-2 text-xs text-warning">
          {t.booking.demoBanner}
        </p>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px]">
        <div key={step} className="animate-fade-in min-w-0">
          {step === 0 && <ArtistStep artists={artists} onNext={next} />}
          {step === 1 && <ServiceStep services={services} onBack={back} onNext={next} />}
          {step === 2 && artist && service && (
            <DateTimeStep artist={artist} service={service} settings={settings} onBack={back} onNext={next} />
          )}
          {step === 3 && <CustomerStep settings={settings} onBack={back} onNext={next} />}
          {step === 4 && artist && service && (
            <ReviewStep artist={artist} service={service} settings={settings} onEdit={goTo} onBack={back} onBooked={onBooked} />
          )}
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-28">
            <BookingSummary artist={artist} service={service} startsAt={draft.startsAt} />
          </div>
        </div>
      </div>
    </Container>
  )
}
