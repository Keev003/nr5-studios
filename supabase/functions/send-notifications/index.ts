// Sends queued booking emails (with calendar invitations) via Resend.
//
// The database queues a row in `notifications` whenever a booking is created,
// confirmed, cancelled or moved. This function claims due rows, builds the
// email and .ics file, sends it, and records the result. Failed sends are
// retried with back-off; Resend's Idempotency-Key stops a retry from being
// delivered twice. Anyone may trigger it – it only ever sends what is queued.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY        required
//   EMAIL_FROM            e.g. "Nr5 Studios <booking@send.nr5studios.no>" (default: Resend test sender)
//   EMAIL_TEST_RECIPIENT  optional: deliver *every* email here instead (Resend test mode)
//   SITE_URL              e.g. https://nr5studios.no (links in emails)
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

// ----------------------------------------------------------------- studio info
// Mirrors src/lib/config.ts.
export const STUDIO = {
  name: 'Nr5 Studios',
  address: 'Grünerløkka 12, 0552 Oslo',
  email: 'hei@nr5studios.no',
  phone: '+47 400 00 000',
  timeZone: 'Europe/Oslo',
}

// ----------------------------------------------------------------- types
export type Lang = 'nb' | 'en'
export type Kind = 'booking_received' | 'booking_confirmed' | 'booking_cancelled' | 'booking_changed'
export type Recipient = 'customer' | 'artist'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

export interface Notification {
  id: string
  booking_id: string
  kind: Kind
  recipient: Recipient
  previous_status: BookingStatus | null
  calendar_sequence: number
  attempts: number
}

export interface BookingDetails {
  reference: string
  status: BookingStatus
  language: Lang
  serviceName: string
  priceNok: number
  startsAt: string
  endsAt: string
  customerName: string
  customerEmail: string
  customerPhone: string
  tattooPlacement: string
  tattooDescription: string
  requiresGuardianConsent: boolean
  cancellationReason: string | null
  artistName: string
  artistEmail: string | null
}

export interface Settings {
  cancellationFeeNok: number
  cancellationDeadlineHours: number
  guardianConsentFormUrl: string
}

export interface Email {
  to: string
  subject: string
  html: string
  text: string
  ics: { content: string; method: 'REQUEST' | 'CANCEL' } | null
}

// ----------------------------------------------------------------- calendar (.ics)
// Same rules as src/lib/ics.ts, plus METHOD/ATTENDEE so mail clients show it as an invitation.
const pad = (n: number) => String(n).padStart(2, '0')
export const icsDate = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
export const icsEscape = (v: string) => v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

export function foldLine(line: string): string {
  const enc = new TextEncoder()
  if (enc.encode(line).length <= 75) return line
  const parts: string[] = []
  let current = ''
  let limit = 75
  for (const ch of line) {
    if (enc.encode(current + ch).length > limit) {
      parts.push(current)
      current = ''
      limit = 74
    }
    current += ch
  }
  parts.push(current)
  return parts.join('\r\n ')
}

export function buildInvite(opts: {
  method: 'REQUEST' | 'CANCEL'
  uid: string
  sequence: number
  title: string
  description: string
  startsAt: Date
  endsAt: Date
  organizerEmail: string
  attendeeEmail: string
  now?: Date
}): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nr5 Studios//Booking//NO',
    'CALSCALE:GREGORIAN',
    `METHOD:${opts.method}`,
    'BEGIN:VEVENT',
    `UID:${opts.uid}`,
    `SEQUENCE:${opts.sequence}`,
    `DTSTAMP:${icsDate(opts.now ?? new Date())}`,
    `DTSTART:${icsDate(opts.startsAt)}`,
    `DTEND:${icsDate(opts.endsAt)}`,
    `SUMMARY:${icsEscape(opts.title)}`,
    `DESCRIPTION:${icsEscape(opts.description)}`,
    `LOCATION:${icsEscape(`${STUDIO.name}, ${STUDIO.address}`)}`,
    `STATUS:${opts.method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'}`,
    `ORGANIZER;CN=${icsEscape(STUDIO.name)}:mailto:${opts.organizerEmail}`,
    `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${opts.attendeeEmail}`,
    ...(opts.method === 'REQUEST'
      ? ['BEGIN:VALARM', 'TRIGGER:-PT24H', 'ACTION:DISPLAY', 'DESCRIPTION:Påminnelse', 'END:VALARM']
      : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

// ----------------------------------------------------------------- email content
const fmtDate = (iso: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'nb-NO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: STUDIO.timeZone,
  }).format(new Date(iso))
