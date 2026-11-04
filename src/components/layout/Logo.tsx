import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n/useI18n'
import { studio } from '@/lib/config'
import { cn } from '@/utils/cn'

/**
 * Studio logo. Shows a typographic placeholder mark until `studio.logoUrl`
 * in `src/lib/config.ts` points at the real logo file.
 */
export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  const { t } = useI18n()
  return (
    <Link to="/" className={cn('group inline-flex items-center gap-2.5', className)}>
      {studio.logoUrl ? (
        <img src={studio.logoUrl} alt={studio.name} className={cn('h-9 w-auto', inverted && 'brightness-0 invert')} />
      ) : (
        <>
          <span
            aria-hidden
            className={cn(
              'flex size-9 items-center justify-center rounded-full border-2 font-display text-sm font-semibold italic',
              inverted ? 'border-paper text-paper' : 'border-ink text-ink',
            )}
          >
            5
          </span>
          <span className={cn('font-display text-lg font-medium tracking-[0.12em]', inverted ? 'text-paper' : 'text-ink')}>
            {studio.shortName}
          </span>
        </>
      )}
      <span className="sr-only"> – {t.common.toFrontPage}</span>
    </Link>
  )
}
