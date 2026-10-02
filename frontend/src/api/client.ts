import axios, { AxiosError } from 'axios'

export const TOKEN_KEY = 'shopet.token'

export const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

type UnauthorizedListener = () => void
let onUnauthorized: UnauthorizedListener | null = null

/** Registers the callback used when the server rejects the stored token. */
export function setUnauthorizedListener(listener: UnauthorizedListener | null) {
  onUnauthorized = listener
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      onUnauthorized?.()
    }
    return Promise.reject(error)
  },
)

interface ProblemDetail {
  detail?: string
  errors?: Record<string, string>
}

/** Extracts a user-facing Persian message from an API error. */
export function errorMessage(error: unknown, fallback = 'خطایی رخ داد؛ دوباره تلاش کنید.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ProblemDetail | undefined
    if (data?.errors) {
      const first = Object.values(data.errors)[0]
      if (first) return first
    }
    if (data?.detail) return data.detail
    if (!error.response) return 'ارتباط با سرور برقرار نشد.'
  }
  return fallback
}

/** Field-level validation errors returned by the API, if any. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as ProblemDetail | undefined)?.errors ?? {}
  }
  return {}
}
