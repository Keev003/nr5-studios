import { render, screen } from '@testing-library/react'
import { checkAge } from '@/lib/age'
import { demoSettings } from '@/services/demoData'
import { AgeNotice } from './AgeNotice'

describe('AgeNotice (guardian-consent flow, customer side)', () => {
  it('shows nothing for adults', () => {
    const { container } = render(<AgeNotice check={checkAge('1990-01-01', '2026-12-01', demoSettings)} settings={demoSettings} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('explains the requirement and offers the consent form to under-18s', () => {
    render(<AgeNotice check={checkAge('2009-06-15', '2026-12-01', demoSettings)} settings={demoSettings} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Du er 17 år på timedatoen')
    expect(screen.getByRole('alert')).toHaveTextContent('ikke bekreftet før studioet har vurdert den')
    expect(screen.getByRole('link', { name: /samtykkeskjema/i })).toHaveAttribute('href', demoSettings.guardianConsentFormUrl)
  })

  it('blocks minors when the studio does not accept them at all', () => {
    const reject = { ...demoSettings, minorPolicy: 'reject' as const }
    render(<AgeNotice check={checkAge('2010-01-01', '2026-12-01', reject)} settings={reject} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Du må være minst 18 år')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
