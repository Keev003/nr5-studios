import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SelectableCardProps {
  selected: boolean
  onSelect: () => void
  children: ReactNode
  className?: string
  disabled?: boolean
  /** Accessible name when the visible content is not enough. */
  label?: string
}

/**
 * Card that behaves like a radio option. Rendered inside a `role="radiogroup"`
 * container so keyboard and screen-reader users get single-choice semantics.
 */
export function SelectableCard({ selected, onSelect, children, className, disabled, label }: SelectableCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'relative w-full rounded-card border-2 bg-paper p-5 text-left transition-all duration-200',
        'hover:border-olive/60 disabled:cursor-not-allowed disabled:opacity-50',
        selected ? 'border-olive shadow-card ring-4 ring-olive/10' : 'border-line',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute right-4 top-4 flex size-6 items-center justify-center rounded-full border-2 transition-colors',
          selected ? 'border-olive bg-olive text-paper' : 'border-line bg-paper',
        )}
      >
        {selected && <Check className="size-3.5" strokeWidth={3} />}
      </span>
      {children}
    </button>
  )
}
