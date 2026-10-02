import { describe, expect, it } from 'vitest'
import { discountPercent, formatDate, formatNumber, formatToman, isValidMobile, toLatinDigits, toPersianDigits } from './format'

describe('format', () => {
  it('formats numbers and Toman amounts with Persian digits', () => {
    expect(formatNumber(2590000)).toBe('۲٬۵۹۰٬۰۰۰')
    expect(formatToman(50000)).toBe('۵۰٬۰۰۰ تومان')
  })

  it('converts between Persian, Arabic and Latin digits', () => {
    expect(toLatinDigits('۰۹۱۲٣٤٥')).toBe('0912345')
    expect(toPersianDigits('09121234567')).toBe('۰۹۱۲۱۲۳۴۵۶۷')
  })

  it('validates Iranian mobile numbers in any digit set', () => {
    expect(isValidMobile('09121234567')).toBe(true)
    expect(isValidMobile('۰۹۱۲۱۲۳۴۵۶۷')).toBe(true)
    expect(isValidMobile('0912123456')).toBe(false)
    expect(isValidMobile('08121234567')).toBe(false)
  })

  it('formats dates in the Jalali calendar', () => {
    expect(formatDate('2026-10-03T08:00:00Z')).toBe('۱۱ مهر ۱۴۰۵')
  })

  it('computes rounded discount percentages', () => {
    expect(discountPercent(2850000, 2590000)).toBe(9)
    expect(discountPercent(1000, 1000)).toBe(0)
    expect(discountPercent(0, 0)).toBe(0)
  })
})
