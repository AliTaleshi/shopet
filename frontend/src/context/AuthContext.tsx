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

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => localStorage.getItem(TOKEN_KEY) !== null)

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    queryClient.removeQueries({ queryKey: ['me'] })
    queryClient.removeQueries({ queryKey: ['cart'] })
    queryClient.removeQueries({ queryKey: ['wishlist'] })
    queryClient.removeQueries({ queryKey: ['orders'] })
    queryClient.removeQueries({ queryKey: ['addresses'] })
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
      .catch(() => logout())
      .finally(() => setLoading(false))
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
