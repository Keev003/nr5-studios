import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui'
import { useToast } from '@/hooks/useToast'
import { listNotifications, resendNotification } from '@/services/dashboardApi'
import type { NotificationRow } from '@/types/dashboard'

const KIND: Record<NotificationRow['kind'], string> = {
  booking_received: 'Bookingbekreftelse',
  booking_confirmed: 'Godkjent',
  booking_cancelled: 'Avlysning',
  booking_changed: 'Endret tid',
}
const WHO: Record<NotificationRow['recipient'], string> = { customer: 'kunde', artist: 'artist' }

const time = (iso: string) => new Date(iso).toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Oslo' })

/** Which emails went out for a booking, and a way to resend failed ones. */
export function NotificationStatus({ bookingId, refreshKey }: { bookingId: string; refreshKey: string }) {
  const toast = useToast()
  const [rows, setRows] = useState<NotificationRow[] | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    // Give the sender a moment after a status change before reading the result.
    const timer = setTimeout(() => {
      listNotifications(bookingId).then((r) => active && setRows(r), () => active && setRows([]))
    }, version === 0 ? 0 : 2500)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [bookingId, refreshKey, version])

  if (!rows) return <span className="text-muted">Laster…</span>
  if (rows.length === 0) return <span className="text-muted">Ingen e-poster registrert.</span>

  const resend = async (id: string) => {
    try {
      await resendNotification(id)
      toast.success('E-posten sendes på nytt.')
      setVersion((v) => v + 1)
    } catch {
      toast.error('Kunne ikke sende på nytt.')
    }
  }

  return (
    <ul className="space-y-1.5">
      {rows.map((n) => (
        <li key={n.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {n.status === 'sent' ? (
            <CheckCircle2 className="size-4 text-success" aria-hidden />
          ) : n.status === 'failed' ? (
            <AlertTriangle className="size-4 text-danger" aria-hidden />
          ) : (
            <Clock className="size-4 text-muted" aria-hidden />
          )}
          <span>
            {KIND[n.kind]} til {WHO[n.recipient]}:{' '}
            {n.status === 'sent' && n.sentAt ? `sendt ${time(n.sentAt)}` : n.status === 'failed' ? 'feilet' : 'i kø'}
          </span>
          {n.status === 'failed' && (
            <>
              {n.lastError && <span className="w-full pl-6 text-xs text-muted">{n.lastError}</span>}
              <Button size="sm" variant="ghost" className="ml-4 h-8" onClick={() => resend(n.id)}>
                <RotateCw className="size-3.5" aria-hidden /> Send på nytt
              </Button>
            </>
          )}
        </li>
      ))}
    </ul>
  )
}
