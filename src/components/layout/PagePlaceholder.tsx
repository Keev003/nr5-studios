import type { ReactNode } from 'react'
import { Container } from '@/components/ui'

/** Temporary page shell used until each phase fills the page in. */
export function PagePlaceholder({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Container className="py-24">
      <h1 className="text-3xl font-light sm:text-4xl">{title}</h1>
      {children && <div className="mt-6 max-w-2xl text-muted">{children}</div>}
    </Container>
  )
}
