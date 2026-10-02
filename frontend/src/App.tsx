import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAdmin, RequireAuth } from './components/Guards'
import Layout from './components/Layout'
import PageLoader from './components/PageLoader'
import AccountLayout from './pages/account/AccountLayout'
import AddressesPage from './pages/account/AddressesPage'
import OrderDetailPage from './pages/account/OrderDetailPage'
import OrdersPage from './pages/account/OrdersPage'
import ProfilePage from './pages/account/ProfilePage'
import WishlistPage from './pages/account/WishlistPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import PaymentResultPage from './pages/PaymentResultPage'
import ProductPage from './pages/ProductPage'
import ProductsPage from './pages/ProductsPage'

// The admin panel is loaded on demand so customers don't download it.
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const CategoriesAdminPage = lazy(() => import('./pages/admin/CategoriesAdminPage'))
const CouponsAdminPage = lazy(() => import('./pages/admin/CouponsAdminPage'))
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'))
const OrdersAdminPage = lazy(() => import('./pages/admin/OrdersAdminPage'))
const ProductEditPage = lazy(() => import('./pages/admin/ProductEditPage'))
const ProductsAdminPage = lazy(() => import('./pages/admin/ProductsAdminPage'))
const ReviewsAdminPage = lazy(() => import('./pages/admin/ReviewsAdminPage'))
const UsersAdminPage = lazy(() => import('./pages/admin/UsersAdminPage'))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:id" element={<ProductPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
        <Route path="payment/result" element={<RequireAuth><PaymentResultPage /></RequireAuth>} />
        <Route path="account" element={<RequireAuth><AccountLayout /></RequireAuth>}>
          <Route index element={<Navigate to="orders" replace />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="addresses" element={<AddressesPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="admin" element={<RequireAdmin><Suspense fallback={<PageLoader />}><AdminLayout /></Suspense></RequireAdmin>}>
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersAdminPage />} />
          <Route path="products" element={<ProductsAdminPage />} />
          <Route path="products/:id" element={<ProductEditPage />} />
          <Route path="categories" element={<CategoriesAdminPage />} />
          <Route path="coupons" element={<CouponsAdminPage />} />
          <Route path="users" element={<UsersAdminPage />} />
          <Route path="reviews" element={<ReviewsAdminPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
