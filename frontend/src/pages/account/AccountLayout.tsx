import { Box, Paper, Tab, Tabs } from '@mui/material'
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom'

const TABS = [
  { to: '/account/orders', label: 'سفارش‌ها' },
  { to: '/account/wishlist', label: 'علاقه‌مندی‌ها' },
  { to: '/account/addresses', label: 'آدرس‌ها' },
  { to: '/account/profile', label: 'اطلاعات حساب' },
]

export default function AccountLayout() {
  const { pathname } = useLocation()
  const current = TABS.find((t) => pathname.startsWith(t.to))?.to ?? false
  return (
    <Box>
      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Tabs value={current} variant="scrollable" scrollButtons="auto">
          {TABS.map((t) => (
            <Tab key={t.to} value={t.to} label={t.label} component={RouterLink} to={t.to} />
          ))}
        </Tabs>
      </Paper>
      <Outlet />
    </Box>
  )
}
