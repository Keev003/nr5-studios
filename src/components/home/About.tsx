import { Section } from '@/components/ui'
import { images } from '@/data/images'
import { useI18n } from '@/i18n/useI18n'
import { studio } from '@/lib/config'

export function About() {
  const { t } = useI18n()
  return (
    <Section id="om-oss" tone="paper">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="relative">
          <img src={images.about} alt={t.home.aboutImageAlt} loading="lazy" className="aspect-[4/5] max-h-[560px] w-full rounded-card object-cover" />
          <div className="absolute -bottom-6 -right-2 hidden rounded-card bg-olive px-6 py-5 text-paper shadow-card sm:block lg:-right-8">
            <p className="font-display text-4xl font-light">10+</p>
            <p className="text-sm text-paper/80">{t.home.yearsExperience}</p>
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-olive">{t.home.aboutEyebrow}</p>
          <h2 id="om-oss-heading" className="text-3xl font-light sm:text-4xl">{t.home.aboutTitle}</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-muted">
            <p>{t.home.aboutP1(studio.name)}</p>
            <p>{t.home.aboutP2}</p>
          </div>
          <dl className="mt-10 grid gap-6 sm:grid-cols-3">
            {t.home.values.map((v) => (
              <div key={v.title} className="border-t-2 border-olive pt-4">
                <dt className="font-semibold">{v.title}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted">{v.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Section>
  )
}
