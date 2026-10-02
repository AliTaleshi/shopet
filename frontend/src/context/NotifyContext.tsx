import { Alert, Snackbar } from '@mui/material'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Severity = 'success' | 'error' | 'info' | 'warning'
type Notify = (message: string, severity?: Severity) => void

const NotifyContext = createContext<Notify>(() => {})

export function NotifyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ message: string; severity: Severity; key: number } | null>(null)
  const notify = useCallback<Notify>((message, severity = 'success') => {
    setState({ message, severity, key: Date.now() })
  }, [])

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      <Snackbar
        key={state?.key}
        open={state !== null}
        autoHideDuration={4000}
        onClose={(_, reason) => reason !== 'clickaway' && setState(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={state?.severity ?? 'info'} variant="filled" onClose={() => setState(null)} sx={{ width: '100%' }}>
          {state?.message}
        </Alert>
      </Snackbar>
    </NotifyContext.Provider>
  )
}

export const useNotify = () => useContext(NotifyContext)
