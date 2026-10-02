import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import RemoveIcon from '@mui/icons-material/Remove'
import { Box, IconButton, Typography } from '@mui/material'
import { formatNumber } from '../lib/format'
import { MAX_QUANTITY } from '../lib/guestCart'

interface Props {
  quantity: number
  stock: number
  disabled?: boolean
  onChange: (quantity: number) => void
}

export default function QuantityStepper({ quantity, stock, disabled, onChange }: Props) {
  const max = Math.min(stock, MAX_QUANTITY)
  return (
    <Box
      sx={{ display: 'inline-flex', alignItems: 'center', border: 1, borderColor: 'divider', borderRadius: 2 }}
      data-testid="quantity-stepper"
    >
      <IconButton
        size="small"
        color="primary"
        aria-label="افزایش تعداد"
        disabled={disabled || quantity >= max}
        onClick={() => onChange(quantity + 1)}
      >
        <AddIcon fontSize="small" />
      </IconButton>
      <Typography sx={{ minWidth: 28, textAlign: 'center', fontWeight: 700 }} data-testid="quantity">
        {formatNumber(quantity)}
      </Typography>
      <IconButton
        size="small"
        color={quantity === 1 ? 'error' : 'primary'}
        aria-label={quantity === 1 ? 'حذف از سبد' : 'کاهش تعداد'}
        disabled={disabled}
        onClick={() => onChange(quantity - 1)}
      >
        {quantity === 1 ? <DeleteIcon fontSize="small" /> : <RemoveIcon fontSize="small" />}
      </IconButton>
    </Box>
  )
}
