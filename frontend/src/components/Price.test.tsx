import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Price from './Price'

describe('Price', () => {
  it('shows only the final price without a discount', () => {
    render(<Price price={100000} finalPrice={100000} />)
    expect(screen.getByTestId('final-price')).toHaveTextContent('۱۰۰٬۰۰۰ تومان')
    expect(screen.queryByTestId('original-price')).not.toBeInTheDocument()
  })

  it('shows the original price and discount percent when discounted', () => {
    render(<Price price={200000} finalPrice={150000} />)
    expect(screen.getByTestId('original-price')).toHaveTextContent('۲۰۰٬۰۰۰')
    expect(screen.getByText('۲۵٪')).toBeInTheDocument()
    expect(screen.getByTestId('final-price')).toHaveTextContent('۱۵۰٬۰۰۰')
  })
})
