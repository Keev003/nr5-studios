import { Languages } from 'lucide-react'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/utils/cn'

/** NO ⇄ EN switch. Shows the language you'll switch *to*. */
export function LanguageToggle({ inverted = false, className }: { inverted?: boolean; className?: string }) {
  const { t, toggle } = useI18n()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t.meta.switchTo}
      title={t.meta.switchTo}
      className={cn(
        'inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors',
        inverted ? 'text-paper hover:bg-paper/10' : 'text-ink hover:bg-ink/5',
        className,
      )}
    >
      <Languages className="size-4" aria-hidden />
      <span lang={t.meta.switchLabel === 'EN' ? 'en' : 'nb'}>{t.meta.switchLabel}</span>
    </button>
  )
}
