import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

export const ADMIN_PHONE = process.env.ADMIN_PHONE ?? '09120000000'
export const ADMIN_TOKEN_FILE = '.auth/admin-token.txt'

/** A fresh random customer mobile number so every run uses new users. */
export function randomPhone() {
  return '0915' + String(Math.floor(Math.random() * 10_000_000)).padStart(7, '0')
}

export async function apiLogin(request: APIRequestContext, phone: string): Promise<string> {
  const otp = await request.post('/api/auth/otp/request', { data: { phone } })
  expect(otp.ok(), await otp.text()).toBeTruthy()
  const { devCode } = await otp.json()
  const res = await request.post('/api/auth/otp/verify', { data: { phone, code: devCode } })
  expect(res.ok()).toBeTruthy()
  return (await res.json()).token
}

export function adminToken() {
  return readFileSync(ADMIN_TOKEN_FILE, 'utf8').trim()
}

/** Starts the page already logged in with the given token. */
export async function useToken(page: Page, token: string) {
  await page.addInitScript((t) => localStorage.setItem('shopet.token', t), token)
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` })

export async function findProduct(request: APIRequestContext, query: string) {
  const res = await request.get('/api/products', { params: { q: query, inStock: true } })
  const page = await res.json()
  expect(page.content.length, `product "${query}" should exist`).toBeGreaterThan(0)
  return page.content[0] as { id: number; name: string; finalPrice: number }
}

/** Places and pays for an order entirely through the API; returns the order id. */
export async function placePaidOrder(request: APIRequestContext, token: string, productId: number, quantity = 1) {
  await request.put(`/api/cart/items/${productId}`, { headers: auth(token), data: { quantity } })
  const address = await request.post('/api/me/addresses', {
    headers: auth(token),
    data: {
      title: 'خانه', receiverName: 'کاربر آزمایشی', receiverPhone: '09121111111', province: 'تهران',
      city: 'تهران', postalCode: '1234567890', addressLine: 'خیابان آزمایش، پلاک ۱',
    },
  })
  const addressId = (await address.json()).id
  const order = await request.post('/api/orders', { headers: auth(token), data: { addressId } })
  expect(order.ok(), await order.text()).toBeTruthy()
  const orderId = (await order.json()).id
  const pay = await request.post(`/api/orders/${orderId}/pay`, { headers: auth(token) })
  const { redirectUrl } = await pay.json()
  const authority = redirectUrl.split('/').pop()
  await request.get(`/api/payments/callback?authority=${authority}&status=OK`, { maxRedirects: 0 })
  return orderId as number
}

/** A tiny valid PNG used for upload tests. */
export const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)
