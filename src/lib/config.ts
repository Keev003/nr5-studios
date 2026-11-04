/**
 * Studio-wide settings. Change the studio name, contact details and policy
 * defaults here — every page reads from this file.
 * Business rules that staff must be able to change at runtime (prices, fees,
 * age limits) live in Supabase; these are only display fallbacks.
 */
export const studio = {
  name: 'Nr5 Studios',
  shortName: 'NR5 STUDIOS',
  /** Set to the logo file (e.g. '/logo.svg' in /public) when the real logo arrives. */
  logoUrl: null as string | null,
  tagline: 'Personlig kunst. Permanent uttrykk.',
  address: { street: 'Grünerløkka 12', postalCode: '0552', city: 'Oslo' },
  email: 'hei@nr5studios.no',
  phone: '+47 400 00 000',
  /** `days` are keys into the `hours` section of the dictionaries; `null` hours means closed. */
  openingHours: [
    { days: 'weekdays', hours: '10:00–18:00' },
    { days: 'saturday', hours: '11:00–16:00' },
    { days: 'sunday', hours: null },
  ] as const,
  social: {
    instagram: 'https://instagram.com/',
    facebook: 'https://facebook.com/',
    tiktok: 'https://tiktok.com/',
  },
  timeZone: 'Europe/Oslo',
} as const

export const bookingDefaults = {
  cancellationFeeNok: 500,
  cancellationDeadlineHours: 24,
  policyVersion: '2026-11-01',
  minimumAge: 18,
  /** Placeholder until the studio supplies its real consent form. */
  guardianConsentFormUrl: '/samtykkeskjema-placeholder.pdf',
} as const
