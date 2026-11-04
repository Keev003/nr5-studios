import { Badge } from '@/components/ui'
import type { BookingStatus } from '@/types/booking'
import { STATUS_LABEL, STATUS_TONE } from './bookingStatus'

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
}
