import { screen, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../test/render'
import CartPage from './CartPage'

vi.mock('../api/endpoints', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/endpoints')>()
  const product = (id: number, price: number, finalPrice: number, stock: number) => ({
    id, name: `محصول ${id}`, brand: null, petType: 'CAT', categoryId: 1, categoryName: 'غذا', price,
    discountPrice: finalPrice < price ? finalPrice : null, finalPrice, stock, active: true, images: [],
    ratingAvg: 0, ratingCount: 0, soldCount: 0, createdAt: '2026-01-01T00:00:00Z', description: null,
  })
  return {
    ...original,
    catalogApi: {
      ...original.catalogApi,
      product: vi.fn((id: number) =>
        id === 99
          ? Promise.reject(new AxiosError('gone', 'ERR', undefined, null, { status: 404, data: {} } as never))
          : Promise.resolve(id === 1 ? product(1, 200000, 150000, 10) : product(2, 50000, 50000, 1)),
      ),
    },
  }
})

describe('CartPage (guest)', () => {
  it('shows an empty state', () => {
    renderWithProviders(<CartPage />)
    expect(screen.getByText('سبد خرید شما خالی است.')).toBeInTheDocument()
  })

  it('drops products that no longer exist from the browser cart', async () => {
    localStorage.setItem('shopet.guestCart', JSON.stringify([{ productId: 1, quantity: 1 }, { productId: 99, quantity: 2 }]))
    renderWithProviders(<CartPage />)

    expect(await screen.findAllByTestId('cart-line')).toHaveLength(1)
    await waitFor(() => expect(JSON.parse(localStorage.getItem('shopet.guestCart')!)).toEqual([{ productId: 1, quantity: 1 }]))
  })

  it('renders browser cart lines with totals, savings and stock warnings', async () => {
    localStorage.setItem('shopet.guestCart', JSON.stringify([{ productId: 1, quantity: 2 }, { productId: 2, quantity: 3 }]))
    renderWithProviders(<CartPage />)

    expect(await screen.findAllByTestId('cart-line')).toHaveLength(2)
    // 2 × 150,000 + 3 × 50,000
    expect(screen.getByTestId('cart-total')).toHaveTextContent('۴۵۰٬۰۰۰ تومان')
    expect(screen.getByText('سود شما از خرید').nextSibling).toHaveTextContent('۱۰۰٬۰۰۰ تومان')
    expect(screen.getByText(/موجودی برخی کالاها کمتر/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ورود و ادامه خرید' })).toBeDisabled()
  })
})
