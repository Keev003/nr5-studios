import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Container } from './Container'

interface SectionProps {
  id?: string
  eyebrow?: string
  title?: string
  intro?: ReactNode
  tone?: 'cream' | 'paper' | 'ink' | 'olive'
  className?: string
  children: ReactNode
}

const tones = {
  cream: 'bg-cream text-ink',
  paper: 'bg-paper text-ink',
  ink: 'bg-ink text-paper',
  olive: 'bg-olive-light text-ink',
}

/** Page section with a consistent heading block and vertical rhythm. */
export function Section({ id, eyebrow, title, intro, tone = 'cream', className, children }: SectionProps) {
  const headingId = id ? `${id}-heading` : undefined
  return (
    <section id={id} aria-labelledby={title ? headingId : undefined} className={cn('py-16 sm:py-24', tones[tone], className)}>
      <Container>
        {(eyebrow || title || intro) && (
          <header className="mb-10 max-w-2xl sm:mb-12">
            {eyebrow && (
              <p className={cn('mb-3 text-xs font-semibold uppercase tracking-[0.2em]', tone === 'ink' ? 'text-olive-light' : 'text-olive')}>
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 id={headingId} className="text-3xl font-light sm:text-4xl">
                {title}
              </h2>
            )}
            {intro && <div className={cn('mt-4 text-base leading-relaxed', tone === 'ink' ? 'text-paper/70' : 'text-muted')}>{intro}</div>}
          </header>
        )}
        {children}
      </Container>
    </section>
  )
}
