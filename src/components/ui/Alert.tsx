import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

type Tone = 'info' | 'success' | 'warning' | 'error'

const config = {
  info: { icon: Info, cls: 'border-olive/30 bg-olive-light text-ink' },
  success: { icon: CheckCircle2, cls: 'border-success/30 bg-olive-light text-ink' },
  warning: { icon: AlertTriangle, cls: 'border-warning/30 bg-warning-light text-ink' },
  error: { icon: XCircle, cls: 'border-danger/30 bg-danger-light text-ink' },
} satisfies Record<Tone, { icon: typeof Info; cls: string }>

interface AlertProps {
  tone?: Tone
  title?: string
  children?: ReactNode
  className?: string
}

export function Alert({ tone = 'info', title, children, className }: AlertProps) {
  const { icon: Icon, cls } = config[tone]
  // Errors and warnings are announced immediately; info/success politely.
  const role = tone === 'error' || tone === 'warning' ? 'alert' : 'status'
  return (
    <div role={role} className={cn('flex gap-3 rounded-xl border p-4 text-sm', cls, className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  )
}
