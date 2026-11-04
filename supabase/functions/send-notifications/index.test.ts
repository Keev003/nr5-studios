// Run with: deno test supabase/functions/send-notifications
import { assert, assertEquals, assertMatch, assertStringIncludes } from 'jsr:@std/assert@1'

// Importing the module would start a server; stub it out for unit tests.
Deno.serve = (() => ({})) as unknown as typeof Deno.serve
const m = await import('./index.ts')

const booking: import('./index.ts').BookingDetails = {
  reference: 'NR5-ABC234',
  status: 'confirmed',
  language: 'nb',
  serviceName: 'Small Piece',
  priceNok: 1500,
  startsAt: '2026-11-09T09:00:00Z', // 10:00 Oslo
  endsAt: '2026-11-09T11:00:00Z',
  customerName: 'Kari Nordmann',
  customerEmail: 'kari@example.com',
  customerPhone: '+47 911 22 333',
  tattooPlacement: 'Venstre underarm',
  tattooDescription: 'En liten botanisk kvist',
  requiresGuardianConsent: false,
  cancellationReason: null,
  artistName: 'Shmoky',
  artistEmail: 'shmoky@nr5studios.test',
}
const settings = { cancellationFeeNok: 500, cancellationDeadlineHours: 24, guardianConsentFormUrl: '/samtykke.pdf' }
const opts = { siteUrl: 'https://nr5.example', fromAddress: 'booking@nr5.example', now: new Date('2026-11-02T12:00:00Z') }
const note = (kind: import('./index.ts').Kind, recipient: import('./index.ts').Recipient, extra = {}) =>
  ({ id: 'n1', booking_id: 'b1', kind, recipient, previous_status: null, calendar_sequence: 0, attempts: 1, ...extra })

Deno.test('confirmed booking: customer gets Norwegian confirmation with calendar invite in Oslo time', () => {
  const email = m.buildEmail(note('booking_received', 'customer'), booking, settings, opts)!
  assertEquals(email.to, 'kari@example.com')
  assertMatch(email.subject, /^Bekreftet: Small Piece hos Shmoky/)
  assertStringIncludes(email.text, '10:00–12:00')
  assertStringIncludes(email.text, '500 kr')
  assertEquals(email.ics?.method, 'REQUEST')
  assertStringIncludes(email.ics!.content, 'METHOD:REQUEST')
  assertStringIncludes(email.ics!.content, 'DTSTART:20261109T090000Z')
  assertStringIncludes(email.ics!.content, 'UID:NR5-ABC234@nr5studios')
})

Deno.test('customer who booked in English gets English emails', () => {
  const email = m.buildEmail(note('booking_received', 'customer'), { ...booking, language: 'en' }, settings, opts)!
  assertMatch(email.subject, /^Confirmed: Small Piece with Shmoky/)
  assertStringIncludes(email.text, 'NOK 1,500')
})

Deno.test('under-age request: no calendar invite, consent form link, artist told to approve', () => {
  const pending = { ...booking, status: 'pending' as const, requiresGuardianConsent: true }
  const customer = m.buildEmail(note('booking_received', 'customer'), pending, settings, opts)!
  assertEquals(customer.ics, null)
  assertStringIncludes(customer.text, 'https://nr5.example/samtykke.pdf')
  const artist = m.buildEmail(note('booking_received', 'artist'), pending, settings, opts)!
  assertEquals(artist.ics, null)
  assertMatch(artist.subject, /venter på godkjenning/)
})

Deno.test('cancellation of a confirmed booking sends a calendar CANCEL with a higher sequence', () => {
  const cancelled = { ...booking, status: 'cancelled' as const, cancellationReason: 'Artisten er syk' }
  const email = m.buildEmail(note('booking_cancelled', 'customer', { previous_status: 'confirmed', calendar_sequence: 1 }), cancelled, settings, opts)!
  assertEquals(email.ics?.method, 'CANCEL')
  assertStringIncludes(email.ics!.content, 'STATUS:CANCELLED')
  assertStringIncludes(email.ics!.content, 'SEQUENCE:1')
  assertStringIncludes(email.text, 'Artisten er syk')
})

Deno.test('cancelling a request that was never confirmed sends no calendar file', () => {
  const email = m.buildEmail(note('booking_cancelled', 'customer', { previous_status: 'pending' }), { ...booking, status: 'cancelled' }, settings, opts)!
  assertEquals(email.ics, null)
})

Deno.test('calendar entries contain no unnecessary personal data', () => {
  const customer = m.buildEmail(note('booking_received', 'customer'), booking, settings, opts)!
  const artist = m.buildEmail(note('booking_received', 'artist'), booking, settings, opts)!
  for (const ics of [customer.ics!.content, artist.ics!.content]) {
    assert(!ics.includes('Nordmann'), 'surname leaked')
    assert(!ics.includes('911 22 333'), 'phone leaked')
    assert(!ics.includes('botanisk'), 'tattoo description leaked')
    assert(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75), 'line too long')
  }
  // The artist email itself does include what they need to prepare.
  assertStringIncludes(artist.text, 'Venstre underarm')
})

Deno.test('artist without an email address is skipped', () => {
  assertEquals(m.buildEmail(note('booking_received', 'artist'), { ...booking, artistEmail: null }, settings, opts), null)
})

Deno.test('user-provided text is HTML-escaped', () => {
  const email = m.buildEmail(note('booking_received', 'artist'), { ...booking, tattooDescription: '<script>alert(1)</script>' }, settings, opts)!
  assert(!email.html.includes('<script>'))
  assertStringIncludes(email.html, '&lt;script&gt;')
})

Deno.test('helpers: back-off grows and sender address is parsed', () => {
  assertEquals([1, 2, 3, 4, 5].map(m.backoffMinutes), [1, 5, 15, 60, 240])
  assertEquals(m.addressOf('Nr5 Studios <booking@x.no>'), 'booking@x.no')
})

Deno.test('handler refuses GET and waits when no API key is configured', async () => {
  assertEquals((await m.handler(new Request('http://x', { method: 'GET' }))).status, 405)
  Deno.env.delete('RESEND_API_KEY')
  const res = await m.handler(new Request('http://x', { method: 'POST' }))
  assertEquals(res.status, 503)
  assertEquals((await res.json()).error, 'email_not_configured')
})
