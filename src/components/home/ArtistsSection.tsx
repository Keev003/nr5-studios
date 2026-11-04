import { Section } from '@/components/ui'
import { artists as staticArtists, type ArtistProfile } from '@/data/artists'
import { usePublicArtists } from '@/hooks/usePublicCatalog'
import { useI18n } from '@/i18n/useI18n'
import { ArtistCard } from './ArtistCard'

const GENERIC_ROLE = { nb: 'Tatovør', en: 'Tattoo artist' }

export function ArtistsSection() {
  const { t } = useI18n()
  const live = usePublicArtists()

  // Live data (edited in the dashboard) wins; the static profiles are a fallback and supply the role line.
  const artists: ArtistProfile[] = live
    ? live.map((a) => {
        const fallback = staticArtists.find((s) => s.slug === a.slug)
        return {
          slug: a.slug,
          name: a.name,
          role: fallback?.role ?? GENERIC_ROLE,
          bio: { nb: a.bio || fallback?.bio.nb || '', en: a.bioEn || a.bio || fallback?.bio.en || '' },
          specialties: a.specialties,
          image: a.imageUrl || fallback?.image || '',
        }
      })
    : staticArtists

  return (
    <Section id="artister" eyebrow={t.home.artistsEyebrow} title={t.home.artistsTitle} intro={t.home.artistsIntro}>
      <div className="grid gap-8 md:grid-cols-2">
        {artists.map((a) => (
          <ArtistCard key={a.slug} artist={a} />
        ))}
      </div>
    </Section>
  )
}
