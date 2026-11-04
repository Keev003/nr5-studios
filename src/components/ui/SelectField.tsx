import { forwardRef, useId, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hideLabel?: boolean
  hint?: string
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, hideLabel, hint, className, id: idProp, children, ...props },
  ref,
) {
  const generated = useId()
  const id = idProp ?? generated
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className={cn('block text-sm font-medium', hideLabel && 'sr-only')}>{label}</label>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="h-11 w-full appearance-none rounded-xl border border-line bg-paper pl-4 pr-10 text-sm focus:border-olive focus:outline-none focus:ring-4 focus:ring-olive/15"
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>}
    </div>
  )
})
