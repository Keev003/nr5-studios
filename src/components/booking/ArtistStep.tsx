import { SelectableCard } from '@/components/ui'
import { useBooking } from '@/hooks/useBooking'
import { useI18n } from '@/i18n/useI18n'
import type { Artist } from '@/types/booking'
import { BookingNav } from './BookingNav'
import { StepHeading } from './StepHeading'

export function ArtistStep({ artists, onNext }: { artists: Artist[]; onNext: () => void }) {
  const { draft, selectArtist } = useBooking()
  const { t, lang } = useI18n()
  return (
    <>
      <StepHeading title={t.booking.artistTitle}>{t.booking.artistIntro}</StepHeading>
      <div role="radiogroup" aria-label={t.booking.artistsGroup} className="grid gap-4 sm:grid-cols-2">
        {artists.map((artist) => (
          <SelectableCard
            key={artist.id}
            selected={draft.artistId === artist.id}
            onSelect={() => selectArtist(artist.id)}
            label={artist.name}
            className="overflow-hidden p-0"
          >
            <img src={artist.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
            <div className="p-5">
              <p className="font-display text-2xl">{artist.name}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{lang === 'en' ? (artist.bioEn ?? artist.bio) : artist.bio}</p>
              <p className="mt-3 flex flex-wrap gap-1.5">
                {artist.specialties.map((s) => (
                  <span key={s} className="rounded-full bg-olive-light px-2.5 py-0.5 text-xs font-medium text-olive-dark">{s}</span>
                ))}
              </p>
            </div>
          </SelectableCard>
        ))}
      </div>
      <BookingNav onNext={onNext} nextDisabled={!draft.artistId} hint={draft.artistId ? undefined : t.booking.chooseArtistHint} />
    </>
  )
}
