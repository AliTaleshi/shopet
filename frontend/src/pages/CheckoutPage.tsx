import AddIcon from '@mui/icons-material/Add'
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { accountApi, orderApi } from '../api/endpoints'
import AddressDialog from '../components/AddressDialog'
import EmptyState from '../components/EmptyState'
import PageLoader from '../components/PageLoader'
import { useNotify } from '../context/NotifyContext'
import { formatNumber, formatToman, toPersianDigits } from '../lib/format'

export default function CheckoutPage() {
  const notify = useNotify()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const addresses = useQuery({ queryKey: ['addresses'], queryFn: accountApi.addresses })
  const [addressId, setAddressId] = useState<number | null>(null)
  const [dialog, setDialog] = useState(false)
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState<string | undefined>()
  const [couponError, setCouponError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Lives under ['cart'] so any cart change (or logout) refreshes/removes it too.
  const preview = useQuery({ queryKey: ['cart', 'preview', coupon ?? null], queryFn: () => orderApi.preview(coupon) })
  const summary = preview.data

  useEffect(() => {
    if (addressId === null && addresses.data?.length) setAddressId(addresses.data[0].id!)
  }, [addresses.data, addressId])

  const applyCoupon = async () => {
    setCouponError('')
    try {
      const res = await orderApi.preview(couponInput.trim())
      queryClient.setQueryData(['cart', 'preview', res.couponCode], res)
      setCoupon(res.couponCode ?? undefined)
      notify('کد تخفیف اعمال شد')
    } catch (e) {
      setCouponError(errorMessage(e))
    }
  }

  const removeCoupon = () => {
    setCoupon(undefined)
    setCouponInput('')
  }

  const pay = async () => {
    if (!addressId) {
      notify('لطفاً آدرس ارسال را انتخاب کنید.', 'warning')
      return
    }
    setSubmitting(true)
    let orderId: number
    try {
      orderId = (await orderApi.create(addressId, coupon)).id
    } catch (e) {
      notify(errorMessage(e), 'error')
      setSubmitting(false)
      return
    }
    queryClient.invalidateQueries({ queryKey: ['cart'] })
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    try {
      const { redirectUrl } = await orderApi.pay(orderId)
      window.location.assign(redirectUrl)
    } catch (e) {
      // The order exists (and the cart is now empty), so continue from the order page where it can be paid.
      notify(errorMessage(e), 'error')
      navigate(`/account/orders/${orderId}`, { replace: true })
    }
  }

  if (preview.isError || addresses.isError) {
    return (
      <EmptyState
        emoji="⚠️"
        title="دریافت اطلاعات سفارش ممکن نشد."
        action={<Button variant="contained" onClick={() => { preview.refetch(); addresses.refetch() }}>تلاش دوباره</Button>}
      />
    )
  }
  if (!summary || addresses.isLoading) return <PageLoader />
  if (summary.cart.items.length === 0) {
    return <EmptyState emoji="🛒" title="سبد خرید شما خالی است." action={<Button component={RouterLink} to="/products" variant="contained">مشاهده محصولات</Button>} />
  }

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
          تکمیل خرید
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" component="h2">آدرس ارسال</Typography>
            <Button startIcon={<AddIcon />} onClick={() => setDialog(true)}>
              آدرس جدید
            </Button>
          </Box>
          {addresses.data?.length === 0 && <Alert severity="info">برای ادامه، یک آدرس اضافه کنید.</Alert>}
          <RadioGroup value={addressId ?? ''} onChange={(e) => setAddressId(Number(e.target.value))}>
            {addresses.data?.map((a) => (
              <Paper key={a.id} variant="outlined" sx={{ p: 1.5, mb: 1, borderColor: addressId === a.id ? 'primary.main' : undefined }}>
                <FormControlLabel
                  value={a.id}
                  control={<Radio />}
                  sx={{ alignItems: 'flex-start', m: 0, width: '100%' }}
                  label={
                    <Box sx={{ pt: 1 }}>
                      <Typography sx={{ fontWeight: 700 }}>{a.title}</Typography>
                      <Typography variant="body2">
                        {a.province}، {a.city}، {a.addressLine}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        گیرنده: {a.receiverName} · {toPersianDigits(a.receiverPhone)} · کد پستی {toPersianDigits(a.postalCode)}
                      </Typography>
                    </Box>
                  }
                />
              </Paper>
            ))}
          </RadioGroup>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
            کالاهای سفارش ({formatNumber(summary.cart.count)})
          </Typography>
          {summary.cart.items.map((i) => (
            <Box key={i.productId} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
              <Typography variant="body2">
                {i.name} × {formatNumber(i.quantity)}
              </Typography>
              <Typography variant="body2">{formatToman(i.lineTotal)}</Typography>
            </Box>
          ))}
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Paper variant="outlined" sx={{ p: 2, position: 'sticky', top: 140 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>کد تخفیف</Typography>
          {coupon ? (
            <Alert severity="success" action={<Button color="inherit" size="small" onClick={removeCoupon}>حذف</Button>}>
              کد {coupon} اعمال شد
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                placeholder="کد تخفیف"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                error={!!couponError}
                slotProps={{ htmlInput: { dir: 'ltr', 'aria-label': 'کد تخفیف' } }}
              />
              <Button variant="outlined" onClick={applyCoupon} disabled={!couponInput.trim()}>
                اعمال
              </Button>
            </Box>
          )}
          {couponError && <Typography variant="body2" color="error" sx={{ mt: 1 }}>{couponError}</Typography>}
          <Divider sx={{ my: 2 }} />
          <Row label="جمع کالاها" value={formatToman(summary.itemsTotal)} />
          {summary.discount > 0 && <Row label="تخفیف" value={`− ${formatToman(summary.discount)}`} color="error.main" />}
          <Row label="هزینه ارسال" value={summary.shippingCost === 0 ? 'رایگان' : formatToman(summary.shippingCost)} />
          <Divider sx={{ my: 1.5 }} />
          <Row label="مبلغ قابل پرداخت" value={formatToman(summary.total)} bold testId="checkout-total" />
          <Button variant="contained" size="large" fullWidth sx={{ mt: 2 }} onClick={pay} disabled={submitting || !addressId}>
            ثبت سفارش و پرداخت
          </Button>
        </Paper>
      </Grid>

      <AddressDialog
        open={dialog}
        onClose={() => setDialog(false)}
        onSaved={(a) => {
          setDialog(false)
          queryClient.invalidateQueries({ queryKey: ['addresses'] })
          setAddressId(a.id!)
        }}
      />
    </Grid>
  )
}

function Row({ label, value, color, bold, testId }: { label: string; value: string; color?: string; bold?: boolean; testId?: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color }}>
      <Typography sx={{ fontWeight: bold ? 700 : 400 }}>{label}</Typography>
      <Typography sx={{ fontWeight: bold ? 800 : 400 }} data-testid={testId}>{value}</Typography>
    </Box>
  )
}
