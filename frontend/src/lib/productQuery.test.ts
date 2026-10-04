import { describe, expect, it } from 'vitest'
import { readQuery } from './productQuery'

describe('readQuery', () => {
  it('reads valid filters, accepting Persian digits', () => {
    const q = readQuery(new URLSearchParams('q= غذا &petType=CAT&categoryId=3&minPrice=۱۰۰۰&inStock=true&sort=price_asc&page=2'))
    expect(q).toMatchObject({ q: 'غذا', petType: 'CAT', categoryId: 3, minPrice: 1000, inStock: true, sort: 'price_asc', page: 1 })
  })

  it('drops values a broken or hand-edited link may contain instead of sending them to the API', () => {
    const q = readQuery(new URLSearchParams('petType=UNICORN&categoryId=abc&minPrice=-5&maxPrice=1e400&sort=random&page=0'))
    expect(q.petType).toBeUndefined()
    expect(q.categoryId).toBeUndefined()
    expect(q.minPrice).toBeUndefined()
    expect(q.maxPrice).toBeUndefined()
    expect(q.sort).toBe('newest')
    expect(q.page).toBe(0)
  })
})
