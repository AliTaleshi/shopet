import {
  Alert,
  Box,
  Button,
  Divider,
  Grid,
  Link,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { errorMessage } from '../../api/client'
import { orderApi } from '../../api/endpoints'
import type { Order, OrderStatus } from '../../api/types'
import EmptyState from '../../components/EmptyState'
import OrderStatusChip from '../../components/OrderStatusChip'
import PageLoader from '../../components/PageLoader'
import { useNotify } from '../../context/NotifyContext'
import { ORDER_STATUS, formatDateTime, formatNumber, formatToman, toPersianDigits } from '../../lib/format'

const FLOW: OrderStatus[] = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED']

export function OrderSummary({ order }: { order: Order }) {
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>کالا</TableCell>
                <TableCell align="center">تعداد</TableCell>
                <TableCell align="left">قیمت واحد</TableCell>
                <TableCell align="left">جمع</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {order.items.map((i) => (
                <TableRow key={i.productId}>
                  <TableCell>
                    <Link component={RouterLink} to={`/products/${i.productId}`} underline="hover" color="inherit">
                      {i.productName}
                    </Link>
                  </TableCell>
                  <TableCell align="center">{formatNumber(i.quantity)}</TableCell>
                  <TableCell align="left">{formatToman(i.unitPrice)}</TableCell>
                  <TableCell align="left">{formatToman(i.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Line label="جمع کالاها" value={formatToman(order.itemsTotal)} />
          {order.discountAmount > 0 && <Line label={`تخفیف (${order.couponCode})`} value={`− ${formatToman(order.discountAmount)}`} />}
          <Line label="هزینه ارسال" value={order.shippingCost ? formatToman(order.shippingCost) : 'رایگان'} />
          <Divider sx={{ my: 1 }} />
          <Line label="مبلغ کل" value={formatToman(order.total)} bold />
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>ارسال به</Typography>
          <Typography variant="body2">{order.receiverName} · {toPersianDigits(order.receiverPhone)}</Typography>
          <Typography variant="body2">{order.province}، {order.city}، {order.addressLine}</Typography>
          <Typography variant="body2" color="text.secondary">کد پستی: {toPersianDigits(order.postalCode)}</Typography>
        </Paper>
      </Grid>
    </Grid>
  )
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
      <Typography variant="body2" sx={{ fontWeight: bold ? 700 : 400 }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: bold ? 800 : 400 }}>{value}</Typography>
    </Box>
  )
}

export default function OrderDetailPage() {
  const id = Number(useParams().id)
  const notify = useNotify()
  const queryClient = useQueryClient()
  const order = useQuery({ queryKey: ['orders', 'detail', id], queryFn: () => orderApi.get(id), retry: false })

  const pay = useMutation({
    mutationFn: () => orderApi.pay(id),
    onSuccess: ({ redirectUrl }) => window.location.assign(redirectUrl),
    onError: (e) => notify(errorMessage(e), 'error'),
  })
  const cancel = useMutation({
    mutationFn: () => orderApi.cancel(id),
    onSuccess: (o) => {
      queryClient.setQueryData(['orders', 'detail', id], o)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      notify('سفارش لغو شد')
    },
    onError: (e) => notify(errorMessage(e), 'error'),
  })

  if (order.isLoading) return <PageLoader />
  if (!order.data) return <EmptyState emoji="📦" title="سفارش پیدا نشد." />
  const o = order.data
  const step = FLOW.indexOf(o.status)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" component="h1">سفارش #{toPersianDigits(o.id)}</Typography>
        <OrderStatusChip status={o.status} />
        <Typography variant="body2" color="text.secondary">{formatDateTime(o.createdAt)}</Typography>
      </Box>
      {o.status === 'PENDING_PAYMENT' && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button color="inherit" size="small" onClick={() => cancel.mutate()} disabled={cancel.isPending}>لغو سفارش</Button>
              <Button variant="contained" size="small" onClick={() => pay.mutate()} disabled={pay.isPending}>پرداخت</Button>
            </Box>
          }
        >
          این سفارش هنوز پرداخت نشده است. سفارش‌های پرداخت‌نشده پس از ۳۰ دقیقه به‌طور خودکار لغو می‌شوند.
        </Alert>
      )}
      {o.status !== 'CANCELLED' && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, overflowX: 'auto' }}>
          <Stepper activeStep={step} alternativeLabel>
            {FLOW.map((s) => (
              <Step key={s} completed={FLOW.indexOf(s) <= step}>
                <StepLabel>{ORDER_STATUS[s].label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>
      )}
      <OrderSummary order={o} />
    </Box>
  )
}
