import { Button, Paper, Typography } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { orderApi } from '../api/endpoints'
import { toPersianDigits } from '../lib/format'

export default function PaymentResultPage() {
  const [params] = useSearchParams()
  const queryClient = useQueryClient()
  const orderId = params.get('orderId')
  // The URL only says what the gateway reported; the order's own status is what counts (it may have expired since).
  const order = useQuery({ queryKey: ['orders', 'detail', Number(orderId)], queryFn: () => orderApi.get(Number(orderId)), enabled: !!orderId })
  const status = order.data?.status
  const success = status ? status !== 'PENDING_PAYMENT' && status !== 'CANCELLED' : params.get('status') === 'success'
  const canRetry = !status || status === 'PENDING_PAYMENT'

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    queryClient.invalidateQueries({ queryKey: ['cart'] })
  }, [queryClient])

  return (
    <Paper variant="outlined" sx={{ maxWidth: 520, mx: 'auto', p: 4, textAlign: 'center', mt: 4 }}>
      <Typography sx={{ fontSize: 64 }}>{success ? '🎉' : '😿'}</Typography>
      <Typography variant="h5" component="h1" sx={{ mb: 1 }} color={success ? 'success.main' : 'error.main'}>
        {success ? 'پرداخت با موفقیت انجام شد' : 'پرداخت ناموفق بود'}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {success
          ? `سفارش شماره ${toPersianDigits(orderId ?? '')} ثبت شد و به‌زودی آماده ارسال می‌شود.`
          : canRetry
            ? 'مبلغی از حساب شما کسر نشده است. در صورت کسر، طی ۷۲ ساعت به حساب شما بازمی‌گردد. می‌توانید دوباره تلاش کنید.'
            : 'این سفارش لغو شده است. در صورت کسر مبلغ، طی ۷۲ ساعت به حساب شما بازمی‌گردد.'}
      </Typography>
      {orderId && (
        <Button variant="contained" component={RouterLink} to={`/account/orders/${orderId}`} sx={{ mx: 1 }}>
          {success || !canRetry ? 'مشاهده سفارش' : 'پرداخت مجدد'}
        </Button>
      )}
      <Button component={RouterLink} to="/" sx={{ mx: 1 }}>
        بازگشت به فروشگاه
      </Button>
    </Paper>
  )
}
