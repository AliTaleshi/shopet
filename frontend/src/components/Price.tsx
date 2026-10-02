import { Box, Chip, Typography } from '@mui/material'
import { discountPercent, formatNumber } from '../lib/format'

interface Props {
  price: number
  finalPrice: number
  size?: 'small' | 'large'
}

/** Shows the final price in Toman, with the original price struck through when discounted. */
export default function Price({ price, finalPrice, size = 'small' }: Props) {
  const percent = discountPercent(price, finalPrice)
  const large = size === 'large'
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      {percent > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant={large ? 'body1' : 'caption'}
            color="text.secondary"
            sx={{ textDecoration: 'line-through' }}
            data-testid="original-price"
          >
            {formatNumber(price)}
          </Typography>
          <Chip label={`${formatNumber(percent)}٪`} color="error" size="small" sx={{ height: 20, fontWeight: 700 }} />
        </Box>
      )}
      <Typography variant={large ? 'h5' : 'subtitle1'} sx={{ fontWeight: 800 }} data-testid="final-price">
        {formatNumber(finalPrice)}{' '}
        <Typography component="span" variant="caption" color="text.secondary">
          تومان
        </Typography>
      </Typography>
    </Box>
  )
}
