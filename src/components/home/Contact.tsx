import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import { Card, FacebookIcon, InstagramIcon, Section } from '@/components/ui'
import { useI18n } from '@/i18n/useI18n'
import { studio } from '@/lib/config'

export function Contact() {
  const { t } = useI18n()
  const { street, postalCode, city } = studio.address
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${street}, ${postalCode} ${city}`)}`
  return (
    <Section
      id="kontakt"
      tone="paper"
      eyebrow={t.home.contactEyebrow}
      title={t.home.contactTitle}
      intro={t.home.contactIntro}
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6 sm:p-8">
          <MapPin className="size-6 text-olive" aria-hidden />
          <h3 className="mt-4 font-sans text-lg font-semibold">{t.home.address}</h3>
          <address className="mt-2 not-italic leading-relaxed text-muted">
            {street}<br />{postalCode} {city}
          </address>
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-medium text-olive underline-offset-4 hover:underline">
            {t.home.showMap}
          </a>
        </Card>
        <Card className="p-6 sm:p-8">
          <Mail className="size-6 text-olive" aria-hidden />
          <h3 className="mt-4 font-sans text-lg font-semibold">{t.home.emailPhone}</h3>
          <ul className="mt-2 space-y-2">
            <li><a href={`mailto:${studio.email}`} className="text-muted hover:text-ink">{studio.email}</a></li>
            <li>
              <a href={`tel:${studio.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 text-muted hover:text-ink">
                <Phone className="size-4" aria-hidden />{studio.phone}
              </a>
            </li>
          </ul>
          <div className="mt-5 flex gap-2">
            <a href={studio.social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex size-11 items-center justify-center rounded-full border border-line hover:border-olive hover:text-olive">
              <InstagramIcon className="size-5" aria-hidden />
            </a>
            <a href={studio.social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="flex size-11 items-center justify-center rounded-full border border-line hover:border-olive hover:text-olive">
              <FacebookIcon className="size-5" aria-hidden />
            </a>
          </div>
        </Card>
        <Card className="p-6 sm:p-8 md:col-span-2 lg:col-span-1">
          <Clock className="size-6 text-olive" aria-hidden />
          <h3 className="mt-4 font-sans text-lg font-semibold">{t.footer.openingHours}</h3>
          <dl className="mt-2 space-y-2">
            {studio.openingHours.map((row) => (
              <div key={row.days} className="flex justify-between gap-4 border-b border-line pb-2 last:border-0">
                <dt className="text-muted">{t.hours[row.days]}</dt>
                <dd className="font-medium tabular-nums">{row.hours ?? t.hours.closed}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-muted">{t.home.appointmentsOnly}</p>
        </Card>
      </div>
    </Section>
  )
}
