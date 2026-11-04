import { ArrowDown } from 'lucide-react'
import { ButtonLink, Container } from '@/components/ui'
import { images } from '@/data/images'
import { studio } from '@/lib/config'
import { useI18n } from '@/i18n/useI18n'

export function Hero() {
  const { t } = useI18n()
  return (
    <section aria-labelledby="hero-heading" className="relative isolate -mt-16 overflow-hidden bg-ink text-paper sm:-mt-20">
      <img
        src={images.hero}
        alt=""
        className="absolute inset-0 -z-10 size-full object-cover opacity-55"
        fetchPriority="high"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/40 to-ink/20" />
      <Container className="flex min-h-[85svh] flex-col justify-end pb-16 pt-36 sm:pb-24">
        <p className="animate-fade-in mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-olive-light">
          {studio.name} · {studio.address.city}
        </p>
        <h1 id="hero-heading" className="animate-fade-in max-w-4xl text-4xl font-light leading-[1.05] sm:text-6xl lg:text-7xl">
          {t.home.heroTitleStart}
          <em className="font-normal italic text-olive-light">{t.home.heroTitleEmphasis}</em>
        </h1>
        <p className="animate-fade-in mt-6 max-w-xl text-base leading-relaxed text-paper/75">
          {t.home.heroText}
        </p>
        <div className="animate-fade-in mt-10 flex flex-col gap-3 sm:flex-row">
          <ButtonLink to="/booking" size="lg">{t.common.bookTime}</ButtonLink>
          <ButtonLink to="/#artister" size="lg" variant="outline" className="border-paper/30 text-paper hover:border-paper hover:bg-paper/10">
            {t.home.meetArtists}
          </ButtonLink>
        </div>
        <a href="#om-oss" className="mt-16 hidden items-center gap-2 self-start text-sm text-paper/60 hover:text-paper sm:inline-flex">
          <ArrowDown className="size-4 animate-bounce" aria-hidden /> {t.home.scrollDown}
        </a>
      </Container>
    </section>
  )
}
