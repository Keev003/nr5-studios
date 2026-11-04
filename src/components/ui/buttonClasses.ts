import { cn } from '@/utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 select-none'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-olive text-paper hover:bg-olive-dark',
  secondary: 'bg-ink text-paper hover:bg-ink/85',
  outline: 'border border-ink/20 bg-transparent text-ink hover:border-ink hover:bg-ink/5',
  ghost: 'bg-transparent text-ink hover:bg-ink/5',
  danger: 'bg-danger text-paper hover:bg-danger/90',
}

// Every size keeps a ≥44px touch target except `sm`, used only in dense desktop UI.
const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-sm',
  lg: 'h-14 px-8 text-base',
}

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className)
}