const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat('nb-NO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: STUDIO.timeZone }).format(new Date(iso))
const fmtPrice = (nok: number, lang: Lang) =>
  nok === 0 ? (lang === 'en' ? 'Free' : 'Gratis') : lang === 'en' ? `NOK ${nok.toLocaleString('en-GB')}` : `${nok.toLocaleString('nb-NO')} kr`
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

interface Content {
  subject: string
  heading: string
  intro: string[]
  rows: [string, string][]
  notes: string[]
  link?: { label: string; href: string }
  ics: 'REQUEST' | 'CANCEL' | null
}

/** Decides what each recipient is told for each event. Pure, so it can be unit-tested. */
export function composeContent(n: Notification, b: BookingDetails, s: Settings, siteUrl: string): Content {
  const lang: Lang = n.recipient === 'customer' ? b.language : 'nb'
  const en = lang === 'en'
  const when = `${capitalize(fmtDate(b.startsAt, lang))}, ${fmtTime(b.startsAt)}–${fmtTime(b.endsAt)}`
  const shortWhen = `${fmtDate(b.startsAt, lang)} ${fmtTime(b.startsAt)}`
  const pending = b.status === 'pending'
  const wasConfirmed = n.previous_status === 'confirmed'

  if (n.recipient === 'customer') {
    const rows: [string, string][] = [
      [en ? 'Reference' : 'Referanse', b.reference],
      [en ? 'Artist' : 'Artist', b.artistName],
      [en ? 'Service' : 'Tjeneste', b.serviceName],
      [en ? 'Time' : 'Tid', when],
      [en ? 'Estimated price' : 'Estimert pris', fmtPrice(b.priceNok, lang)],
      [en ? 'Address' : 'Adresse', `${STUDIO.name}, ${STUDIO.address}`],
    ]
    const terms = en
      ? `Need to cancel? Please let us know at least ${s.cancellationDeadlineHours} hours before. Late cancellations or no-shows may be invoiced NOK ${s.cancellationFeeNok}.`
      : `Må du avbestille? Gi beskjed senest ${s.cancellationDeadlineHours} timer før. Ved sen avbestilling eller manglende oppmøte kan du bli fakturert ${s.cancellationFeeNok} kr.`
    const contact = en ? `Questions? Reply to ${STUDIO.email} or call ${STUDIO.phone}.` : `Spørsmål? Kontakt ${STUDIO.email} eller ring ${STUDIO.phone}.`
    const firstName = b.customerName.split(' ')[0]

    switch (n.kind) {
      case 'booking_received':
        if (pending) {
          return {
            subject: en ? `We have received your request – ${b.reference}` : `Vi har mottatt forespørselen din – ${b.reference}`,
            heading: en ? 'Request received' : 'Forespørsel mottatt',
            intro: [
              en ? `Hi ${firstName}, thank you for your request.` : `Hei ${firstName}, takk for forespørselen.`,
              en
                ? 'Your appointment is not confirmed yet. Because you are under the age limit, the studio needs signed consent from a parent or guardian and will review your request. You will receive a new email with a calendar invitation once it is approved.'
                : 'Timen er ikke bekreftet ennå. Fordi du er under aldersgrensen, trenger studioet signert samtykke fra foresatte og vil vurdere forespørselen. Du får en ny e-post med kalenderinvitasjon når timen er godkjent.',
            ],
            rows,
            notes: [contact],
            link: { label: en ? 'Download consent form' : 'Last ned samtykkeskjema', href: absolute(s.guardianConsentFormUrl, siteUrl) },
            ics: null,
          }
        }
        return {
          subject: en ? `Confirmed: ${b.serviceName} with ${b.artistName}, ${shortWhen}` : `Bekreftet: ${b.serviceName} hos ${b.artistName}, ${shortWhen}`,
          heading: en ? 'Your booking is confirmed' : 'Bookingen din er bekreftet',
          intro: [en ? `Hi ${firstName}, we look forward to seeing you!` : `Hei ${firstName}, vi gleder oss til å se deg!`,
            en ? 'The calendar invitation is attached.' : 'Kalenderinvitasjonen ligger vedlagt.'],
          rows,
          notes: [terms, contact],
          link: { label: en ? 'Booking terms' : 'Bookingvilkår', href: `${siteUrl}/vilkar` },
          ics: 'REQUEST',
        }
      case 'booking_confirmed':
        return {
          subject: en ? `Your appointment is confirmed – ${shortWhen}` : `Timen din er bekreftet – ${shortWhen}`,
          heading: en ? 'Your appointment is confirmed' : 'Timen din er bekreftet',
          intro: [en ? `Hi ${firstName}, the studio has approved your appointment.` : `Hei ${firstName}, studioet har godkjent timen din.`,
            en ? 'The calendar invitation is attached.' : 'Kalenderinvitasjonen ligger vedlagt.'],
          rows,
          notes: [terms, contact],
          ics: 'REQUEST',
        }
      case 'booking_cancelled':
        return {
          subject: en ? `Your appointment has been cancelled – ${b.reference}` : `Timen din er avlyst – ${b.reference}`,
          heading: en ? 'Appointment cancelled' : 'Timen er avlyst',
          intro: [
            en ? `Hi ${firstName}, your appointment on ${shortWhen} has been cancelled.` : `Hei ${firstName}, timen din ${shortWhen} er avlyst.`,
            ...(b.cancellationReason ? [(en ? 'Message from the studio: ' : 'Melding fra studioet: ') + b.cancellationReason] : []),
            en ? 'You are welcome to book a new time on our website.' : 'Du er velkommen til å booke en ny time på nettsiden.',
          ],
          rows: rows.slice(0, 4),
          notes: [contact],
          link: { label: en ? 'Book a new time' : 'Book ny time', href: `${siteUrl}/booking` },
          ics: wasConfirmed ? 'CANCEL' : null,
        }
      case 'booking_changed':
        return {
          subject: en ? `New time for your appointment – ${shortWhen}` : `Ny tid for timen din – ${shortWhen}`,
          heading: en ? 'Your appointment has moved' : 'Timen din er flyttet',
          intro: [en ? `Hi ${firstName}, your appointment has a new time. The updated calendar invitation is attached.` : `Hei ${firstName}, timen din har fått ny tid. Oppdatert kalenderinvitasjon ligger vedlagt.`],
          rows,
          notes: [terms, contact],
          ics: pending ? null : 'REQUEST',
        }
    }
  }

  // Artist emails: Norwegian, with what they need to prepare – but only as much as needed.
  const rows: [string, string][] = [
    ['Kunde', b.customerName],
    ['Tjeneste', b.serviceName],
    ['Tid', when],
    ['Kontakt', `${b.customerEmail} · ${b.customerPhone}`],
    ['Plassering', b.tattooPlacement],
    ['Idé', b.tattooDescription],
    ['Referanse', b.reference],
  ]
  const dashboard = { label: 'Åpne i dashbordet', href: `${siteUrl}/dashboard/avtaler` }
  switch (n.kind) {
    case 'booking_received':
      return pending
        ? {
            subject: `Ny forespørsel venter på godkjenning – ${shortWhen}`,
            heading: 'Ny forespørsel',
            intro: ['En kunde under aldersgrensen har sendt en forespørsel. Den må godkjennes i dashbordet etter at samtykke fra foresatte er kontrollert.'],
            rows, notes: [], link: dashboard, ics: null,
          }
        : {
            subject: `Ny booking: ${b.serviceName} ${shortWhen}`,
            heading: 'Ny booking',
            intro: ['Du har fått en ny booking. Kalenderinvitasjonen ligger vedlagt.'],
            rows, notes: [], link: dashboard, ics: 'REQUEST',
          }
    case 'booking_confirmed':
      return { subject: `Bekreftet: ${b.serviceName} ${shortWhen}`, heading: 'Avtale bekreftet', intro: ['Avtalen er bekreftet. Kalenderinvitasjonen ligger vedlagt.'], rows, notes: [], link: dashboard, ics: 'REQUEST' }
    case 'booking_cancelled':
      return {
        subject: `Avlyst: ${b.serviceName} ${shortWhen}`,
        heading: 'Avtale avlyst',
        intro: ['Avtalen er avlyst og tiden er ledig igjen.', ...(b.cancellationReason ? [`Begrunnelse: ${b.cancellationReason}`] : [])],
        rows: rows.slice(0, 3), notes: [], link: dashboard, ics: wasConfirmed ? 'CANCEL' : null,
      }
    case 'booking_changed':
      return { subject: `Flyttet: ${b.serviceName} ${shortWhen}`, heading: 'Avtale flyttet', intro: ['Avtalen har fått ny tid.'], rows, notes: [], link: dashboard, ics: pending ? null : 'REQUEST' }
  }
}

const absolute = (url: string, siteUrl: string) => (/^https?:\/\//.test(url) ? url : `${siteUrl}${url.startsWith('/') ? '' : '/'}${url}`)

export function renderEmail(c: Content, lang: Lang): { html: string; text: string } {
  const rowsHtml = c.rows
    .map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#6e6e6e;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;color:#171717">${esc(v).replace(/\n/g, '<br>')}</td></tr>`)
    .join('')
  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;background:#f7f7f2;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f2;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#171717;padding:20px 28px;color:#ffffff;font-family:Georgia,serif;font-size:18px;letter-spacing:2px">NR5 STUDIOS</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:400;font-size:26px;color:#171717">${esc(c.heading)}</h1>
${c.intro.map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#171717">${esc(p)}</p>`).join('')}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;font-size:14px;line-height:1.5;border-top:1px solid #e3e3dc;padding-top:12px;width:100%">${rowsHtml}</table>
${c.link ? `<p style="margin:24px 0"><a href="${esc(c.link.href)}" style="display:inline-block;background:#66734a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px">${esc(c.link.label)}</a></p>` : ''}
${c.notes.map((p) => `<p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#6e6e6e">${esc(p)}</p>`).join('')}
</td></tr></table></td></tr></table></body></html>`
  const text = [
    c.heading,
    '',
    ...c.intro,
    '',
    ...c.rows.map(([k, v]) => `${k}: ${v}`),
    '',
    ...(c.link ? [`${c.link.label}: ${c.link.href}`, ''] : []),
    ...c.notes,
  ].join('\n')
  return { html, text }
}

/** Full email for one queued notification, or null if there is nobody to send to. */
export function buildEmail(n: Notification, b: BookingDetails, s: Settings, opts: { siteUrl: string; fromAddress: string; now?: Date }): Email | null {
  const to = n.recipient === 'customer' ? b.customerEmail : b.artistEmail
  if (!to) return null
  const content = composeContent(n, b, s, opts.siteUrl)
  const lang: Lang = n.recipient === 'customer' ? b.language : 'nb'
  const { html, text } = renderEmail(content, lang)
  const ics = content.ics
    ? {
        method: content.ics,
        content: buildInvite({
          method: content.ics,
          uid: `${b.reference}@nr5studios`,
          sequence: n.calendar_sequence,
          // Keep calendar entries free of unnecessary personal data.
          title: n.recipient === 'customer' ? `${b.serviceName} – ${STUDIO.name}` : `${b.serviceName} – ${b.customerName.split(' ')[0]}`,
          description:
            n.recipient === 'customer'
              ? `${lang === 'en' ? 'Booking reference' : 'Bookingreferanse'}: ${b.reference}\nArtist: ${b.artistName}\n${STUDIO.email} / ${STUDIO.phone}`
              : `Referanse: ${b.reference}\nSe detaljer i dashbordet.`,
          startsAt: new Date(b.startsAt),
          endsAt: new Date(b.endsAt),
          organizerEmail: opts.fromAddress,
          attendeeEmail: to,
          now: opts.now,
        }),
      }
    : null
  return { to, subject: content.subject, html, text, ics }
}

/** Minutes to wait before the next attempt: 1, 5, 15, 60 … */
export const backoffMinutes = (attempts: number) => [1, 5, 15, 60, 240][Math.min(attempts, 5) - 1] ?? 240

/** Extracts the bare address from "Name <addr@x>". */
export const addressOf = (from: string) => from.match(/<([^>]+)>/)?.[1] ?? from

// ----------------------------------------------------------------- sending
async function sendWithResend(email: Email, opts: { apiKey: string; from: string; idempotencyKey: string; testRecipient?: string }) {
  const redirected = opts.testRecipient && opts.testRecipient !== email.to
  const body: Record<string, unknown> = {
    from: opts.from,
    to: [redirected ? opts.testRecipient : email.to],
    subject: redirected ? `[TEST → ${email.to}] ${email.subject}` : email.subject,
    html: email.html,
    text: email.text,
    reply_to: STUDIO.email,
  }
  if (email.ics) {
    body.attachments = [{
      filename: email.ics.method === 'CANCEL' ? 'avlyst.ics' : 'invitasjon.ics',
      content: btoa(String.fromCharCode(...new TextEncoder().encode(email.ics.content))),
      content_type: `text/calendar; charset=utf-8; method=${email.ics.method}`,
    }]
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${opts.apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': opts.idempotencyKey },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Resend ${res.status}: ${json?.message ?? json?.name ?? 'unknown error'}`)
  return json.id as string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const apiKey = Deno.env.get('RESEND_API_KEY')
  // Without a key nothing is claimed, so queued emails wait until it is configured.
  if (!apiKey) return json({ error: 'email_not_configured' }, 503)
  const from = Deno.env.get('EMAIL_FROM') || 'Nr5 Studios <onboarding@resend.dev>'
  const testRecipient = Deno.env.get('EMAIL_TEST_RECIPIENT') || undefined
  const siteUrl = (Deno.env.get('SITE_URL') || 'http://localhost:5173').replace(/\/$/, '')

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  const { data: claimed, error: claimError } = await db.rpc('claim_notifications', { p_limit: 20 })
  if (claimError) return json({ error: claimError.message }, 500)
  const queue = (claimed ?? []) as Notification[]
  if (!queue.length) return json({ sent: 0, failed: 0 })

  const ids = [...new Set(queue.map((n) => n.booking_id))]
  const [{ data: bookings }, { data: settingsRow }] = await Promise.all([
    db.from('bookings').select('*, artists(name, profiles(email))').in('id', ids),
    db.from('studio_settings').select('cancellation_fee_nok, cancellation_deadline_hours, guardian_consent_form_url').single(),
  ])
  const settings: Settings = {
    cancellationFeeNok: settingsRow?.cancellation_fee_nok ?? 500,
    cancellationDeadlineHours: settingsRow?.cancellation_deadline_hours ?? 24,
    guardianConsentFormUrl: settingsRow?.guardian_consent_form_url ?? '/samtykkeskjema-placeholder.pdf',
  }

  let sent = 0
  let failed = 0
  for (const n of queue) {
    const r: any = bookings?.find((b: any) => b.id === n.booking_id)
    try {
      if (!r) throw new Error('booking_not_found')
      const details: BookingDetails = {
        reference: r.booking_reference,
        status: r.status,
        language: r.language === 'en' ? 'en' : 'nb',
        serviceName: r.service_name,
        priceNok: r.price_nok,
        startsAt: r.starts_at,
        endsAt: r.ends_at,
        customerName: r.customer_name,
        customerEmail: r.customer_email,
        customerPhone: r.customer_phone,
        tattooPlacement: r.tattoo_placement,
        tattooDescription: r.tattoo_description,
        requiresGuardianConsent: r.requires_guardian_consent,
        cancellationReason: r.cancellation_reason,
        artistName: r.artists?.name ?? '',
        artistEmail: r.artists?.profiles?.email ?? null,
      }
      const email = buildEmail(n, details, settings, { siteUrl, fromAddress: addressOf(from) })
      if (!email) throw new Error('no_recipient')
      const messageId = await sendWithResend(email, { apiKey, from, idempotencyKey: n.id, testRecipient })
      await db.from('notifications').update({ status: 'sent', sent_at: new Date().toISOString(), provider_message_id: messageId, last_error: null }).eq('id', n.id)
      sent++
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      await db
        .from('notifications')
        .update({
          status: 'failed',
          last_error: message.slice(0, 500),
          next_attempt_at: new Date(Date.now() + backoffMinutes(n.attempts) * 60_000).toISOString(),
        })
        .eq('id', n.id)
      failed++
    }
  }
  return json({ sent, failed })
}
/* eslint-enable @typescript-eslint/no-explicit-any */

Deno.serve(handler)
