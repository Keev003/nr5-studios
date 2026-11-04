import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { customerSchema } from '@/lib/validation'
import type { CustomerInfo } from '@/types/booking'
import { emptyDraft, type BookingDraft } from './bookingDraft'

const STORAGE_KEY = 'nr5-booking-draft'

function loadDraft(): BookingDraft {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? { ...emptyDraft, ...(JSON.parse(raw) as Partial<BookingDraft>) } : emptyDraft
  } catch {
    return emptyDraft
  }
}

export interface BookingContextValue {
  draft: BookingDraft
  /** Reference image lives only in memory; files can't be stored in sessionStorage. */
  referenceImage: File | null
  customerComplete: boolean
  selectArtist: (artistId: string) => void
  selectService: (serviceId: string) => void
  selectTime: (date: string, startsAt: string) => void
  clearTime: () => void
  saveCustomer: (customer: Partial<CustomerInfo>) => void
  setReferenceImage: (file: File | null) => void
  reset: () => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const BookingContext = createContext<BookingContextValue | null>(null)

export function BookingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<BookingDraft>(loadDraft)
  const [referenceImage, setReferenceImage] = useState<File | null>(null)

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    } catch {
      /* private mode etc. — the draft just won't survive a reload */
    }
  }, [draft])

  // Changing artist or service invalidates the chosen time, since availability differs.
  const selectArtist = useCallback((artistId: string) => {
    setDraft((d) => (d.artistId === artistId ? d : { ...d, artistId, date: null, startsAt: null }))
  }, [])
  const selectService = useCallback((serviceId: string) => {
    setDraft((d) => (d.serviceId === serviceId ? d : { ...d, serviceId, date: null, startsAt: null }))
  }, [])
  const selectTime = useCallback((date: string, startsAt: string) => setDraft((d) => ({ ...d, date, startsAt })), [])
  const clearTime = useCallback(() => setDraft((d) => ({ ...d, startsAt: null })), [])
  const saveCustomer = useCallback(
    (customer: Partial<CustomerInfo>) => setDraft((d) => ({ ...d, customer: { ...d.customer, ...customer } })),
    [],
  )
  const reset = useCallback(() => {
    setDraft(emptyDraft)
    setReferenceImage(null)
  }, [])

  const customerComplete = useMemo(() => customerSchema.safeParse(draft.customer).success, [draft.customer])

  const value = useMemo<BookingContextValue>(
    () => ({
      draft,
      referenceImage,
      customerComplete,
      selectArtist,
      selectService,
      selectTime,
      clearTime,
      saveCustomer,
      setReferenceImage,
      reset,
    }),
    [draft, referenceImage, customerComplete, selectArtist, selectService, selectTime, clearTime, saveCustomer, reset],
  )

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
}
