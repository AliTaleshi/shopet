import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import VerifiedIcon from '@mui/icons-material/Verified'
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  Link,
  Paper,
  Rating,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { catalogApi } from '../api/endpoints'
import type { ProductDetail } from '../api/types'
import AddToCart from '../components/AddToCart'
import EmptyState from '../components/EmptyState'
import PageLoader from '../components/PageLoader'
import Price from '../components/Price'
import ProductImage from '../components/ProductImage'
import { useAuth } from '../context/AuthContext'
import { useNotify } from '../context/NotifyContext'
import { useWishlist } from '../context/useWishlist'
import { formatDate, formatNumber, petTypeEmoji, petTypeLabel } from '../lib/format'

function Gallery({ product }: { product: ProductDetail }) {
  const [active, setActive] = useState(0)
  const images = product.images
  return (
    <Box>
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <ProductImage src={images[active]?.url} alt={product.name} petType={product.petType} height={380} fit="contain" />
      </Paper>
      {images.length > 1 && (
        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          {images.map((img, i) => (
            <Box
              key={img.id}
              component="button"
              onClick={() => setActive(i)}
              aria-label={`تصویر ${formatNumber(i + 1)}`}
              sx={{ p: 0, border: 2, borderColor: i === active ? 'primary.main' : 'divider', borderRadius: 2, overflow: 'hidden', cursor: 'pointer', bgcolor: '#fff' }}
            >
              <Box component="img" src={img.url} alt="" sx={{ width: 64, height: 64, objectFit: 'cover', display: 'block' }} />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}

function Reviews({ productId }: { productId: number }) {
  const { user } = useAuth()
  const notify = useNotify()
  const queryClient = useQueryClient()
  const reviews = useQuery({ queryKey: ['reviews', productId], queryFn: () => catalogApi.reviews(productId) })
  const eligibility = useQuery({
    queryKey: ['reviews', productId, 'eligibility'],
    queryFn: () => catalogApi.reviewEligibility(productId),
    enabled: !!user,
  })
  const [rating, setRating] = useState<number | null>(5)
  const [comment, setComment] = useState('')
  const submit = useMutation({
    mutationFn: () => catalogApi.addReview(productId, rating ?? 5, comment),
    onSuccess: () => {
      notify('نظر شما ثبت شد؛ متشکریم!')
      setComment('')
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] })
      queryClient.invalidateQueries({ queryKey: ['product', productId] })
    },
    onError: (e) => notify(errorMessage(e), 'error'),
  })

  return (
    <Box component="section" sx={{ mt: 5 }}>
      <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
        نظرات خریداران
      </Typography>
      {eligibility.data?.canReview && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>نظر خود را درباره این محصول بنویسید</Typography>
          <Rating value={rating} onChange={(_, v) => setRating(v)} aria-label="امتیاز" />
          <TextField
            label="متن نظر (اختیاری)"
            multiline
            minRows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ my: 1 }}
          />
          <Button variant="contained" onClick={() => submit.mutate()} disabled={submit.isPending || !rating}>
            ثبت نظر
          </Button>
        </Paper>
      )}
      {user && eligibility.data && !eligibility.data.purchased && (
        <Alert severity="info" sx={{ mb: 2 }}>
          پس از خرید این محصول می‌توانید درباره آن نظر بدهید.
        </Alert>
      )}
      {reviews.data?.content.length === 0 && <Typography color="text.secondary">هنوز نظری ثبت نشده است.</Typography>}
      {reviews.data?.content.map((r) => (
        <Box key={r.id} sx={{ py: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>{r.authorName}</Typography>
            <Rating value={r.rating} readOnly size="small" />
            <Typography variant="caption" color="text.secondary">
              {formatDate(r.createdAt)}
            </Typography>
          </Box>
          {r.comment && <Typography sx={{ mt: 1 }}>{r.comment}</Typography>}
        </Box>
      ))}
    </Box>
  )
}

export default function ProductPage() {
  const id = Number(useParams().id)
  const wishlist = useWishlist()
  const product = useQuery({ queryKey: ['product', id], queryFn: () => catalogApi.product(id), retry: false })

  if (product.isLoading) return <PageLoader />
  if (product.isError || !product.data) {
    return <EmptyState emoji="🙈" title="محصول مورد نظر پیدا نشد." action={<Button component={RouterLink} to="/products">بازگشت به فروشگاه</Button>} />
  }
  const p = product.data
  const liked = wishlist.has(p.id)

  return (
    <>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/" underline="hover" color="inherit">خانه</Link>
        <Link component={RouterLink} to={`/products?petType=${p.petType}`} underline="hover" color="inherit">
          {petTypeLabel(p.petType)}
        </Link>
        <Link component={RouterLink} to={`/products?categoryId=${p.categoryId}`} underline="hover" color="inherit">
          {p.categoryName}
        </Link>
      </Breadcrumbs>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Gallery product={p} />
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Chip label={`${petTypeEmoji(p.petType)} ${petTypeLabel(p.petType)}`} size="small" />
            {p.brand && <Chip label={p.brand} size="small" variant="outlined" />}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Typography variant="h4" component="h1" sx={{ fontSize: { xs: 22, md: 30 }, flexGrow: 1 }}>
              {p.name}
            </Typography>
            <IconButton onClick={() => wishlist.toggle(p.id)} aria-label={liked ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}>
              {liked ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
            </IconButton>
          </Box>
          {p.ratingCount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Rating value={Number(p.ratingAvg)} precision={0.5} readOnly size="small" />
              <Typography variant="body2" color="text.secondary">
                {formatNumber(Number(p.ratingAvg))} از {formatNumber(p.ratingCount)} نظر
              </Typography>
            </Box>
          )}
          <Divider sx={{ my: 2 }} />
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography color={p.stock > 0 ? 'success.main' : 'error.main'} sx={{ fontWeight: 700 }}>
                {p.stock > 0 ? (p.stock < 5 ? `تنها ${formatNumber(p.stock)} عدد باقی مانده` : 'موجود در انبار') : 'ناموجود'}
              </Typography>
              {p.stock > 0 && <Price price={p.price} finalPrice={p.finalPrice} size="large" />}
            </Box>
            <AddToCart productId={p.id} stock={p.stock} size="large" fullWidth />
            <Box sx={{ display: 'flex', gap: 3, color: 'text.secondary', flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocalShippingIcon fontSize="small" /> <Typography variant="body2">ارسال سریع</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <VerifiedIcon fontSize="small" /> <Typography variant="body2">ضمانت اصالت کالا</Typography>
              </Box>
            </Box>
          </Paper>
          {p.description && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
                معرفی محصول
              </Typography>
              <Typography sx={{ whiteSpace: 'pre-line', lineHeight: 2 }}>{p.description}</Typography>
            </Box>
          )}
        </Grid>
      </Grid>
      <Reviews productId={p.id} />
    </>
  )
}
