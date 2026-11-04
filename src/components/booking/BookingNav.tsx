import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui'
import { useI18n } from '@/i18n/useI18n'

interface BookingNavProps {
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  /** Submit a form by id instead of calling onNext. */
  form?: string
  loading?: boolean
  hint?: string
}

/** Back/next controls. Sticks to the bottom of the screen on mobile so they're always in reach. */
export function BookingNav({ onBack, onNext, nextLabel, nextDisabled, form, loading, hint }: BookingNavProps) {
  const { t } = useI18n()
  return (
    <div className="sticky bottom-0 z-30 -mx-4 mt-10 border-t border-line bg-cream/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      {hint && <p className="mb-2 text-center text-xs text-muted sm:text-left">{hint}</p>}
      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <Button variant="ghost" onClick={onBack} className="px-4">
            <ArrowLeft className="size-4" aria-hidden /> {t.common.back}
          </Button>
        ) : (
          <span />
        )}
        {(onNext || form) && (
          <Button
            type={form ? 'submit' : 'button'}
            form={form}
            onClick={onNext}
            disabled={nextDisabled}
            loading={loading}
            className="min-w-36 flex-1 sm:flex-none"
          >
            {nextLabel ?? t.common.next} {!loading && <ArrowRight className="size-4" aria-hidden />}
          </Button>
        )}
      </div>
    </div>
  )
}
