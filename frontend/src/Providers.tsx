import { CacheProvider } from '@emotion/react'
import axios from 'axios'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { NotifyProvider } from './context/NotifyContext'
import { rtlCache, theme } from './theme'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Client errors (404, 400, ...) won't change on retry; only retry network and server errors, once.
        retry: (failureCount, error) =>
          failureCount < 1 && !(axios.isAxiosError(error) && (error.response?.status ?? 500) < 500),
      },
    },
  })
}

/** All app-wide providers (router excluded so tests can supply a memory router). */
export default function Providers({ children, client }: { children: ReactNode; client?: QueryClient }) {
  const [queryClient] = useState(() => client ?? createQueryClient())
  return (
    <CacheProvider value={rtlCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <NotifyProvider>
            <AuthProvider>
              <CartProvider>{children}</CartProvider>
            </AuthProvider>
          </NotifyProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </CacheProvider>
  )
}
