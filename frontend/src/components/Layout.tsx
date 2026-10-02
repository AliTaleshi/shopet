import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import PersonIcon from '@mui/icons-material/Person'
import PetsIcon from '@mui/icons-material/Pets'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import SearchIcon from '@mui/icons-material/Search'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import {
  AppBar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  Link,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import { useEffect, useState, type FormEvent } from 'react'
import { Link as RouterLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { PET_TYPES, formatNumber, toPersianDigits } from '../lib/format'

function Logo() {
  return (
    <Box component={RouterLink} to="/" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'inherit', textDecoration: 'none' }}>
      <PetsIcon sx={{ color: 'secondary.main' }} />
      <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: 0 }}>
        شاپت
      </Typography>
    </Box>
  )
}

function SearchBox({ onDone }: { onDone?: () => void }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const location = useLocation()
  const [q, setQ] = useState('')

  useEffect(() => {
    setQ(location.pathname === '/products' ? (params.get('q') ?? '') : '')
  }, [location.pathname, params])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const query = q.trim()
    navigate(query ? `/products?q=${encodeURIComponent(query)}` : '/products')
    onDone?.()
  }

  return (
    <Box component="form" onSubmit={submit} role="search" sx={{ flexGrow: 1, maxWidth: 520 }}>
      <TextField
        size="small"
        placeholder="جستجو در محصولات..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        slotProps={{
          htmlInput: { 'aria-label': 'جستجو' },
          input: {
            sx: { bgcolor: 'rgba(255,255,255,.95)', borderRadius: 2 },
            endAdornment: (
              <InputAdornment position="end">
                <IconButton type="submit" size="small" aria-label="جستجو">
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
    </Box>
  )
}

function AccountButton() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  if (!user) {
    return (
      <Button color="inherit" variant="outlined" component={RouterLink} to="/login" startIcon={<PersonIcon />} sx={{ borderColor: 'rgba(255,255,255,.5)', whiteSpace: 'nowrap' }}>
        ورود | ثبت‌نام
      </Button>
    )
  }
  const go = (path: string) => {
    setAnchor(null)
    navigate(path)
  }
  return (
    <>
      <IconButton color="inherit" onClick={(e) => setAnchor(e.currentTarget)} aria-label="حساب کاربری">
        <PersonIcon />
      </IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <Box sx={{ px: 2, py: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>{user.fullName || 'کاربر شاپت'}</Typography>
          <Typography variant="caption" color="text.secondary">
            {toPersianDigits(user.phone)}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => go('/account/orders')}>
          <ListItemIcon><ReceiptLongIcon fontSize="small" /></ListItemIcon>
          سفارش‌های من
        </MenuItem>
        <MenuItem onClick={() => go('/account/wishlist')}>
          <ListItemIcon><FavoriteBorderIcon fontSize="small" /></ListItemIcon>
          علاقه‌مندی‌ها
        </MenuItem>
        <MenuItem onClick={() => go('/account/profile')}>
          <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
          حساب کاربری
        </MenuItem>
        {isAdmin && (
          <MenuItem onClick={() => go('/admin')}>
            <ListItemIcon><AdminPanelSettingsIcon fontSize="small" /></ListItemIcon>
            پنل مدیریت
          </MenuItem>
        )}
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null)
            logout()
            navigate('/')
          }}
        >
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          خروج
        </MenuItem>
      </Menu>
    </>
  )
}

function Header() {
  const cart = useCart()
  const [drawer, setDrawer] = useState(false)
  return (
    <AppBar position="sticky" elevation={0}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ gap: 2, minHeight: { xs: 60, md: 68 } }}>
          <IconButton color="inherit" sx={{ display: { md: 'none' } }} onClick={() => setDrawer(true)} aria-label="منو">
            <MenuIcon />
          </IconButton>
          <Logo />
          <Box sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1, justifyContent: 'center' }}>
            <SearchBox />
          </Box>
          <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />
          <AccountButton />
          <IconButton color="inherit" component={RouterLink} to="/cart" aria-label="سبد خرید">
            <Badge badgeContent={cart.count ? formatNumber(cart.count) : 0} color="secondary" data-testid="cart-count">
              <ShoppingCartIcon />
            </Badge>
          </IconButton>
        </Toolbar>
        <Box sx={{ display: { xs: 'flex', md: 'none' }, pb: 1.5 }}>
          <SearchBox />
        </Box>
      </Container>
      <Box sx={{ bgcolor: 'primary.dark', display: { xs: 'none', md: 'block' } }}>
        <Container maxWidth="lg" sx={{ display: 'flex', gap: 1, py: 0.5 }}>
          <Button color="inherit" component={RouterLink} to="/products" size="small">
            همه محصولات
          </Button>
          {PET_TYPES.map((p) => (
            <Button key={p.value} color="inherit" component={RouterLink} to={`/products?petType=${p.value}`} size="small">
              {p.emoji} {p.label}
            </Button>
          ))}
          <Button color="inherit" component={RouterLink} to="/products?discounted=true" size="small" sx={{ mr: 'auto', color: 'secondary.main' }}>
            🔥 تخفیف‌ها
          </Button>
        </Container>
      </Box>
      <Drawer anchor="right" open={drawer} onClose={() => setDrawer(false)}>
        <Box sx={{ width: 260 }} role="presentation" onClick={() => setDrawer(false)}>
          <Box sx={{ p: 2, bgcolor: 'primary.main', color: '#fff' }}>
            <Logo />
          </Box>
          <List>
            <ListItemButton component={RouterLink} to="/products">
              <ListItemText primary="همه محصولات" />
            </ListItemButton>
            {PET_TYPES.map((p) => (
              <ListItemButton key={p.value} component={RouterLink} to={`/products?petType=${p.value}`}>
                <ListItemIcon sx={{ fontSize: 22 }}>{p.emoji}</ListItemIcon>
                <ListItemText primary={p.label} />
              </ListItemButton>
            ))}
            <ListItemButton component={RouterLink} to="/products?discounted=true">
              <ListItemIcon sx={{ fontSize: 22 }}>🔥</ListItemIcon>
              <ListItemText primary="تخفیف‌ها" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>
    </AppBar>
  )
}

function Footer() {
  return (
    <Box component="footer" sx={{ bgcolor: '#111827', color: '#d1d5db', mt: 8, py: 5 }}>
      <Container maxWidth="lg" sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'space-between' }}>
        <Box sx={{ maxWidth: 360 }}>
          <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
            🐾 شاپت
          </Typography>
          <Typography variant="body2">
            فروشگاه اینترنتی غذا، اسباب‌بازی و لوازم بهداشتی حیوانات خانگی؛ با ارسال سریع به سراسر ایران.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography sx={{ color: '#fff', fontWeight: 700 }}>دسترسی سریع</Typography>
          <Link component={RouterLink} to="/products" color="inherit" underline="hover">محصولات</Link>
          <Link component={RouterLink} to="/products?discounted=true" color="inherit" underline="hover">تخفیف‌ها</Link>
          <Link component={RouterLink} to="/account/orders" color="inherit" underline="hover">پیگیری سفارش</Link>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography sx={{ color: '#fff', fontWeight: 700 }}>چرا شاپت؟</Typography>
          <Typography variant="body2">✔ ارسال رایگان خرید بالای ۱ میلیون تومان</Typography>
          <Typography variant="body2">✔ ضمانت اصالت کالا</Typography>
          <Typography variant="body2">✔ پرداخت امن اینترنتی</Typography>
        </Box>
      </Container>
    </Box>
  )
}

export default function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Container maxWidth="lg" component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Outlet />
      </Container>
      <Footer />
    </Box>
  )
}
