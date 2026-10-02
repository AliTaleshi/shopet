/** Cart kept in the browser for visitors who have not logged in yet; merged into the server cart on login. */
export interface GuestCartItem {
  productId: number
  quantity: number
}

export const GUEST_CART_KEY = 'shopet.guestCart'
export const MAX_QUANTITY = 20

export function readGuestCart(): GuestCartItem[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (i): i is GuestCartItem =>
        typeof i?.productId === 'number' && typeof i?.quantity === 'number' && i.quantity > 0,
    )
  } catch {
    return []
  }
}

export function writeGuestCart(items: GuestCartItem[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items))
}

export function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY)
}

/** Returns a new cart with the product's quantity set (0 removes it), capped by stock and the per-item limit. */
export function setGuestQuantity(
  items: GuestCartItem[],
  productId: number,
  quantity: number,
  stock: number,
): GuestCartItem[] {
  const capped = Math.max(0, Math.min(quantity, stock, MAX_QUANTITY))
  const rest = items.filter((i) => i.productId !== productId)
  if (capped === 0) return rest
  const existingIndex = items.findIndex((i) => i.productId === productId)
  const next = { productId, quantity: capped }
  if (existingIndex === -1) return [...items, next]
  return items.map((i) => (i.productId === productId ? next : i))
}

export const guestCartCount = (items: GuestCartItem[]) => items.reduce((sum, i) => sum + i.quantity, 0)
