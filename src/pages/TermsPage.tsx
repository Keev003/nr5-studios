import { Link } from 'react-router-dom'
import { CancellationPolicy } from '@/components/booking/CancellationPolicy'
import { Container } from '@/components/ui'
import { usePageTitle } from '@/hooks/usePageTitle'
import { usePublicSettings } from '@/hooks/usePublicCatalog'
import { useI18n } from '@/i18n/useI18n'
import { bookingDefaults, studio } from '@/lib/config'

/**
 * Booking terms. The cancellation terms are the studio's own (2026-11-04);
 * the other sections are drafts the studio should confirm before launch.
 */
function content(policyVersion: string, minimumAge: number) {
  return {
    nb: {
      version: `Versjon ${policyVersion}`,
      title: 'Bookingvilkår',
      draft: 'Avbestillingsvilkårene er studioets egne. De øvrige punktene er utkast som studioet skal bekrefte.',
      booking: ['Booking', 'En booking er registrert når du har mottatt en bekreftelse på e-post. Priser oppgitt ved booking er estimater; endelig pris avtales med artisten før arbeidet starter. Det betales ikke noe på nett.'],
      sections: [
        ['Aldersgrense', `Studioets aldersgrense er ${minimumAge} år. Kunder under ${minimumAge} år kan sende en bookingforespørsel, men må legge frem signert samtykke fra foresatte. Slike forespørsler bekreftes ikke automatisk, og studioet kan avslå timen.`],
        ['Helse og forberedelser', 'Gi beskjed om allergier, sykdommer eller medisiner som kan påvirke tatoveringen. Møt uthvilt, ha spist, og unngå alkohol de siste 24 timene før timen.'],
      ],
      privacyHeading: 'Personopplysninger',
      privacyText: 'Opplysningene du oppgir brukes kun til å administrere bookingen. Les mer i',
      privacyLink: 'personvernerklæringen',
    },
    en: {
      version: `Version ${policyVersion}`,
      title: 'Booking terms',
      draft: 'The cancellation terms are the studio’s own. The other sections are drafts the studio will confirm.',
      booking: ['Booking', 'A booking is registered once you have received an email confirmation. Prices shown when booking are estimates; the final price is agreed with the artist before work begins. Nothing is paid online.'],
      sections: [
        ['Age limit', `The studio's age limit is ${minimumAge}. Clients under ${minimumAge} may send a booking request but must provide signed consent from a parent or guardian. Such requests are never confirmed automatically, and the studio may decline the appointment.`],
        ['Health and preparation', 'Let us know about allergies, illnesses or medication that may affect the tattoo. Come well rested, have eaten, and avoid alcohol for 24 hours before your appointment.'],
      ],
      privacyHeading: 'Personal data',
      privacyText: 'The details you provide are only used to manage your booking. Read more in the',
      privacyLink: 'privacy policy',
    },
  }
}

export default function TermsPage() {
  const { t, lang } = useI18n()
  // Live rules from the dashboard; built-in defaults until they load.
  const s = usePublicSettings()
  const policy = {
    cancellationDeadlineHours: s?.cancellationDeadlineHours ?? bookingDefaults.cancellationDeadlineHours,
    lateCancellationHours: s?.lateCancellationHours ?? bookingDefaults.lateCancellationHours,
    lateCancellationPercent: s?.lateCancellationPercent ?? bookingDefaults.lateCancellationPercent,
  }
  const c = content(s?.policyVersion ?? bookingDefaults.policyVersion, s?.minimumAge ?? bookingDefaults.minimumAge)[lang]
  usePageTitle(c.title)

  const heading = 'mb-2 font-sans text-lg font-semibold text-ink'
  return (
    <Container className="max-w-3xl py-16 sm:py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-olive">{c.version}</p>
      <h1 className="mt-3 text-3xl font-light sm:text-4xl">{c.title}</h1>
      <p className="mt-4 rounded-lg bg-warning-light px-3 py-2 text-sm text-warning">{c.draft}</p>
      <div className="mt-10 space-y-8 leading-relaxed text-muted">
        <section>
          <h2 className={heading}>{c.booking[0]}</h2>
          <p>{c.booking[1]}</p>
        </section>
        <div>
          <CancellationPolicy settings={policy} />
          <p className="mt-3 text-sm">{t.cancellation.invoiceNote}</p>
        </div>
        {c.sections.map(([title, text]) => (
          <section key={title}>
            <h2 className={heading}>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
        <section>
          <h2 className={heading}>{c.privacyHeading}</h2>
          <p>
            {c.privacyText} <Link to="/personvern" className="text-olive underline">{c.privacyLink}</Link>.
          </p>
        </section>
        <p className="text-sm">{studio.name} · {studio.email} · {studio.phone}</p>
      </div>
    </Container>
  )
}
