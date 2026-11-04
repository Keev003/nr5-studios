import type { Localized } from '@/i18n/localized'

/**
 * Placeholder photography from Unsplash (free licence). Replace with the
 * studio's own images by swapping these URLs or importing local files.
 */
const unsplash = (id: string, width: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=75`

export const images = {
  hero: unsplash('1552627019-947c3789ffb5', 2000),
  about: unsplash('1565058379802-bbe93b2f703a', 1200),
  shmoky: unsplash('1521119989659-a83eee488004', 800),
  aj: unsplash('1475403614135-5f1aa0eb5015', 800),
} as const

export interface GalleryImage {
  src: string
  thumb: string
  alt: Localized
  artist: string
}

const gallery = (id: string, alt: Localized, artist: string): GalleryImage => ({
  src: unsplash(id, 1600),
  thumb: unsplash(id, 700),
  alt,
  artist,
})

export const galleryImages: GalleryImage[] = [
  gallery('1598371839696-5c5bb00bdc28', { nb: 'Stor blomstertatovering over skulder og overarm', en: 'Large floral tattoo over shoulder and upper arm' }, 'Shmoky'),
  gallery('1611501275019-9b5cda994e8d', { nb: 'Stor svart-og-grå tatovering med ornamentikk på ryggen', en: 'Large black-and-grey ornamental back piece' }, 'AJ'),
  gallery('1562962230-16e4623d36e6', { nb: 'Fine-line blomstertatovering på underarmen', en: 'Fine-line floral tattoo on the forearm' }, 'AJ'),
  gallery('1586243287039-23f4c8e2e7ab', { nb: 'Geometrisk mandala-tatovering mellom skulderbladene', en: 'Geometric mandala tattoo between the shoulder blades' }, 'Shmoky'),
  gallery('1604374376934-2df6fad6519b', { nb: 'Fullarm med sammenhengende motiv i svart blekk', en: 'Full sleeve with a continuous design in black ink' }, 'Shmoky'),
  gallery('1568515045052-f9a854d70bfd', { nb: 'Tatovør i arbeid med fargelegging av en arm', en: 'Tattoo artist at work shading an arm' }, 'AJ'),
]
