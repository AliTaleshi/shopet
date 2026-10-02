import createCache from '@emotion/cache'
import { createTheme } from '@mui/material/styles'
import { prefixer } from 'stylis'
import rtlPlugin from 'stylis-plugin-rtl'

/** Emotion cache that flips styles for right-to-left layout. */
export const rtlCache = createCache({ key: 'muirtl', stylisPlugins: [prefixer, rtlPlugin] })

export const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary: { main: '#ea580c', light: '#fb923c', dark: '#c2410c', contrastText: '#fff' },
    secondary: { main: '#1e3a8a', light: '#3b5bb5', dark: '#172e6e', contrastText: '#fff' },
    // Yellow rather than MUI's orange so "warning" stays distinct from the orange brand colour.
    warning: { main: '#eab308', dark: '#a16207', contrastText: '#1e293b' },
    background: { default: '#fff8f1', paper: '#ffffff' },
    text: { primary: '#1e293b', secondary: '#64748b' },
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
    MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: '1px solid #f0e4d7' } } },
    MuiPaper: { styleOverrides: { outlined: { borderColor: '#f0e4d7' } } },
    MuiTextField: { defaultProps: { fullWidth: true } },
  },
})
