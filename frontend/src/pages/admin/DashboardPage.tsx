import { Box, Grid, Link, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import { adminApi } from '../../api/endpoints'
import OrderStatusChip from '../../components/OrderStatusChip'
import PageLoader from '../../components/PageLoader'
import { formatDate, formatNumber, formatToman, toPersianDigits } from '../../lib/format'

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color, mt: 1 }}>{value}</Typography>
    </Paper>
  )
}

export default function DashboardPage() {
  const d = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: adminApi.dashboard })
  if (!d.data) return <PageLoader />
  const s = d.data
  return (
    <Box>
      <Typography variant="h5" component="h1" sx={{ mb: 2 }}>داشبورد</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 4 }}><Stat label="فروش (سفارش‌های پرداخت‌شده)" value={formatToman(s.revenue)} color="primary.main" /></Grid>
        <Grid size={{ xs: 6, md: 4 }}><Stat label="سفارش‌های آماده پردازش" value={formatNumber(s.toProcessCount)} color="warning.main" /></Grid>
        <Grid size={{ xs: 6, md: 4 }}><Stat label="در انتظار پرداخت" value={formatNumber(s.pendingPaymentCount)} /></Grid>
        <Grid size={{ xs: 6, md: 4 }}><Stat label="کل سفارش‌ها" value={formatNumber(s.orderCount)} /></Grid>
        <Grid size={{ xs: 6, md: 4 }}><Stat label="محصولات" value={formatNumber(s.productCount)} /></Grid>
        <Grid size={{ xs: 6, md: 4 }}><Stat label="کاربران" value={formatNumber(s.userCount)} /></Grid>
      </Grid>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>آخرین سفارش‌ها</Typography>
            <Table size="small">
              <TableHead>
                <TableRow><TableCell>شماره</TableCell><TableCell>تاریخ</TableCell><TableCell>مبلغ</TableCell><TableCell>وضعیت</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {s.recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell><Link component={RouterLink} to={`/admin/orders?open=${o.id}`}>#{toPersianDigits(o.id)}</Link></TableCell>
                    <TableCell>{formatDate(o.createdAt)}</TableCell>
                    <TableCell>{formatToman(o.total)}</TableCell>
                    <TableCell><OrderStatusChip status={o.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>کالاهای رو به اتمام</Typography>
            {s.lowStock.length === 0 && <Typography color="text.secondary" variant="body2">همه کالاها موجودی کافی دارند.</Typography>}
            {s.lowStock.map((p) => (
              <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, gap: 1 }}>
                <Link component={RouterLink} to={`/admin/products/${p.id}`} variant="body2" underline="hover">{p.name}</Link>
                <Typography variant="body2" color={p.stock === 0 ? 'error' : 'warning.main'} sx={{ whiteSpace: 'nowrap' }}>
                  {formatNumber(p.stock)} عدد
                </Typography>
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
