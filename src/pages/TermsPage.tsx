import { Link } from 'react-router-dom'
import { Container } from '@/components/ui'
import { usePublicSettings } from '@/hooks/usePublicCatalog'
import { useI18n } from '@/i18n/useI18n'
import { bookingDefaults, studio } from '@/lib/config'

/**
 * Placeholder booking terms. Must be reviewed by the studio (and ideally
 * checked against Norwegian consumer law) before launch.
 */
function content(fee: number, hours: number, policyVersion: string, minimumAge: number) {
  return {
    nb: {
      version: `Versjon ${policyVersion}`,
      title: 'Bookingvilkår',
      placeholder: `Plassholdertekst – endelige vilkår fra ${studio.name} kommer.`,
      sections: [
        ['1. Booking', 'En booking er registrert når du har mottatt en bekreftelse på e-post. Priser oppgitt ved booking er estimater; endelig pris avtales med artisten før arbeidet starter. Det betales ikke noe på nett.'],
        ['2. Avbestilling og endring', `Du kan avbestille eller endre timen kostnadsfritt frem til ${hours} timer før avtalt tid ved å kontakte oss på ${studio.email} eller ${studio.phone}.`],
        ['3. Manglende oppmøte og sen avbestilling', `Ved manglende oppmøte, eller avbestilling mindre enn ${hours} timer før avtalt tid, kan du bli fakturert et gebyr på ${fee} kr. Gebyret trekkes ikke automatisk. Eventuell faktura sendes separat og i samsvar med disse vilkårene og gjeldende forbrukerlovgivning.`],
        ['4. Aldersgrense', `Studioets aldersgrense er ${minimumAge} år. Kunder under ${minimumAge} år kan sende en bookingforespørsel, men må legge frem signert samtykke fra foresatte. Slike forespørsler bekreftes ikke automatisk, og studioet kan avslå timen.`],
        ['5. Helse og forberedelser', 'Gi beskjed om allergier, sykdommer eller medisiner som kan påvirke tatoveringen. Møt uthvilt, ha spist, og unngå alkohol de siste 24 timene før timen.'],
      ],
      privacyHeading: '6. Personopplysninger',
      privacyText: 'Opplysningene du oppgir brukes kun til å administrere bookingen. Les mer i',
      privacyLink: 'personvernerklæringen',
    },
    en: {
      version: `Version ${policyVersion}`,
      title: 'Booking terms',
      placeholder: `Placeholder text – the final terms from ${studio.name} are coming.`,
      sections: [
        ['1. Booking', 'A booking is registered once you have received an email confirmation. Prices shown when booking are estimates; the final price is agreed with the artist before work begins. Nothing is paid online.'],
        ['2. Cancellation and changes', `You can cancel or change your appointment free of charge up to ${hours} hours before the agreed time by contacting us at ${studio.email} or ${studio.phone}.`],
        ['3. No-shows and late cancellation', `If you do not show up, or cancel less than ${hours} hours before the agreed time, you may be invoiced a fee of NOK ${fee}. The fee is never charged automatically. Any invoice is sent separately and in accordance with these terms and applicable consumer law.`],
        ['4. Age limit', `The studio's age limit is ${minimumAge}. Clients under ${minimumAge} may send a booking request but must provide signed consent from a parent or guardian. Such requests are never confirmed automatically, and the studio may decline the appointment.`],
        ['5. Health and preparation', 'Let us know about allergies, illnesses or medication that may affect the tattoo. Come well rested, have eaten, and avoid alcohol for 24 hours before your appointment.'],
      ],
      privacyHeading: '6. Personal data',
      privacyText: 'The details you provide are only used to manage your booking. Read more in the',
      privacyLink: 'privacy policy',
    },
  }
}

export default function TermsPage() {
  const { lang } = useI18n()
  // Live rules from the dashboard; built-in defaults until they load.
  const s = usePublicSettings()
  const c = content(
    s?.cancellationFeeNok ?? bookingDefaults.cancellationFeeNok,
    s?.cancellationDeadlineHours ?? bookingDefaults.cancellationDeadlineHours,
    s?.policyVersion ?? bookingDefaults.policyVersion,
    s?.minimumAge ?? bookingDefaults.minimumAge,
  )[lang]
  return (
    <Container className="max-w-3xl py-16 sm:py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-olive">{c.version}</p>
      <h1 className="mt-3 text-3xl font-light sm:text-4xl">{c.title}</h1>
      <p className="mt-4 rounded-lg bg-warning-light px-3 py-2 text-sm text-warning">{c.placeholder}</p>
      <div className="mt-10 space-y-8 leading-relaxed text-muted [&_h2]:mb-2 [&_h2]:font-sans [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink">
        {c.sections.map(([heading, text]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            <p>{text}</p>
          </section>
        ))}
        <section>
          <h2>{c.privacyHeading}</h2>
          <p>
            {c.privacyText} <Link to="/personvern" className="text-olive underline">{c.privacyLink}</Link>.
          </p>
        </section>
      </div>
    </Container>
  )
}
