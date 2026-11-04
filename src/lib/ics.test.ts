import { buildIcs, escapeText, foldLine } from './ics'

describe('buildIcs', () => {
  const ics = buildIcs(
    {
      uid: 'NR5-ABC123@nr5studios.no',
      title: 'Tatovering hos Shmoky, Nr5 Studios',
      description: 'Bookingreferanse: NR5-ABC123',
      location: 'Grünerløkka 12, 0552 Oslo',
      startsAt: new Date('2026-11-09T09:00:00Z'),
      endsAt: new Date('2026-11-09T11:00:00Z'),
    },
    new Date('2026-11-02T12:00:00Z'),
  )

  it('produces a CRLF-separated VCALENDAR with UTC times', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics).toContain('DTSTART:20261109T090000Z\r\n')
    expect(ics).toContain('DTEND:20261109T110000Z\r\n')
    expect(ics).toContain('DTSTAMP:20261102T120000Z\r\n')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true)
  })

  it('escapes commas, semicolons and newlines in text', () => {
    expect(escapeText('a,b;c\nd\\e')).toBe('a\\,b\\;c\\nd\\\\e')
    expect(ics).toContain('LOCATION:Grünerløkka 12\\, 0552 Oslo')
  })
})

describe('foldLine', () => {
  it('folds long lines at 75 octets without splitting multi-byte characters', () => {
    const folded = foldLine('DESCRIPTION:' + 'æ'.repeat(60))
    const lines = folded.split('\r\n')
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true)
    expect(lines.slice(1).every((l) => l.startsWith(' '))).toBe(true)
    expect(lines.map((l, i) => (i ? l.slice(1) : l)).join('')).toBe('DESCRIPTION:' + 'æ'.repeat(60))
  })
})
