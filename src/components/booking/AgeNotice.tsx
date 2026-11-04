import { Download } from 'lucide-react'
import { Alert } from '@/components/ui'
import { useI18n } from '@/i18n/useI18n'
import type { AgeCheck } from '@/lib/age'
import type { StudioSettings } from '@/types/booking'

/** Explains what the studio's age policy means for this booking. Renders nothing for adults. */
export function AgeNotice({ check, settings }: { check: AgeCheck; settings: StudioSettings }) {
  const { t } = useI18n()
  if (check.kind === 'adult') return null
  if (check.kind === 'not_permitted') {
    return (
      <Alert tone="error" title={t.age.minTitle(settings.minimumAge)}>
        {t.age.minText(check.age, settings.minimumAge)}
      </Alert>
    )
  }
  return (
    <Alert tone="warning" title={t.age.consentTitle}>
      <p>{t.age.consentText(check.age, settings.minimumAge)}</p>
      <p className="mt-1">{t.age.mayDecline}</p>
      <a href={settings.guardianConsentFormUrl} download className="mt-3 inline-flex items-center gap-1.5 font-semibold text-ink underline underline-offset-4">
        <Download className="size-4" aria-hidden /> {t.age.downloadForm}
      </a>
    </Alert>
  )
}
