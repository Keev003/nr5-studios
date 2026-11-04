/**
 * Minimal RFC 5545 calendar file generator. Dependency-free so the same code
 * can be reused by the Edge Function that emails invitations.
 */

export interface CalendarEvent {
  uid: string
  title: string
  description: string
  location: string
  startsAt: Date
  endsAt: Date
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED'
  /** Increment when the event changes so calendars replace the old copy. */
  sequence?: number
  organizer?: { name: string; email: string }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** UTC form, e.g. 20261106T090000Z — unambiguous across DST without a VTIMEZONE block. */
export function icsDate(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

export function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Folds lines longer than 75 octets, as RFC 5545 §3.1 requires. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line
  const parts: string[] = []
  let current = ''
  let limit = 75
  for (const char of line) {
    if (encoder.encode(current + char).length > limit) {
      parts.push(current)
      current = ''
      limit = 74 // continuation lines start with a space
    }
    current += char
  }
  parts.push(current)
  return parts.join('\r\n ')
}

export function buildIcs(event: CalendarEvent, now: Date = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nr5 Studios//Booking//NO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(event.startsAt)}`,
    `DTEND:${icsDate(event.endsAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `LOCATION:${escapeText(event.location)}`,
    `STATUS:${event.status ?? 'CONFIRMED'}`,
    `SEQUENCE:${event.sequence ?? 0}`,
    ...(event.organizer ? [`ORGANIZER;CN=${escapeText(event.organizer.name)}:mailto:${event.organizer.email}`] : []),
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Påminnelse',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(foldLine).join('\r\n') + '\r\n'
}
