import CategoryIcon from '@mui/icons-material/Category'
import DashboardIcon from '@mui/icons-material/Dashboard'
import InventoryIcon from '@mui/icons-material/Inventory2'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
import PeopleIcon from '@mui/icons-material/People'
import RateReviewIcon from '@mui/icons-material/RateReview'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import { Grid, List, ListItemButton, ListItemIcon, ListItemText, Paper, Tab, Tabs, Typography } from '@mui/material'
import { Suspense } from 'react'
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom'
import PageLoader from '../../components/PageLoader'

const NAV = [
  { to: '/admin', label: 'داشبورد', icon: <DashboardIcon />, exact: true },
  { to: '/admin/orders', label: 'سفارش‌ها', icon: <ReceiptLongIcon /> },
  { to: '/admin/products', label: 'محصولات', icon: <InventoryIcon /> },
  { to: '/admin/categories', label: 'دسته‌بندی‌ها', icon: <CategoryIcon /> },
  { to: '/admin/coupons', label: 'کدهای تخفیف', icon: <LocalOfferIcon /> },
  { to: '/admin/users', label: 'کاربران', icon: <PeopleIcon /> },
  { to: '/admin/reviews', label: 'نظرات', icon: <RateReviewIcon /> },
]

export default function AdminLayout() {
  const { pathname } = useLocation()
  const active = NAV.find((n) => (n.exact ? pathname === n.to : pathname.startsWith(n.to)))?.to ?? false
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 3 }} sx={{ display: { xs: 'none', md: 'block' } }}>
        <Paper variant="outlined" sx={{ position: 'sticky', top: 140 }}>
          <Typography sx={{ p: 2, fontWeight: 800 }}>پنل مدیریت</Typography>
          <List dense>
            {NAV.map((n) => (
              <ListItemButton key={n.to} component={RouterLink} to={n.to} selected={active === n.to}>
                <ListItemIcon>{n.icon}</ListItemIcon>
                <ListItemText primary={n.label} />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 9 }}>
        <Paper variant="outlined" sx={{ mb: 2, display: { md: 'none' } }}>
          <Tabs value={active} variant="scrollable" scrollButtons="auto">
            {NAV.map((n) => (
              <Tab key={n.to} value={n.to} label={n.label} component={RouterLink} to={n.to} />
            ))}
          </Tabs>
        </Paper>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </Grid>
    </Grid>
  )
}
