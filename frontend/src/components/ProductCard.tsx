import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import StarIcon from '@mui/icons-material/Star'
import { Box, Card, CardActionArea, CardContent, IconButton, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import type { ProductSummary } from '../api/types'
import { useWishlist } from '../context/useWishlist'
import { formatNumber } from '../lib/format'
import AddToCart from './AddToCart'
import Price from './Price'
import ProductImage from './ProductImage'

export default function ProductCard({ product }: { product: ProductSummary }) {
  const wishlist = useWishlist()
  const liked = wishlist.has(product.id)
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }} data-testid="product-card">
      <IconButton
        aria-label={liked ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
        onClick={() => wishlist.toggle(product.id)}
        sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1, bgcolor: 'rgba(255,255,255,.85)', '&:hover': { bgcolor: '#fff' } }}
        size="small"
      >
        {liked ? <FavoriteIcon color="error" fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
      </IconButton>
      <CardActionArea component={RouterLink} to={`/products/${product.id}`} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <ProductImage src={product.imageUrl} alt={product.name} petType={product.petType} height={180} />
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {product.brand ?? product.categoryName}
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, minHeight: 42, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {product.name}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
              {product.ratingCount > 0 && (
                <>
                  <StarIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                  <Typography variant="caption">{formatNumber(Number(product.ratingAvg))}</Typography>
                </>
              )}
            </Box>
            {product.stock > 0 ? (
              <Price price={product.price} finalPrice={product.finalPrice} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                ناموجود
              </Typography>
            )}
          </Box>
        </CardContent>
      </CardActionArea>
      <Box sx={{ p: 2, pt: 0 }}>
        <AddToCart productId={product.id} stock={product.stock} fullWidth size="small" />
      </Box>
    </Card>
  )
}
