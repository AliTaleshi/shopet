import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart'
import { Button } from '@mui/material'
import { useCart } from '../context/CartContext'
import { useNotify } from '../context/NotifyContext'
import QuantityStepper from './QuantityStepper'

interface Props {
  productId: number
  stock: number
  fullWidth?: boolean
  size?: 'small' | 'medium' | 'large'
}

/** "Add to cart" button that turns into a quantity stepper once the product is in the cart. */
export default function AddToCart({ productId, stock, fullWidth, size = 'medium' }: Props) {
  const cart = useCart()
  const notify = useNotify()
  const quantity = cart.quantityOf(productId)

  if (stock <= 0) {
    return (
      <Button variant="outlined" disabled fullWidth={fullWidth} size={size}>
        ناموجود
      </Button>
    )
  }
  if (quantity > 0) {
    return (
      <QuantityStepper
        quantity={quantity}
        stock={stock}
        disabled={cart.busy}
        onChange={(q) => cart.setQuantity(productId, q, stock)}
      />
    )
  }
  return (
    <Button
      variant="contained"
      startIcon={<AddShoppingCartIcon />}
      fullWidth={fullWidth}
      size={size}
      disabled={cart.busy}
      onClick={async () => {
        if (await cart.setQuantity(productId, 1, stock)) notify('به سبد خرید اضافه شد')
      }}
    >
      افزودن به سبد
    </Button>
  )
}
