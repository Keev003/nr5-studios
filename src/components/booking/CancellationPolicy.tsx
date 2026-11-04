import { useI18n } from '@/i18n/useI18n'
import { studio } from '@/lib/config'
import type { StudioSettings } from '@/types/booking'
import { cn } from '@/utils/cn'

type PolicySettings = Pick<StudioSettings, 'cancellationDeadlineHours' | 'lateCancellationHours' | 'lateCancellationPercent'>

/** The studio's cancellation terms, with hours and percentage from the live settings. */
export function CancellationPolicy({ settings, headingLevel = 'h2', className }: { settings: PolicySettings; headingLevel?: 'h2' | 'h3'; className?: string }) {
  const { t } = useI18n()
  const Heading = headingLevel
  const rules = t.cancellation.rules(settings.cancellationDeadlineHours, settings.lateCancellationHours, settings.lateCancellationPercent)
  return (
    <section className={className}>
      <Heading className="mb-3 font-sans text-lg font-semibold text-ink">{t.cancellation.title}</Heading>
      <ul className="list-disc space-y-1.5 pl-5">
        {rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      <p className={cn('mt-3')}>{t.cancellation.howTo(studio.email, studio.phone)}</p>
      <p className="mt-3 italic">{t.cancellation.closing}</p>
    </section>
  )
}
