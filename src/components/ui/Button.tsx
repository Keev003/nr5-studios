import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { buttonClasses, type ButtonSize as Size, type ButtonVariant as Variant } from './buttonClasses'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, disabled, className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})

interface ButtonLinkProps extends LinkProps {
  variant?: Variant
  size?: Size
}

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className as string | undefined)} {...props} />
}
