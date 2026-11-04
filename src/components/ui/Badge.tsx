import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type Tone = 'neutral' | 'olive' | 'warning' | 'danger' | 'success'

const tones: Record<Tone, string> = {
  neutral: 'bg-ink/5 text-ink',
  olive: 'bg-olive-light text-olive-dark',
  warning: 'bg-warning-light text-warning',
  danger: 'bg-danger-light text-danger',
  success: 'bg-olive-light text-success',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone], className)}
      {...props}
    />
  )
}
