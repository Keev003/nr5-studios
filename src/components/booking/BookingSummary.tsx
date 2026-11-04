import { CalendarDays, Clock, Tag, User } from 'lucide-react'
import { useI18n } from '@/i18n/useI18n'
import { formatServiceDuration } from '@/lib/services'
import { formatPrice, formatStudioDateLong, formatStudioTime } from '@/lib/time'
import type { Artist, Service } from '@/types/booking'

interface BookingSummaryProps {
  artist: Artist | null
  service: Service | null
  startsAt: string | null
}

/** Compact recap of the choices so far, shown beside the wizard on large screens. */
export function BookingSummary({ artist, service, startsAt }: BookingSummaryProps) {
  const { t, lang } = useI18n()
  const endsAt = startsAt && service ? new Date(new Date(startsAt).getTime() + service.durationMinutes * 60_000) : null
  const rows = [
    { icon: User, label: t.booking.summaryArtist, value: artist?.name },
    { icon: Tag, label: t.booking.summaryService, value: service?.name },
    { icon: Clock, label: t.booking.summaryDuration, value: service ? formatServiceDuration(service, lang) : undefined },
    {
      icon: CalendarDays,
      label: t.booking.summaryTime,
      value: startsAt && endsAt ? `${formatStudioDateLong(startsAt, lang)}, ${formatStudioTime(startsAt)}–${formatStudioTime(endsAt)}` : undefined,
    },
  ]
  return (
    <aside aria-label={t.booking.summaryTitle} className="rounded-card border border-line bg-paper p-6">
      <h2 className="font-display text-xl">{t.booking.summaryTitle}</h2>
      <dl className="mt-4 space-y-3 text-sm">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex gap-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-olive" aria-hidden />
            <div>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className={value ? 'font-medium first-letter:uppercase' : 'text-muted'}>{value ?? '–'}</dd>
            </div>
          </div>
        ))}
      </dl>
      {service && (
        <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-sm text-muted">{t.booking.estimatedPriceLabel}</span>
          <span className="text-lg font-semibold">{formatPrice(service.priceNok, lang)}</span>
        </div>
      )}
    </aside>
  )
}
