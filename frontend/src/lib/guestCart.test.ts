import { describe, expect, it } from 'vitest'
import { GUEST_CART_KEY, guestCartCount, readGuestCart, setGuestQuantity, writeGuestCart } from './guestCart'

describe('guest cart', () => {
  it('adds, updates and removes items', () => {
    let cart = setGuestQuantity([], 1, 2, 10)
    cart = setGuestQuantity(cart, 2, 1, 10)
    expect(cart).toEqual([{ productId: 1, quantity: 2 }, { productId: 2, quantity: 1 }])
    cart = setGuestQuantity(cart, 1, 5, 10)
    expect(cart[0]).toEqual({ productId: 1, quantity: 5 })
    cart = setGuestQuantity(cart, 1, 0, 10)
    expect(cart).toEqual([{ productId: 2, quantity: 1 }])
    expect(guestCartCount(cart)).toBe(1)
  })

  it('caps quantity by stock and the per-item limit', () => {
    expect(setGuestQuantity([], 1, 8, 3)).toEqual([{ productId: 1, quantity: 3 }])
    expect(setGuestQuantity([], 1, 50, 100)).toEqual([{ productId: 1, quantity: 20 }])
    expect(setGuestQuantity([], 1, 2, 0)).toEqual([])
  })

  it('persists to localStorage and ignores corrupted data', () => {
    writeGuestCart([{ productId: 3, quantity: 2 }])
    expect(readGuestCart()).toEqual([{ productId: 3, quantity: 2 }])
    localStorage.setItem(GUEST_CART_KEY, '{not json')
    expect(readGuestCart()).toEqual([])
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify([{ productId: 'x', quantity: 1 }, { productId: 4, quantity: 1 }]))
    expect(readGuestCart()).toEqual([{ productId: 4, quantity: 1 }])
  })
})
