import { CalendarCheck, ClipboardList, PenTool, UserRound } from 'lucide-react'
import { ButtonLink, Section } from '@/components/ui'
import { useI18n } from '@/i18n/useI18n'

const icons = [UserRound, ClipboardList, CalendarCheck, PenTool]

export function HowItWorks() {
  const { t } = useI18n()
  return (
    <Section id="slik-booker-du" tone="olive" eyebrow={t.home.howEyebrow} title={t.home.howTitle} intro={t.home.howIntro}>
      <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {t.home.howSteps.map(({ title, text }, i) => {
          const Icon = icons[i] ?? UserRound
          return (
            <li key={title} className="relative rounded-card bg-paper p-6 shadow-card">
              {/* Decorative step number drawn with CSS so it is not read out or treated as body text. */}
              <span aria-hidden data-step={`0${i + 1}`} className="block font-display text-5xl font-light leading-none text-olive/20 before:content-[attr(data-step)]" />
              <Icon className="mt-2 size-7 text-olive" aria-hidden />
              <h3 className="mt-4 font-sans text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          )
        })}
      </ol>
      <ButtonLink to="/booking" size="lg" className="mt-12">{t.home.startBooking}</ButtonLink>
    </Section>
  )
}
