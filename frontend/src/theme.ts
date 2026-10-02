import createCache from '@emotion/cache'
import { createTheme } from '@mui/material/styles'
import { prefixer } from 'stylis'
import rtlPlugin from 'stylis-plugin-rtl'

/** Emotion cache that flips styles for right-to-left layout. */
export const rtlCache = createCache({ key: 'muirtl', stylisPlugins: [prefixer, rtlPlugin] })

export const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary: { main: '#0f766e', light: '#14b8a6', dark: '#115e59', contrastText: '#fff' },
    secondary: { main: '#f59e0b', contrastText: '#1f2937' },
    background: { default: '#f6f7f9', paper: '#ffffff' },
    text: { primary: '#1f2937', secondary: '#6b7280' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Vazirmatn Variable", Vazirmatn, Tahoma, sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: '1px solid #e5e7eb' } } },
    MuiPaper: { styleOverrides: { outlined: { borderColor: '#e5e7eb' } } },
    MuiTextField: { defaultProps: { fullWidth: true } },
  },
})
