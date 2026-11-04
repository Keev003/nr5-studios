import { useParams } from 'react-router-dom'
import { CalendarPlus, CheckCircle2, Clock, Home, Mail, MapPin, Phone } from 'lucide-react'
import { Alert, Button, ButtonLink, Card, Container } from '@/components/ui'
import type { Dictionary } from '@/i18n/nb'
import { useI18n } from '@/i18n/useI18n'
import { bookingDefaults, studio } from '@/lib/config'
import { buildIcs } from '@/lib/ics'
import { formatStudioDateLong, formatStudioTime } from '@/lib/time'
import { loadConfirmation } from '@/services/confirmationStore'
import type { BookingConfirmation } from '@/types/booking'
import { usePageTitle } from '@/hooks/usePageTitle'

const studioAddress = `${studio.address.street}, ${studio.address.postalCode} ${studio.address.city}`

function downloadIcs(c: BookingConfirmation, t: Dictionary) {
  const ics = buildIcs({
    uid: `${c.reference}@nr5studios.no`,
    title: t.success.icsTitle(c.serviceName, c.artistName, studio.name),
    // Deliberately minimal: no personal details in calendar entries.
    description: t.success.icsDescription(c.reference, c.artistName, `${studio.email} / ${studio.phone}`),
    location: `${studio.name}, ${studioAddress}`,
    startsAt: new Date(c.startsAt),
    endsAt: new Date(c.endsAt),
  })
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: `${c.reference}.ics` })
  a.click()
  URL.revokeObjectURL(url)
}

export default function BookingSuccessPage() {
  const { t, lang } = useI18n()
  const { reference = '' } = useParams()
  usePageTitle(t.success.reference.replace(':', '') + ' ' + reference)
  const confirmation = loadConfirmation(reference)
  const pending = confirmation?.status === 'pending'

  return (
    <Container className="max-w-2xl py-16 sm:py-24">
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-16 text-olive" strokeWidth={1.5} aria-hidden />
        <h1 className="mt-6 text-3xl font-light sm:text-4xl">{pending ? t.success.titlePending : t.success.titleConfirmed}</h1>
        <p className="mt-4 text-muted">
          {t.success.reference} <span className="font-mono text-lg font-semibold tracking-wider text-ink">{reference}</span>
        </p>
      </div>

      {pending && (
        <Alert tone="warning" title={t.success.pendingTitle} className="mt-8">
          {t.success.pendingText(bookingDefaults.minimumAge)}
        </Alert>
      )}

      {confirmation ? (
        <Card className="mt-8 divide-y divide-line">
          <dl className="grid gap-4 p-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">{t.success.artist}</dt>
              <dd className="font-medium">{confirmation.artistName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t.success.service}</dt>
              <dd className="font-medium" lang="en">{confirmation.serviceName}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted">{t.success.dateTime}</dt>
              <dd className="font-medium first-letter:uppercase">
                {formatStudioDateLong(confirmation.startsAt, lang)}, {formatStudioTime(confirmation.startsAt)}–{formatStudioTime(confirmation.endsAt)}
              </dd>
            </div>
          </dl>
          <div className="space-y-2 p-6 text-sm text-muted">
            <p className="flex gap-2"><MapPin className="size-4 shrink-0 translate-y-0.5" aria-hidden />{studio.name}, {studioAddress}</p>
            <p className="flex gap-2"><Mail className="size-4 shrink-0 translate-y-0.5" aria-hidden />{studio.email}</p>
            <p className="flex gap-2"><Phone className="size-4 shrink-0 translate-y-0.5" aria-hidden />{studio.phone}</p>
          </div>
        </Card>
      ) : (
        <Alert tone="info" className="mt-8">{t.success.notFound}</Alert>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {confirmation && !pending && (
          <Button size="lg" onClick={() => downloadIcs(confirmation, t)}>
            <CalendarPlus className="size-5" aria-hidden /> {t.success.addToCalendar}
          </Button>
        )}
        {pending && (
          <p className="flex items-center justify-center gap-2 text-sm text-muted sm:hidden">
            <Clock className="size-4" aria-hidden /> {t.success.inviteAfterApproval}
          </p>
        )}
        <ButtonLink to="/" size="lg" variant="outline">
          <Home className="size-5" aria-hidden /> {t.common.backToFrontPage}
        </ButtonLink>
      </div>
    </Container>
  )
}
