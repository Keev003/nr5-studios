import { Link } from 'react-router-dom'
import { Container } from '@/components/ui'
import { useI18n } from '@/i18n/useI18n'
import { studio } from '@/lib/config'
import { usePageTitle } from '@/hooks/usePageTitle'

/**
 * Privacy policy describing what the booking system actually stores.
 * Retention periods are proposals the studio must confirm before launch.
 */
type Section = { heading: string; body: string[] }

const address = `${studio.address.street}, ${studio.address.postalCode} ${studio.address.city}`

const content: Record<'nb' | 'en', { title: string; updated: string; draft: string; sections: Section[]; termsLink: string }> = {
  nb: {
    title: 'Personvernerklæring',
    updated: 'Sist oppdatert 4. november 2026',
    draft: 'Utkast – lagringstidene må bekreftes av studioet før lansering.',
    termsLink: 'Les også bookingvilkårene',
    sections: [
      {
        heading: 'Hvem er ansvarlig?',
        body: [`${studio.name}, ${address}, er behandlingsansvarlig for personopplysningene du gir oss. Spørsmål kan sendes til ${studio.email}.`],
      },
      {
        heading: 'Hva vi lagrer',
        body: [
          'Når du booker en time lagrer vi: navn, fødselsdato, e-post, telefonnummer, plassering og beskrivelse av tatoveringen, eventuelt referansebilde, valgt artist, tjeneste og tidspunkt, samt når du godtok avbestillingsvilkårene og hvilken versjon av dem.',
          'Vi lagrer ikke betalingsopplysninger. Det betales ikke noe på nettsiden.',
        ],
      },
      {
        heading: 'Hvorfor vi lagrer det',
        body: [
          'For å gjennomføre og administrere timen din (avtale med deg), sende bekreftelse og kalenderinvitasjon, og kontakte deg ved endringer.',
          'Fødselsdatoen brukes til å kontrollere aldersgrensen på timedatoen. Kunder under aldersgrensen må ha samtykke fra foresatte.',
        ],
      },
      {
        heading: 'Hvem som ser opplysningene',
        body: [
          'Bare artisten du har booket og studioets administratorer har tilgang. Referansebilder lagres privat og vises kun for dem.',
          'Vi bruker disse databehandlerne for å drive nettsiden: Supabase (database og fillagring), Resend (utsending av e-post) og Vercel (drift av nettsiden). De behandler opplysningene kun på våre vegne.',
        ],
      },
      {
        heading: 'Hvor lenge vi lagrer',
        body: [
          'Bookingopplysninger lagres i inntil 12 måneder etter timen, blant annet fordi vi kan trenge dem ved spørsmål om avbestillingsgebyr. Referansebilder slettes senest 3 måneder etter timen.',
          'Opplysninger vi er pålagt å oppbevare etter regnskapsloven, oppbevares så lenge loven krever.',
        ],
      },
      {
        heading: 'Informasjonskapsler og lokal lagring',
        body: [
          'Vi bruker ingen sporing eller annonsekapsler. Nettleseren husker språkvalget ditt og bookingen du er i gang med (slettes når du lukker fanen). Artister som logger inn får en innloggingsøkt.',
        ],
      },
      {
        heading: 'Dine rettigheter',
        body: [
          `Du kan be om innsyn i, retting av eller sletting av opplysningene dine ved å kontakte ${studio.email}. Du kan også klage til Datatilsynet (datatilsynet.no).`,
        ],
      },
    ],
  },
  en: {
    title: 'Privacy policy',
    updated: 'Last updated 4 November 2026',
    draft: 'Draft – the retention periods must be confirmed by the studio before launch.',
    termsLink: 'Also read the booking terms',
    sections: [
      {
        heading: 'Who is responsible?',
        body: [`${studio.name}, ${address}, is the data controller for the personal data you give us. Questions can be sent to ${studio.email}.`],
      },
      {
        heading: 'What we store',
        body: [
          'When you book an appointment we store: your name, date of birth, email, phone number, the placement and description of the tattoo, any reference image, the chosen artist, service and time, and when you accepted the cancellation terms and which version.',
          'We do not store payment details. Nothing is paid on the website.',
        ],
      },
      {
        heading: 'Why we store it',
        body: [
          'To carry out and manage your appointment (our agreement with you), send a confirmation and calendar invitation, and contact you about changes.',
          'Your date of birth is used to check the age limit on the appointment date. Clients under the age limit need consent from a parent or guardian.',
        ],
      },
      {
        heading: 'Who can see your data',
        body: [
          'Only the artist you booked and the studio’s administrators have access. Reference images are stored privately and shown only to them.',
          'We use these processors to run the website: Supabase (database and file storage), Resend (sending email) and Vercel (hosting). They process data only on our behalf.',
        ],
      },
      {
        heading: 'How long we keep it',
        body: [
          'Booking details are kept for up to 12 months after the appointment, partly in case of questions about cancellation fees. Reference images are deleted no later than 3 months after the appointment.',
          'Information we are required to keep under Norwegian accounting law is kept for as long as the law requires.',
        ],
      },
      {
        heading: 'Cookies and local storage',
        body: [
          'We use no tracking or advertising cookies. Your browser remembers your language choice and the booking you are working on (cleared when you close the tab). Artists who sign in get a login session.',
        ],
      },
      {
        heading: 'Your rights',
        body: [
          `You can ask to access, correct or delete your data by contacting ${studio.email}. You can also complain to the Norwegian Data Protection Authority (datatilsynet.no).`,
        ],
      },
    ],
  },
}

export default function PrivacyPage() {
  const { lang } = useI18n()
  const c = content[lang]
  usePageTitle(c.title)
  return (
    <Container className="max-w-3xl py-16 sm:py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-olive">{c.updated}</p>
      <h1 className="mt-3 text-3xl font-light sm:text-4xl">{c.title}</h1>
      <p className="mt-4 rounded-lg bg-warning-light px-3 py-2 text-sm text-warning">{c.draft}</p>
      <div className="mt-10 space-y-8 leading-relaxed text-muted">
        {c.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="mb-2 font-sans text-lg font-semibold text-ink">{s.heading}</h2>
            {s.body.map((p) => (
              <p key={p} className="mt-2 first:mt-0">{p}</p>
            ))}
          </section>
        ))}
        <p>
          <Link to="/vilkar" className="text-olive underline underline-offset-4">{c.termsLink}</Link>
        </p>
      </div>
    </Container>
  )
}
