import { Check } from 'lucide-react'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/utils/cn'

interface StepperProps {
  steps: readonly string[]
  /** Zero-based index of the active step. */
  current: number
  /** Called when a completed step is clicked, to jump back to it. */
  onStepClick?: (index: number) => void
}

/** Booking progress indicator. Compact bar on mobile, labelled steps from `sm`. */
export function Stepper({ steps, current, onStepClick }: StepperProps) {
  const { t } = useI18n()
  const progress = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 100
  return (
    <nav aria-label={t.booking.progressLabel}>
      <p className="mb-3 text-sm text-muted sm:hidden">
        {t.booking.stepOf(current + 1, steps.length)}: <span className="font-medium text-ink">{steps[current]}</span>
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-line sm:hidden" aria-hidden>
        <div className="h-full rounded-full bg-olive transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <ol className="hidden items-center sm:flex">
        {steps.map((label, i) => {
          const done = i < current
          const active = i === current
          const clickable = done && onStepClick
          return (
            <li key={label} className={cn('flex items-center', i < steps.length - 1 && 'flex-1')}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick(i)}
                aria-current={active ? 'step' : undefined}
                className={cn('group flex items-center gap-2.5', clickable ? 'cursor-pointer' : 'cursor-default')}
              >
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                    done && 'border-olive bg-olive text-paper group-hover:bg-olive-dark',
                    active && 'border-olive bg-paper text-olive',
                    !done && !active && 'border-line bg-paper text-muted',
                  )}
                >
                  {done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : i + 1}
                </span>
                <span className={cn('whitespace-nowrap text-sm', active ? 'font-semibold text-ink' : 'text-muted')}>
                  {label}
                  {done && <span className="sr-only"> {t.booking.completed}</span>}
                </span>
              </button>
              {i < steps.length - 1 && (
                <span aria-hidden className={cn('mx-3 h-0.5 flex-1 rounded-full', done ? 'bg-olive' : 'bg-line')} />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
