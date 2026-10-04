import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setUnauthorizedListener, TOKEN_KEY } from '../api/client'
import { accountApi } from '../api/endpoints'
import type { User } from '../api/types'

interface AuthState {
  user: User | null
  /** True until the stored token has been validated on startup. */
  loading: boolean
  isAdmin: boolean
  login: (token: string, user: User) => void
  logout: () => void
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthState | null>(null)

const PRIVATE_QUERY_ROOTS = new Set(['me', 'cart', 'wishlist', 'orders', 'addresses', 'admin'])

/** Queries holding data of the logged-in user (review eligibility lives under the public ['reviews', id] key). */
function isPrivateQuery(key: readonly unknown[]) {
  return PRIVATE_QUERY_ROOTS.has(String(key[0])) || (key[0] === 'reviews' && key[2] === 'eligibility')
}

const isUnauthorized = (e: unknown) => axios.isAxiosError(e) && e.response?.status === 401

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => localStorage.getItem(TOKEN_KEY) !== null)

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    // Drop everything tied to the account so the next user never sees it; the public catalog stays cached.
    queryClient.removeQueries({ predicate: (q) => isPrivateQuery(q.queryKey) })
  }, [queryClient])

  const login = useCallback((token: string, u: User) => {
    localStorage.setItem(TOKEN_KEY, token)
    setUser(u)
  }, [])

  useEffect(() => {
    setUnauthorizedListener(logout)
    return () => setUnauthorizedListener(null)
  }, [logout])

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return
    accountApi
      .me()
      .then(setUser)
      // Only a rejected token ends the session; a network error or a restarting server must not log the user out.
      .catch((e) => isUnauthorized(e) && logout())
      .finally(() => setLoading(false))
  }, [logout])

  // Keep tabs in sync: logging in or out in one tab applies to the others.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== TOKEN_KEY) return
      if (!e.newValue) {
        logout()
      } else {
        accountApi.me().then(setUser).catch(() => {})
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [logout])

  const value = useMemo<AuthState>(
    () => ({ user, loading, isAdmin: user?.role === 'ADMIN', login, logout, setUser }),
    [user, loading, login, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
