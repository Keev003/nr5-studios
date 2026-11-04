import { ArrowRight } from 'lucide-react'
import { ButtonLink } from '@/components/ui'
import { bookingLinkFor, type ArtistProfile } from '@/data/artists'
import { useI18n } from '@/i18n/useI18n'

export function ArtistCard({ artist }: { artist: ArtistProfile }) {
  const { t, lang } = useI18n()
  return (
    <article className="group flex flex-col overflow-hidden rounded-card bg-paper shadow-card">
      <div className="overflow-hidden">
        <img
          src={artist.image}
          alt={t.home.portraitOf(artist.name)}
          loading="lazy"
          className="aspect-[4/5] w-full object-cover grayscale transition duration-700 group-hover:scale-[1.03] group-hover:grayscale-0 sm:aspect-[4/3]"
        />
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-olive">{artist.role[lang]}</p>
        <h3 className="mt-2 text-2xl font-light sm:text-3xl">{artist.name}</h3>
        <p className="mt-4 flex-1 leading-relaxed text-muted">{artist.bio[lang]}</p>
        <ul className="mt-6 flex flex-wrap gap-2" aria-label={t.home.stylesOf(artist.name)}>
          {artist.specialties.map((s) => (
            <li key={s} className="rounded-full bg-olive-light px-3 py-1 text-xs font-medium text-olive-dark">{s}</li>
          ))}
        </ul>
        <ButtonLink to={bookingLinkFor(artist.slug)} className="mt-8 self-start">
          {t.home.bookWith(artist.name)} <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
      </div>
    </article>
  )
}
