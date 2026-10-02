import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { errorMessage } from '../api/client'
import { cartApi } from '../api/endpoints'
import type { Cart } from '../api/types'
import {
  clearGuestCart,
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
      const items = user ? cartQuery.data?.items : guestItems
      return items?.find((i) => i.productId === productId)?.quantity ?? 0
    },
    [user, cartQuery.data, guestItems],
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
      serverCart: cartQuery.data,
      guestItems,
      count: user ? (cartQuery.data?.count ?? 0) : guestCartCount(guestItems),
      quantityOf,
      setQuantity,
      mergeGuestCart,
      // Until the stored session is validated we don't know which cart to write to.
      busy: mutation.isPending || authLoading,
    }),
    [user, cartQuery.data, guestItems, quantityOf, setQuantity, mergeGuestCart, mutation.isPending, authLoading],
  )
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
