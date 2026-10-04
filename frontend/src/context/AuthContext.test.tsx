import { screen, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TOKEN_KEY } from '../api/client'
import { renderWithProviders } from '../test/render'
import { useAuth } from './AuthContext'

const me = vi.hoisted(() => vi.fn())
vi.mock('../api/endpoints', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/endpoints')>()
  return { ...original, accountApi: { ...original.accountApi, me } }
})

function WhoAmI() {
  const { user, loading } = useAuth()
  return <div>{loading ? 'loading' : (user?.phone ?? 'guest')}</div>
}

const httpError = (status?: number) =>
  new AxiosError('failed', 'ERR', undefined, null, status ? ({ status, data: {} } as never) : undefined)

describe('AuthProvider session restore', () => {
  beforeEach(() => {
    me.mockReset()
  })

  it('restores the user from a stored token', async () => {
    localStorage.setItem(TOKEN_KEY, 'token')
    me.mockResolvedValue({ id: 1, phone: '09121234567', fullName: null, role: 'CUSTOMER', createdAt: '' })
    renderWithProviders(<WhoAmI />)
    expect(await screen.findByText('09121234567')).toBeInTheDocument()
  })

  it('keeps the session when the server is unreachable', async () => {
    localStorage.setItem(TOKEN_KEY, 'token')
    me.mockImplementation(() => Promise.reject(httpError()))
    renderWithProviders(<WhoAmI />)
    await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument())
    expect(localStorage.getItem(TOKEN_KEY)).toBe('token')
  })

  it('ends the session when the token is rejected', async () => {
    localStorage.setItem(TOKEN_KEY, 'token')
    me.mockImplementation(() => Promise.reject(httpError(401)))
    renderWithProviders(<WhoAmI />)
    expect(await screen.findByText('guest')).toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })
})
