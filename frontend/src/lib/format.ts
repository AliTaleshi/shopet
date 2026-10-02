import type { OrderStatus, PetType } from '../api/types'

const numberFormat = new Intl.NumberFormat('fa-IR')
const dateFormat = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })
const dateTimeFormat = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Formats a number with Persian digits and thousands separators. */
export const formatNumber = (n: number) => numberFormat.format(n)

export const formatToman = (n: number) => `${formatNumber(n)} تومان`

/** Formats an ISO timestamp as a Jalali (Solar Hijri) date. */
export const formatDate = (iso: string) => dateFormat.format(new Date(iso))

export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso))

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

/** Converts Persian and Arabic digits typed by the user to ASCII digits. */
export function toLatinDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (d) => {
    const persian = PERSIAN_DIGITS.indexOf(d)
    return String(persian >= 0 ? persian : ARABIC_DIGITS.indexOf(d))
  })
}

export const toPersianDigits = (value: string | number) =>
  String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)])

/** Validates an Iranian mobile number (accepts Persian digits). */
export const isValidMobile = (value: string) => /^09\d{9}$/.test(toLatinDigits(value.trim()))

export const discountPercent = (price: number, finalPrice: number) =>
  price > 0 && finalPrice < price ? Math.round(((price - finalPrice) / price) * 100) : 0

export const PET_TYPES: { value: PetType; label: string; emoji: string }[] = [
  { value: 'DOG', label: 'سگ', emoji: '🐶' },
  { value: 'CAT', label: 'گربه', emoji: '🐱' },
  { value: 'BIRD', label: 'پرنده', emoji: '🦜' },
  { value: 'FISH', label: 'ماهی', emoji: '🐠' },
  { value: 'SMALL_PET', label: 'جوندگان', emoji: '🐹' },
  { value: 'REPTILE', label: 'خزندگان', emoji: '🐢' },
]

export const petTypeLabel = (t: PetType) => PET_TYPES.find((p) => p.value === t)?.label ?? t
export const petTypeEmoji = (t: PetType) => PET_TYPES.find((p) => p.value === t)?.emoji ?? '🐾'

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'

export const ORDER_STATUS: Record<OrderStatus, { label: string; color: ChipColor }> = {
  PENDING_PAYMENT: { label: 'در انتظار پرداخت', color: 'warning' },
  PAID: { label: 'پرداخت‌شده', color: 'info' },
  PROCESSING: { label: 'در حال آماده‌سازی', color: 'secondary' },
  SHIPPED: { label: 'ارسال‌شده', color: 'primary' },
  DELIVERED: { label: 'تحویل‌شده', color: 'success' },
  CANCELLED: { label: 'لغو‌شده', color: 'error' },
}

export const SORT_OPTIONS = [
  { value: 'newest', label: 'جدیدترین' },
  { value: 'popular', label: 'پرفروش‌ترین' },
  { value: 'rating', label: 'محبوب‌ترین' },
  { value: 'price_asc', label: 'ارزان‌ترین' },
  { value: 'price_desc', label: 'گران‌ترین' },
] as const
