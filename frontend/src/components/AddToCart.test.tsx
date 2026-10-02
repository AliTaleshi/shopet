import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { readGuestCart } from '../lib/guestCart'
import { renderWithProviders } from '../test/render'
import AddToCart from './AddToCart'

describe('AddToCart (guest)', () => {
  it('adds to the browser cart and switches to a stepper capped by stock', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddToCart productId={7} stock={2} />)

    await user.click(screen.getByRole('button', { name: /افزودن به سبد/ }))
    expect(readGuestCart()).toEqual([{ productId: 7, quantity: 1 }])
    expect(screen.getByTestId('quantity')).toHaveTextContent('۱')

    await user.click(screen.getByRole('button', { name: 'افزایش تعداد' }))
    expect(screen.getByTestId('quantity')).toHaveTextContent('۲')
    expect(screen.getByRole('button', { name: 'افزایش تعداد' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'کاهش تعداد' }))
    await user.click(screen.getByRole('button', { name: 'حذف از سبد' }))
    expect(readGuestCart()).toEqual([])
    expect(screen.getByRole('button', { name: /افزودن به سبد/ })).toBeInTheDocument()
  })

  it('shows out of stock', () => {
    renderWithProviders(<AddToCart productId={7} stock={0} />)
    expect(screen.getByRole('button', { name: 'ناموجود' })).toBeDisabled()
  })
})
