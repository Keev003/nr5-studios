import { Loader2 } from 'lucide-react'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/utils/cn'

export function Spinner({ label, className }: { label?: string; className?: string }) {
  const { t } = useI18n()
  return (
    <div role="status" className={cn('flex items-center justify-center gap-2 py-8 text-muted', className)}>
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span className="text-sm">{label ?? t.common.loading}</span>
    </div>
  )
}
