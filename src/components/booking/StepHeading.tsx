import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Heading for each booking step. Receives focus when the step appears, so
 * screen-reader and keyboard users land at the start of the new content.
 */
export function StepHeading({ title, children }: { title: string; children?: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [])
  return (
    <header className="mb-6 sm:mb-8">
      <h2 ref={ref} tabIndex={-1} className="text-2xl font-light outline-none sm:text-3xl">
        {title}
      </h2>
      {children && <p className="mt-2 text-muted">{children}</p>}
    </header>
  )
}
