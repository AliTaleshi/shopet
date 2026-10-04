import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { errorMessage } from '../api/client'
import { cartApi } from '../api/endpoints'
import type { Cart } from '../api/types'
import {
  clearGuestCart,
  GUEST_CART_KEY,
  guestCartCount,
  readGuestCart,
  setGuestQuantity,
  writeGuestCart,
  type GuestCartItem,
} from '../lib/guestCart'
import { useAuth } from './AuthContext'
import { useNotify } from './NotifyContext'

interface CartState {
  /** True when the cart lives on the server (user logged in). */
  isServerCart: boolean
  serverCart: Cart | undefined
  /** The logged-in user's cart could not be loaded. */
  serverCartError: boolean
  reloadServerCart: () => void
  guestItems: GuestCartItem[]
  count: number
  quantityOf: (productId: number) => number
  setQuantity: (productId: number, quantity: number, stock: number) => Promise<boolean>
  mergeGuestCart: () => Promise<void>
  busy: boolean
}

const CartContext = createContext<CartState | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const notify = useNotify()
  const queryClient = useQueryClient()
  const [guestItems, setGuestItems] = useState<GuestCartItem[]>(readGuestCart)

  const cartQuery = useQuery({ queryKey: ['cart'], queryFn: cartApi.get, enabled: !!user })
  const { data: serverCart, isError: serverCartError, isPending: serverCartPending, refetch } = cartQuery

  // Another tab changed the browser cart.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === GUEST_CART_KEY) setGuestItems(readGuestCart())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  /** Moves the visitor's browser cart into their account; called right after login. */
  const mergeGuestCart = useCallback(async () => {
    const items = readGuestCart()
    if (items.length === 0) return
    try {
      queryClient.setQueryData(['cart'], await cartApi.merge(items))
      clearGuestCart()
      setGuestItems([])
    } catch {
      // Keep the browser cart; the user can still add items again.
    }
  }, [queryClient])

  const mutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) =>
      quantity > 0 ? cartApi.setQuantity(productId, quantity) : cartApi.remove(productId),
    onSuccess: (cart) => queryClient.setQueryData(['cart'], cart),
  })

  const quantityOf = useCallback(
    (productId: number) => {
      const items = user ? serverCart?.items : guestItems
      return items?.find((i) => i.productId === productId)?.quantity ?? 0
    },
    [user, serverCart, guestItems],
  )

  const setQuantity = useCallback(
    async (productId: number, quantity: number, stock: number) => {
      if (user) {
        try {
          await mutation.mutateAsync({ productId, quantity })
          return true
        } catch (e) {
          notify(errorMessage(e), 'error')
          return false
        }
      }
      const next = setGuestQuantity(readGuestCart(), productId, quantity, stock)
      writeGuestCart(next)
      setGuestItems(next)
      return true
    },
    [user, mutation, notify],
  )

  const value = useMemo<CartState>(
    () => ({
      isServerCart: !!user,
      serverCart,
      serverCartError,
      reloadServerCart: () => void refetch(),
      guestItems,
      count: user ? (serverCart?.count ?? 0) : guestCartCount(guestItems),
      quantityOf,
      setQuantity,
      mergeGuestCart,
      // Until the session is validated we don't know which cart to write to, and until the server cart has loaded
      // a click on "add" would overwrite the quantity already in it (the API sets absolute quantities).
      busy: mutation.isPending || authLoading || (!!user && serverCartPending),
    }),
    [user, serverCart, serverCartError, serverCartPending, refetch, guestItems, quantityOf, setQuantity, mergeGuestCart,
      mutation.isPending, authLoading],
  )
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
