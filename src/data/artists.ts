import type { Localized } from '@/i18n/localized'
import { images } from './images'

/**
 * Static artist content for the homepage. The booking flow reads artists
 * from Supabase; `slug` matches the `artists.slug` column so links like
 * `/booking?artist=shmoky` keep working.
 */
export interface ArtistProfile {
  slug: string
  name: string
  role: Localized
  bio: Localized
  specialties: string[]
  image: string
}

export const artists: ArtistProfile[] = [
  {
    slug: 'shmoky',
    name: 'Shmoky',
    role: { nb: 'Grunnlegger og tatovør', en: 'Founder and tattoo artist' },
    bio: {
      nb: 'Shmoky har tatovert i over ti år og er kjent for tunge, rene linjer og store prosjekter som får tid til å vokse over flere økter. Liker å jobbe tett med kunden fra første skisse.',
      en: 'Shmoky has been tattooing for more than ten years and is known for bold, clean lines and large projects that grow over several sessions. Loves working closely with the client from the very first sketch.',
    },
    specialties: ['Blackwork', 'Neo-traditional', 'Large projects'],
    image: images.shmoky,
  },
  {
    slug: 'aj',
    name: 'AJ',
    role: { nb: 'Tatovør', en: 'Tattoo artist' },
    bio: {
      nb: 'AJ har bakgrunn fra illustrasjon og lager detaljerte, finlinjede motiver med mye bevegelse. Perfekt for deg som vil ha noe delikat, personlig og tidløst – stort eller lite.',
      en: 'AJ comes from an illustration background and creates detailed fine-line designs full of movement. Perfect if you want something delicate, personal and timeless – big or small.',
    },
    specialties: ['Fine line', 'Botanical', 'Lettering'],
    image: images.aj,
  },
]

export const bookingLinkFor = (slug: string) => `/booking?artist=${encodeURIComponent(slug)}`
