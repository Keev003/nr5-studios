import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  error?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, error, className, id: idProp, ...props },
  ref,
) {
  const generated = useId()
  const id = idProp ?? generated
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            'mt-0.5 size-5 shrink-0 cursor-pointer rounded border-2 accent-olive',
            error ? 'border-danger' : 'border-line',
          )}
          {...props}
        />
        <label htmlFor={id} className="cursor-pointer text-sm leading-relaxed text-ink">
          {label}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 pl-8 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
})
