import { Box, Button, Pagination, Paper, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { orderApi } from '../../api/endpoints'
import EmptyState from '../../components/EmptyState'
import OrderStatusChip from '../../components/OrderStatusChip'
import PageLoader from '../../components/PageLoader'
import { formatDate, formatNumber, formatToman, toPersianDigits } from '../../lib/format'

export default function OrdersPage() {
  const [page, setPage] = useState(0)
  const orders = useQuery({ queryKey: ['orders', page], queryFn: () => orderApi.list(page) })

  if (orders.isLoading) return <PageLoader />
  if (!orders.data?.content.length) {
    return <EmptyState emoji="📦" title="هنوز سفارشی ثبت نکرده‌اید." action={<Button component={RouterLink} to="/products" variant="contained">شروع خرید</Button>} />
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {orders.data.content.map((o) => (
        <Paper key={o.id} variant="outlined" sx={{ p: 2 }} data-testid="order-row">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <Typography sx={{ fontWeight: 700 }}>سفارش #{toPersianDigits(o.id)}</Typography>
            <OrderStatusChip status={o.status} />
            <Typography variant="body2" color="text.secondary">{formatDate(o.createdAt)}</Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {formatNumber(o.items.reduce((s, i) => s + i.quantity, 0))} کالا
            </Typography>
            <Typography sx={{ fontWeight: 700 }}>{formatToman(o.total)}</Typography>
            <Button component={RouterLink} to={`/account/orders/${o.id}`} variant="outlined" size="small">
              جزئیات
            </Button>
          </Box>
        </Paper>
      ))}
      {orders.data.totalPages > 1 && (
        <Pagination sx={{ alignSelf: 'center' }} count={orders.data.totalPages} page={page + 1} onChange={(_, p) => setPage(p - 1)} />
      )}
    </Box>
  )
}
