import { Clock } from 'lucide-react'
import { SelectableCard } from '@/components/ui'
import { useBooking } from '@/hooks/useBooking'
import { useI18n } from '@/i18n/useI18n'
import { formatPrice } from '@/lib/time'
import { formatServiceDuration } from '@/lib/services'
import type { Service } from '@/types/booking'
import { BookingNav } from './BookingNav'
import { StepHeading } from './StepHeading'

export function ServiceStep({ services, onBack, onNext }: { services: Service[]; onBack: () => void; onNext: () => void }) {
  const { draft, selectService } = useBooking()
  const { t, lang } = useI18n()
  return (
    <>
      <StepHeading title={t.booking.serviceTitle}>{t.booking.serviceIntro}</StepHeading>
      <div role="radiogroup" aria-label={t.booking.servicesGroup} className="grid gap-4 sm:grid-cols-2">
        {services.map((service) => (
          <SelectableCard
            key={service.id}
            selected={draft.serviceId === service.id}
            onSelect={() => selectService(service.id)}
            className="flex flex-col"
          >
            <p className="pr-8 font-display text-2xl" lang="en">{service.name}</p>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted" lang="en">{service.description}</p>
            <div className="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4">
              <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                <Clock className="size-4" aria-hidden />
                {formatServiceDuration(service, lang)}
              </span>
              <span className="text-right">
                <span className="block text-lg font-semibold">{formatPrice(service.priceNok, lang)}</span>
                {service.priceNok > 0 && <span className="block text-xs text-muted">{t.booking.estimatedPrice}</span>}
              </span>
            </div>
          </SelectableCard>
        ))}
      </div>
      <BookingNav onBack={onBack} onNext={onNext} nextDisabled={!draft.serviceId} hint={draft.serviceId ? undefined : t.booking.chooseServiceHint} />
    </>
  )
}
