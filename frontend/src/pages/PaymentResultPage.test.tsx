import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../test/render'
import PaymentResultPage from './PaymentResultPage'

const get = vi.hoisted(() => vi.fn())
vi.mock('../api/endpoints', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/endpoints')>()
  return { ...original, orderApi: { ...original.orderApi, get } }
})

describe('PaymentResultPage', () => {
  it("trusts the order's status over the URL", async () => {
    get.mockResolvedValue({ id: 7, status: 'CANCELLED' })
    renderWithProviders(<PaymentResultPage />, { route: '/payment/result?status=success&orderId=7' })

    expect(await screen.findByText('پرداخت ناموفق بود')).toBeInTheDocument()
    expect(screen.getByText(/این سفارش لغو شده است/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'مشاهده سفارش' })).toHaveAttribute('href', '/account/orders/7')
  })

  it('offers to retry a payment that is still pending', async () => {
    get.mockResolvedValue({ id: 8, status: 'PENDING_PAYMENT' })
    renderWithProviders(<PaymentResultPage />, { route: '/payment/result?status=failed&orderId=8' })
    expect(await screen.findByRole('link', { name: 'پرداخت مجدد' })).toBeInTheDocument()
  })
})
