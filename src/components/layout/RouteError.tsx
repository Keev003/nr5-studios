import { useEffect } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { Button, ButtonLink, Container } from '@/components/ui'
import { useI18n } from '@/i18n/useI18n'
import NotFoundPage from '@/pages/NotFoundPage'
import { isChunkLoadError, reloadOnceForNewVersion } from '@/utils/staleDeploy'

/** Shown instead of React Router's technical default when a page fails to render or load. */
export function RouteError() {
  const error = useRouteError()
  const { t } = useI18n()
  const stale = isChunkLoadError(error)

  useEffect(() => {
    if (stale) reloadOnceForNewVersion()
    else console.error(error)
  }, [stale, error])

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />

  return (
    <Container className="max-w-lg py-24 text-center">
      <AlertTriangle className="mx-auto size-10 text-warning" aria-hidden />
      <h1 className="mt-4 text-3xl font-light">{t.errorPage.title}</h1>
      <p className="mt-3 text-muted">{t.errorPage.text}</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button onClick={() => window.location.reload()}>
          <RotateCw className="size-4" aria-hidden /> {t.errorPage.reload}
        </Button>
        <ButtonLink to="/" variant="outline" reloadDocument>{t.common.backToFrontPage}</ButtonLink>
      </div>
    </Container>
  )
}
