import { PagePlaceholder } from '@/components/layout/PagePlaceholder'
import { useI18n } from '@/i18n/useI18n'

export default function PrivacyPage() {
  const { t } = useI18n()
  return <PagePlaceholder title={t.placeholders.privacyTitle}>{t.placeholders.privacyText}</PagePlaceholder>
}
