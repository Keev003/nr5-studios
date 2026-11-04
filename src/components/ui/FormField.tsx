import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

const controlClasses =
  'block w-full rounded-xl border bg-paper px-4 py-3 text-base text-ink placeholder:text-muted/70 transition-colors focus:border-olive focus:outline-none focus:ring-4 focus:ring-olive/15 disabled:bg-cream'

interface FieldShellProps {
  id: string
  label: string
  hint?: ReactNode
  error?: string
  required?: boolean
  children: ReactNode
}

/** Label + control + hint/error, wired up with the right aria attributes. */
function FieldShell({ id, label, hint, error, required, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

function describedBy(id: string, hint?: ReactNode, error?: string) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined
}

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: ReactNode
  error?: string
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(
  { label, hint, error, required, className, id: idProp, ...props },
  ref,
) {
  const generated = useId()
  const id = idProp ?? generated
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <input
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        aria-required={required}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(controlClasses, error ? 'border-danger' : 'border-line', className)}
        {...props}
      />
    </FieldShell>
  )
})

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: ReactNode
  error?: string
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(function TextareaField(
  { label, hint, error, required, className, id: idProp, rows = 4, ...props },
  ref,
) {
  const generated = useId()
  const id = idProp ?? generated
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-required={required}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(controlClasses, 'resize-y', error ? 'border-danger' : 'border-line', className)}
        {...props}
      />
    </FieldShell>
  )
})
