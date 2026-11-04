import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardContext, type DashboardContextValue } from '@/contexts/DashboardContext'
import { ToastProvider } from '@/contexts/ToastContext'
import type { StaffBooking } from '@/types/dashboard'
import { BookingDetailModal } from './BookingDetailModal'

vi.mock('@/services/dashboardApi', () => ({
  setBookingStatus: vi.fn().mockResolvedValue(undefined),
  verifyGuardianConsent: vi.fn().mockResolvedValue(undefined),
  referenceImageUrl: vi.fn().mockResolvedValue('https://example.com/img.png'),
  listNotifications: vi.fn().mockResolvedValue([]),
  resendNotification: vi.fn().mockResolvedValue(undefined),
}))
const api = await import('@/services/dashboardApi')

beforeAll(() => {
  // jsdom lacks <dialog> methods.
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
})

const dashboard = {
  profile: { id: 'u1', fullName: 'Shmoky', role: 'artist', email: 's@x.no', artistId: 'a1' },
  isAdmin: false,
  artists: [],
  scopeArtistId: 'a1',
  setScopeArtistId: () => {},
  editArtist: null,
  reloadArtists: async () => {},
} as DashboardContextValue

const minor: StaffBooking = {
  id: 'b1', reference: 'NR5-ABC123', artistId: 'a1', serviceId: 's1', serviceName: 'Small Piece', priceNok: 1500,
  customerName: 'Ung Kunde', customerEmail: 'ung@example.com', customerPhone: '+47 400 00 000',
  customerDateOfBirth: '2010-01-01', tattooPlacement: 'Arm', tattooDescription: 'En liten stjerne.',
  referenceImagePath: null, startsAt: '2027-01-15T10:00:00Z', endsAt: '2027-01-15T12:00:00Z', status: 'pending',
  requiresGuardianConsent: true, guardianConsentVerifiedAt: null, cancellationPolicyAcceptedAt: '2026-11-02T10:00:00Z',
  cancellationPolicyVersion: '2026-11-01', cancellationReason: null, createdAt: '2026-11-02T10:00:00Z',
}

function renderModal(booking: StaffBooking, onChanged = vi.fn()) {
  render(
    <DashboardContext.Provider value={dashboard}>
      <ToastProvider>
        <BookingDetailModal booking={booking} onClose={vi.fn()} onChanged={onChanged} />
      </ToastProvider>
    </DashboardContext.Provider>,
  )
  return onChanged
}

describe('BookingDetailModal', () => {
  it('shows customer details, consent requirement and cancellation-policy acceptance', () => {
    renderModal(minor)
    expect(screen.getByText('ung@example.com')).toBeInTheDocument()
    expect(screen.getByText(/samtykke fra foresatte kreves/i)).toBeInTheDocument()
    expect(screen.getByText(/versjon 2026-11-01/)).toBeInTheDocument()
  })

  it('cannot confirm an under-age request before consent is registered', async () => {
    const onChanged = renderModal(minor)
    expect(screen.getByRole('button', { name: /bekreft avtalen/i })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: /samtykke er mottatt/i }))
    await waitFor(() => expect(api.verifyGuardianConsent).toHaveBeenCalledWith('b1'))
    expect(onChanged).toHaveBeenCalledWith('b1', expect.objectContaining({ guardianConsentVerifiedAt: expect.any(String) }))
  })

  it('asks for confirmation and an optional reason before cancelling', async () => {
    const onChanged = renderModal({ ...minor, status: 'confirmed', requiresGuardianConsent: false })
    await userEvent.click(screen.getByRole('button', { name: /^avlys$/i }))
    expect(screen.getByText(/kan ikke angres/i)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/begrunnelse/i), 'Artisten er syk')
    await userEvent.click(screen.getByRole('button', { name: /avlys avtalen/i }))
    await waitFor(() => expect(api.setBookingStatus).toHaveBeenCalledWith('b1', 'cancelled', 'Artisten er syk'))
    expect(onChanged).toHaveBeenCalledWith('b1', expect.objectContaining({ status: 'cancelled' }))
  })
})
