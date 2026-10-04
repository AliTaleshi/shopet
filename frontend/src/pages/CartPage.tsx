import { Alert, Box, Button, Divider, Grid, Link, Paper, Typography } from '@mui/material'
import { useQueries } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useEffect } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { catalogApi } from '../api/endpoints'
import type { CartLine } from '../api/types'
import EmptyState from '../components/EmptyState'
import PageLoader from '../components/PageLoader'
import ProductImage from '../components/ProductImage'
import QuantityStepper from '../components/QuantityStepper'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { formatNumber, formatToman } from '../lib/format'

/** Builds display lines for the browser cart by loading each product. */
function useGuestLines(enabled: boolean) {
  const cart = useCart()
  const results = useQueries({
    queries: cart.guestItems.map((item) => ({
      queryKey: ['product', item.productId],
      queryFn: () => catalogApi.product(item.productId),
      enabled,
      retry: false,
    })),
  })
  const loading = results.some((r) => r.isLoading)

  // Products that were removed or hidden since they were added: drop them so the badge count matches the page.
  const missing = cart.guestItems
    .filter((_, i) => isAxiosError(results[i]?.error) && results[i].error?.response?.status === 404)
    .map((item) => item.productId)
  const missingKey = missing.join(',')
  useEffect(() => {
    missingKey.split(',').filter(Boolean).forEach((id) => cart.setQuantity(Number(id), 0, 0))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per set of missing products
  }, [missingKey])

  const lines: CartLine[] = []
  cart.guestItems.forEach((item, i) => {
    const p = results[i]?.data
    if (!p) return
    lines.push({
      productId: p.id,
      name: p.name,
      imageUrl: p.images[0]?.url ?? null,
      petType: p.petType,
      price: p.price,
      unitPrice: p.finalPrice,
      quantity: item.quantity,
      stock: p.stock,
      available: p.active && p.stock >= item.quantity,
      lineTotal: p.finalPrice * item.quantity,
    })
  })
  return { lines, loading }
}

export default function CartPage() {
  const cart = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const guest = useGuestLines(!cart.isServerCart)

  const lines = cart.isServerCart ? (cart.serverCart?.items ?? []) : guest.lines
  if (cart.isServerCart && cart.serverCartError) {
    return (
      <EmptyState
        emoji="⚠️"
        title="دریافت سبد خرید ممکن نشد."
        action={<Button variant="contained" onClick={cart.reloadServerCart}>تلاش دوباره</Button>}
      />
    )
  }
  const loading = cart.isServerCart ? !cart.serverCart : guest.loading
  if (loading) return <PageLoader />
  if (lines.length === 0) {
    return (
      <EmptyState
        emoji="🛒"
        title="سبد خرید شما خالی است."
        action={<Button variant="contained" component={RouterLink} to="/products">مشاهده محصولات</Button>}
      />
    )
  }

  const itemsTotal = lines.reduce((s, l) => s + l.lineTotal, 0)
  const savings = lines.reduce((s, l) => s + (l.price - l.unitPrice) * l.quantity, 0)
  const unavailable = lines.some((l) => !l.available)

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
          سبد خرید
        </Typography>
        {unavailable && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            موجودی برخی کالاها کمتر از تعداد انتخابی شماست؛ لطفاً تعداد را اصلاح کنید.
          </Alert>
        )}
        <Paper variant="outlined">
          {lines.map((line, i) => (
            <Box key={line.productId}>
              {i > 0 && <Divider />}
              <Box sx={{ display: 'flex', gap: 2, p: 2, alignItems: 'center' }} data-testid="cart-line">
                <Box sx={{ width: 88, flexShrink: 0, borderRadius: 2, overflow: 'hidden' }}>
                  <ProductImage src={line.imageUrl} alt={line.name} petType={line.petType} height={88} />
                </Box>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Link component={RouterLink} to={`/products/${line.productId}`} color="inherit" underline="hover" sx={{ fontWeight: 600 }}>
                    {line.name}
                  </Link>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    قیمت واحد: {formatToman(line.unitPrice)}
                  </Typography>
                  {!line.available && (
                    <Typography variant="body2" color="error">
                      {line.stock > 0 ? `موجودی: ${formatNumber(line.stock)} عدد` : 'ناموجود'}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                  <QuantityStepper
                    quantity={line.quantity}
                    stock={line.stock}
                    disabled={cart.busy}
                    onChange={(q) =>
                      // Decreasing an over-stock line jumps straight to the available quantity.
                      cart.setQuantity(line.productId, q < line.quantity ? Math.min(q, line.stock) : q, line.stock)
                    }
                  />
                  <Typography sx={{ fontWeight: 700 }}>{formatToman(line.lineTotal)}</Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper variant="outlined" sx={{ p: 2, position: 'sticky', top: 140 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography color="text.secondary">جمع کالاها</Typography>
            <Typography>{formatToman(itemsTotal + savings)}</Typography>
          </Box>
          {savings > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: 'error.main' }}>
              <Typography>سود شما از خرید</Typography>
              <Typography>{formatToman(savings)}</Typography>
            </Box>
          )}
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ fontWeight: 700 }}>مبلغ قابل پرداخت</Typography>
            <Typography sx={{ fontWeight: 800 }} data-testid="cart-total">{formatToman(itemsTotal)}</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            هزینه ارسال و کد تخفیف در مرحله بعد محاسبه می‌شود.
          </Typography>
          <Button variant="contained" size="large" fullWidth disabled={unavailable} onClick={() => navigate('/checkout')}>
            {user ? 'ادامه فرایند خرید' : 'ورود و ادامه خرید'}
          </Button>
        </Paper>
      </Grid>
    </Grid>
  )
}
