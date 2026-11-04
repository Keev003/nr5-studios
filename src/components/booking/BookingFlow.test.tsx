import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { BookingProvider } from '@/contexts/BookingContext'
import BookingPage from '@/pages/BookingPage'
import { bookingRepository } from '@/services/bookingRepository'
import { demoArtists, demoServices, demoSettings } from '@/services/demoData'
import { ArtistStep } from './ArtistStep'
import { ReviewStep } from './ReviewStep'
import { ServiceStep } from './ServiceStep'

const withProvider = (ui: ReactNode) =>
  render(
    <MemoryRouter>
      <BookingProvider>{ui}</BookingProvider>
    </MemoryRouter>,
  )

beforeEach(() => sessionStorage.clear())

describe('Step 1 – artist selection', () => {
  it('requires exactly one artist before continuing', async () => {
    const onNext = vi.fn()
    withProvider(<ArtistStep artists={demoArtists} onNext={onNext} />)
    const next = screen.getByRole('button', { name: /neste/i })
    expect(next).toBeDisabled()

    await userEvent.click(screen.getByRole('radio', { name: 'Shmoky' }))
    await userEvent.click(screen.getByRole('radio', { name: 'AJ' }))
    expect(screen.getByRole('radio', { name: 'AJ' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Shmoky' })).toHaveAttribute('aria-checked', 'false')

    await userEvent.click(next)
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('preselects the artist from ?artist=slug', async () => {
    render(
      <MemoryRouter initialEntries={['/booking?artist=aj']}>
        <BookingProvider>
          <Routes>
            <Route path="/booking" element={<BookingPage />} />
          </Routes>
        </BookingProvider>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByRole('radio', { name: 'AJ' })).toHaveAttribute('aria-checked', 'true'))
  })
})

describe('Step 2 – service selection', () => {
  it('shows all four services with estimated prices and enables Neste once one is chosen', async () => {
    withProvider(<ServiceStep services={demoServices} onBack={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(screen.getByText('Gratis')).toBeInTheDocument()
    expect(screen.getByText('4 000 kr')).toBeInTheDocument()

    const next = screen.getByRole('button', { name: /neste/i })
    expect(next).toBeDisabled()
    await userEvent.click(screen.getByText('Half Day'))
    expect(next).toBeEnabled()
  })
})

describe('Step 5 – cancellation policy', () => {
  const draft = {
    artistId: demoArtists[0]!.id,
    serviceId: 'half-day',
    date: '2026-11-06',
    startsAt: '2026-11-06T09:00:00.000Z',
    customer: {
      fullName: 'Test Testesen',
      dateOfBirth: '1990-01-01',
      email: 'test@example.com',
      phone: '+47 400 00 000',
      tattooPlacement: 'Rygg',
      tattooDescription: 'En stor geometrisk mandala.',
    },
  }

  it('cannot be submitted until the unchecked policy box is ticked', async () => {
    sessionStorage.setItem('nr5-booking-draft', JSON.stringify(draft))
    const create = vi.spyOn(bookingRepository, 'createBooking').mockResolvedValue({
      reference: 'NR5-TEST01',
      status: 'confirmed',
      requiresGuardianConsent: false,
      artistName: 'Shmoky',
      serviceName: 'Half Day',
      priceNok: 4000,
      startsAt: draft.startsAt,
      endsAt: '2026-11-06T13:00:00.000Z',
    })
    const onBooked = vi.fn()
    withProvider(
      <ReviewStep
        artist={demoArtists[0]!}
        service={demoServices[2]!}
        settings={demoSettings}
        onEdit={vi.fn()}
        onBack={vi.fn()}
        onBooked={onBooked}
      />,
    )

    // The studio's full cancellation terms are shown right above the checkbox.
    expect(screen.getByRole('heading', { name: 'Vilkår for avbestilling' })).toBeInTheDocument()
    expect(screen.getByText(/senest 48 timer før/)).toBeInTheDocument()
    expect(screen.getByText(/faktureres 50 % av det avtalte beløpet/)).toBeInTheDocument()
    expect(screen.getByText(/manglende oppmøte uten forhåndsvarsel faktureres 100 %/)).toBeInTheDocument()

    const checkbox = screen.getByRole('checkbox', { name: /lest og forstått avbestillingsvilkårene/ })
    expect(checkbox).not.toBeChecked()

    await userEvent.click(screen.getByRole('button', { name: /bekreft booking/i }))
    expect(screen.getByText(/du må bekrefte avbestillingsvilkårene/i)).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()

    await userEvent.click(checkbox)
    await userEvent.click(screen.getByRole('button', { name: /bekreft booking/i }))
    await waitFor(() => expect(onBooked).toHaveBeenCalledOnce())
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ cancellationPolicyAccepted: true, cancellationPolicyVersion: demoSettings.policyVersion, language: 'nb' }),
    )
    create.mockRestore()
  })
})
