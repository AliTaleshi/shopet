import type { PetType, ProductQuery } from '../api/types'
import { PET_TYPES, SORT_OPTIONS, toLatinDigits } from './format'

export const PAGE_SIZE = 12

/** Reads the filters from the URL, ignoring values a hand-edited or outdated link may contain. */
export function readQuery(params: URLSearchParams): ProductQuery {
  const num = (k: string) => {
    const n = Number(toLatinDigits(params.get(k) ?? ''))
    return params.get(k) && Number.isSafeInteger(n) && n >= 0 ? n : undefined
  }
  const petType = params.get('petType')
  const sort = params.get('sort')
  return {
    q: params.get('q')?.trim() || undefined,
    categoryId: num('categoryId'),
    petType: PET_TYPES.some((p) => p.value === petType) ? (petType as PetType) : undefined,
    minPrice: num('minPrice'),
    maxPrice: num('maxPrice'),
    inStock: params.get('inStock') === 'true' || undefined,
    discounted: params.get('discounted') === 'true' || undefined,
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? (sort as ProductQuery['sort']) : 'newest',
    page: Math.max(0, (num('page') ?? 1) - 1),
    size: PAGE_SIZE,
  }
}
