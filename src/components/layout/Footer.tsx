import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'
import { FacebookIcon, InstagramIcon } from '@/components/ui/SocialIcons'
import { Container } from '@/components/ui'
import { useI18n } from '@/i18n/useI18n'
import { studio } from '@/lib/config'
import { Logo } from './Logo'
import { mainNav } from './navigation'

export function Footer() {
  const year = new Date().getFullYear()
  const { t } = useI18n()
  return (
    <footer className="bg-ink text-paper">
      <Container className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo inverted />
          <p className="max-w-xs text-sm leading-relaxed text-paper/65">{t.footer.tagline}</p>
          <div className="flex gap-2">
            <a href={studio.social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex size-11 items-center justify-center rounded-full border border-paper/20 transition-colors hover:border-olive hover:bg-olive">
              <InstagramIcon className="size-5" aria-hidden />
            </a>
            <a href={studio.social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="flex size-11 items-center justify-center rounded-full border border-paper/20 transition-colors hover:border-olive hover:bg-olive">
              <FacebookIcon className="size-5" aria-hidden />
            </a>
          </div>
        </div>
        <nav aria-label={t.footer.footerMenu}>
          <h2 className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-paper/50">{t.footer.navigation}</h2>
          <ul className="space-y-2.5 text-sm">
            {mainNav.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-paper/80 hover:text-paper">{t.nav[item.label]}</Link>
              </li>
            ))}
            <li><Link to="/login" className="text-paper/80 hover:text-paper">{t.nav.forArtists}</Link></li>
          </ul>
        </nav>
        <div>
          <h2 className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-paper/50">{t.footer.contact}</h2>
          <ul className="space-y-3 text-sm text-paper/80">
            <li className="flex gap-2.5"><MapPin className="size-4 shrink-0 translate-y-0.5" aria-hidden />{studio.address.street}, {studio.address.postalCode} {studio.address.city}</li>
            <li><a href={`mailto:${studio.email}`} className="flex gap-2.5 hover:text-paper"><Mail className="size-4 shrink-0 translate-y-0.5" aria-hidden />{studio.email}</a></li>
            <li><a href={`tel:${studio.phone.replace(/\s/g, '')}`} className="flex gap-2.5 hover:text-paper"><Phone className="size-4 shrink-0 translate-y-0.5" aria-hidden />{studio.phone}</a></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-paper/50">{t.footer.openingHours}</h2>
          <dl className="space-y-2 text-sm">
            {studio.openingHours.map((row) => (
              <div key={row.days} className="flex justify-between gap-4 text-paper/80">
                <dt>{t.hours[row.days]}</dt>
                <dd className="tabular-nums">{row.hours ?? t.hours.closed}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
      <div className="border-t border-paper/10">
        <Container className="flex flex-col gap-3 py-6 text-xs text-paper/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {studio.name}. {t.footer.rights}</p>
          <div className="flex gap-6">
            <Link to="/personvern" className="hover:text-paper">{t.footer.privacy}</Link>
            <Link to="/vilkar" className="hover:text-paper">{t.footer.terms}</Link>
          </div>
        </Container>
      </div>
    </footer>
  )
}
