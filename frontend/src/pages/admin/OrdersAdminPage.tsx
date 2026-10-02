import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Pagination,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { errorMessage } from '../../api/client'
import { adminApi } from '../../api/endpoints'
import type { OrderStatus } from '../../api/types'
import OrderStatusChip from '../../components/OrderStatusChip'
import { useNotify } from '../../context/NotifyContext'
import { ORDER_STATUS, formatDateTime, formatToman, toPersianDigits } from '../../lib/format'
import { OrderSummary } from '../account/OrderDetailPage'

function OrderDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const notify = useNotify()
  const queryClient = useQueryClient()
  const order = useQuery({ queryKey: ['admin', 'order', id], queryFn: () => adminApi.order(id) })
  const change = useMutation({
    mutationFn: (status: OrderStatus) => adminApi.changeOrderStatus(id, status),
    onSuccess: (res) => {
      queryClient.setQueryData(['admin', 'order', id], res)
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      notify(`وضعیت سفارش به «${ORDER_STATUS[res.order.status].label}» تغییر کرد`)
    },
    onError: (e) => notify(errorMessage(e), 'error'),
  })
  const o = order.data?.order
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        سفارش #{toPersianDigits(id)} {o && <OrderStatusChip status={o.status} />}
      </DialogTitle>
      <DialogContent>
        {o && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              مشتری: {order.data?.customerName ?? '—'} ({toPersianDigits(order.data?.customerPhone ?? '')}) · ثبت: {formatDateTime(o.createdAt)}
              {o.paidAt && ` · پرداخت: ${formatDateTime(o.paidAt)}`}
            </Typography>
            <OrderSummary order={o} />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        {o?.allowedNextStatuses.map((s) => (
          <Button
            key={s}
            variant={s === 'CANCELLED' ? 'outlined' : 'contained'}
            color={s === 'CANCELLED' ? 'error' : 'primary'}
            disabled={change.isPending}
            onClick={() => (s !== 'CANCELLED' || window.confirm('سفارش لغو شود؟ موجودی کالاها بازگردانده می‌شود.')) && change.mutate(s)}
          >
            تغییر به «{ORDER_STATUS[s].label}»
          </Button>
        ))}
        <Button onClick={onClose}>بستن</Button>
      </DialogActions>
    </Dialog>
  )
}

export default function OrdersAdminPage() {
  const [params, setParams] = useSearchParams()
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [page, setPage] = useState(0)
  const openId = params.get('open') ? Number(params.get('open')) : null
  const orders = useQuery({
    queryKey: ['admin', 'orders', status, page],
    queryFn: () => adminApi.orders(status, page),
    placeholderData: keepPreviousData,
  })

  return (
    <Box>
      <Box sx={{ display: 'flex', mb: 2, alignItems: 'center', gap: 2 }}>
        <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>سفارش‌ها</Typography>
        <TextField select size="small" label="وضعیت" value={status} onChange={(e) => { setStatus(e.target.value as OrderStatus | ''); setPage(0) }} sx={{ width: 200 }}>
          <MenuItem value="">همه</MenuItem>
          {(Object.keys(ORDER_STATUS) as OrderStatus[]).map((s) => <MenuItem key={s} value={s}>{ORDER_STATUS[s].label}</MenuItem>)}
        </TextField>
      </Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>شماره</TableCell><TableCell>مشتری</TableCell><TableCell>تاریخ</TableCell><TableCell>مبلغ</TableCell><TableCell>وضعیت</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {orders.data?.content.map(({ order: o, customerName, customerPhone }) => (
              <TableRow key={o.id} hover sx={{ cursor: 'pointer' }} onClick={() => setParams({ open: String(o.id) })}>
                <TableCell>#{toPersianDigits(o.id)}</TableCell>
                <TableCell>{customerName ?? toPersianDigits(customerPhone ?? '')}</TableCell>
                <TableCell>{formatDateTime(o.createdAt)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatToman(o.total)}</TableCell>
                <TableCell><OrderStatusChip status={o.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {(orders.data?.totalPages ?? 0) > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={orders.data!.totalPages} page={page + 1} onChange={(_, p) => setPage(p - 1)} />
        </Box>
      )}
      {openId && <OrderDialog id={openId} onClose={() => setParams({})} />}
    </Box>
  )
}
