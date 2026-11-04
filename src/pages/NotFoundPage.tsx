import { ButtonLink, Container } from '@/components/ui'
import { useI18n } from '@/i18n/useI18n'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function NotFoundPage() {
  const { t } = useI18n()
  usePageTitle(t.notFound.title)
  return (
    <Container className="py-32 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-olive">404</p>
      <h1 className="mt-3 text-3xl font-light sm:text-4xl">{t.notFound.title}</h1>
      <p className="mx-auto mt-4 max-w-md text-muted">{t.notFound.text}</p>
      <ButtonLink to="/" className="mt-8">{t.common.backToFrontPage}</ButtonLink>
    </Container>
  )
}
