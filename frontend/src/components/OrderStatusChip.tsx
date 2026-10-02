import { Chip } from '@mui/material'
import type { OrderStatus } from '../api/types'
import { ORDER_STATUS } from '../lib/format'

export default function OrderStatusChip({ status }: { status: OrderStatus }) {
  const s = ORDER_STATUS[status]
  return <Chip label={s.label} color={s.color} size="small" variant={status === 'CANCELLED' ? 'outlined' : 'filled'} />
}
