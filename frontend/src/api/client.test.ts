import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, setUnauthorizedListener, TOKEN_KEY } from './client'

/** Fake server that rejects any request carrying a token, like the backend does with an expired one. */
const rejectTokens: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const response = { config, headers: {}, statusText: '', data: { ok: true } }
  if (AxiosHeaders.from(config.headers).has('Authorization')) {
    throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, { ...response, status: 401, data: {} })
  }
  return { ...response, status: 200 }
}

describe('api client', () => {
  const originalAdapter = api.defaults.adapter
  afterEach(() => {
    api.defaults.adapter = originalAdapter
    setUnauthorizedListener(null)
  })

  it('logs out and retries a public request without an expired token', async () => {
    api.defaults.adapter = rejectTokens
    localStorage.setItem(TOKEN_KEY, 'expired-token')
    const logout = vi.fn(() => localStorage.removeItem(TOKEN_KEY))
    setUnauthorizedListener(logout)

    const res = await api.get('/products')

    expect(res.data).toEqual({ ok: true })
    expect(logout).toHaveBeenCalledOnce()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('does not retry forever when the endpoint really needs a login', async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
        config, headers: {}, statusText: '', data: {}, status: 401,
      })
    })
    api.defaults.adapter = adapter
    localStorage.setItem(TOKEN_KEY, 'expired-token')
    setUnauthorizedListener(() => localStorage.removeItem(TOKEN_KEY))

    await expect(api.get('/cart')).rejects.toBeInstanceOf(AxiosError)
    expect(adapter).toHaveBeenCalledTimes(2)
  })
})
