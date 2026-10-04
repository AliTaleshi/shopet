import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TOKEN_KEY } from '../api/client'
import { renderWithProviders } from '../test/render'
import LoginPage from './LoginPage'

const api = vi.hoisted(() => ({
  requestOtp: vi.fn(),
  verifyOtp: vi.fn(),
  updateProfile: vi.fn(),
  merge: vi.fn(),
}))

vi.mock('../api/endpoints', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/endpoints')>()
  return {
    ...original,
    authApi: { requestOtp: api.requestOtp, verifyOtp: api.verifyOtp },
    accountApi: { ...original.accountApi, updateProfile: api.updateProfile },
    cartApi: { ...original.cartApi, merge: api.merge, get: vi.fn().mockResolvedValue({ items: [], itemsTotal: 0, count: 0 }) },
  }
})

const user = { id: 5, phone: '09121234567', fullName: null, role: 'CUSTOMER', createdAt: '2026-10-01T00:00:00Z' }

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects an invalid mobile number without calling the API', async () => {
    const u = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/login', path: '/login' })
    await u.type(screen.getByLabelText('شماره موبایل'), '0912')
    await u.click(screen.getByRole('button', { name: 'دریافت کد تأیید' }))
    expect(screen.getByText(/شماره موبایل را به‌صورت/)).toBeInTheDocument()
    expect(api.requestOtp).not.toHaveBeenCalled()
  })

  it('logs in a new user with Persian digits, merges the guest cart and asks for a name', async () => {
    api.requestOtp.mockResolvedValue({ phone: '09121234567', expiresInSeconds: 120, resendInSeconds: 60, devCode: '12345' })
    api.verifyOtp.mockResolvedValue({ token: 'jwt-token', user, newUser: true })
    api.merge.mockResolvedValue({ items: [], itemsTotal: 0, count: 0 })
    api.updateProfile.mockResolvedValue({ ...user, fullName: 'سارا' })
    localStorage.setItem('shopet.guestCart', JSON.stringify([{ productId: 1, quantity: 2 }]))

    const u = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/login', path: '/login' })
    await u.type(screen.getByLabelText('شماره موبایل'), '۰۹۱۲۱۲۳۴۵۶۷')
    await u.click(screen.getByRole('button', { name: 'دریافت کد تأیید' }))

    expect(api.requestOtp).toHaveBeenCalledWith('09121234567')
    expect(await screen.findByTestId('dev-code')).toHaveTextContent('12345')
    expect(screen.getByRole('button', { name: /ارسال مجدد کد تا/ })).toBeDisabled()

    await u.type(screen.getByLabelText('کد تأیید'), '۱۲۳۴۵')
    await u.click(screen.getByRole('button', { name: 'ورود' }))

    expect(api.verifyOtp).toHaveBeenCalledWith('09121234567', '12345')
    expect(await screen.findByText('تکمیل اطلاعات')).toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBe('jwt-token')
    expect(api.merge).toHaveBeenCalledWith([{ productId: 1, quantity: 2 }])
    expect(localStorage.getItem('shopet.guestCart')).toBeNull()

    await u.type(screen.getByLabelText('نام و نام خانوادگی'), 'سارا')
    await u.click(screen.getByRole('button', { name: 'ذخیره و ادامه' }))
    await waitFor(() => expect(api.updateProfile).toHaveBeenCalledWith('سارا'))
  })

  it('shows the server error for a wrong code', async () => {
    api.requestOtp.mockResolvedValue({ phone: '09121234567', expiresInSeconds: 120, resendInSeconds: 0, devCode: null })
    api.verifyOtp.mockRejectedValue(
      Object.assign(new Error('bad'), { isAxiosError: true, response: { status: 400, data: { detail: 'کد وارد شده صحیح نیست.' } } }),
    )
    const u = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/login', path: '/login' })
    await u.type(screen.getByLabelText('شماره موبایل'), '09121234567')
    await u.click(screen.getByRole('button', { name: 'دریافت کد تأیید' }))
    await u.type(await screen.findByLabelText('کد تأیید'), '11111')
    await u.click(screen.getByRole('button', { name: 'ورود' }))
    expect(await screen.findByText('کد وارد شده صحیح نیست.')).toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })
})
