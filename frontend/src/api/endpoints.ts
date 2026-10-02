import { api } from './client'
import type {
  Address,
  AdminOrder,
  Cart,
  Category,
  CategoryInput,
  CheckoutSummary,
  Coupon,
  CouponInput,
  Dashboard,
  LoginResult,
  Order,
  OrderStatus,
  OtpRequestResult,
  Page,
  ProductDetail,
  ProductInput,
  ProductQuery,
  ProductSummary,
  Review,
  ReviewEligibility,
  User,
} from './types'

const data = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data)

/** Removes empty values so they are not sent as query parameters. */
function clean(params: object) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
}

export const authApi = {
  requestOtp: (phone: string) => data(api.post<OtpRequestResult>('/auth/otp/request', { phone })),
  verifyOtp: (phone: string, code: string) => data(api.post<LoginResult>('/auth/otp/verify', { phone, code })),
}

export const accountApi = {
  me: () => data(api.get<User>('/me')),
  updateProfile: (fullName: string) => data(api.put<User>('/me', { fullName })),
  addresses: () => data(api.get<Address[]>('/me/addresses')),
  addAddress: (a: Address) => data(api.post<Address>('/me/addresses', a)),
  updateAddress: (id: number, a: Address) => data(api.put<Address>(`/me/addresses/${id}`, a)),
  deleteAddress: (id: number) => api.delete(`/me/addresses/${id}`),
}

export const catalogApi = {
  categories: () => data(api.get<Category[]>('/categories')),
  products: (q: ProductQuery) => data(api.get<Page<ProductSummary>>('/products', { params: clean(q) })),
  product: (id: number) => data(api.get<ProductDetail>(`/products/${id}`)),
  reviews: (id: number, page = 0) => data(api.get<Page<Review>>(`/products/${id}/reviews`, { params: { page } })),
  reviewEligibility: (id: number) => data(api.get<ReviewEligibility>(`/products/${id}/reviews/eligibility`)),
  addReview: (id: number, rating: number, comment: string) =>
    data(api.post<Review>(`/products/${id}/reviews`, { rating, comment })),
}

export const cartApi = {
  get: () => data(api.get<Cart>('/cart')),
  setQuantity: (productId: number, quantity: number) =>
    data(api.put<Cart>(`/cart/items/${productId}`, { quantity })),
  remove: (productId: number) => data(api.delete<Cart>(`/cart/items/${productId}`)),
  merge: (items: { productId: number; quantity: number }[]) => data(api.post<Cart>('/cart/merge', { items })),
}

export const wishlistApi = {
  list: () => data(api.get<ProductSummary[]>('/wishlist')),
  ids: () => data(api.get<number[]>('/wishlist/ids')),
  add: (productId: number) => api.put(`/wishlist/${productId}`),
  remove: (productId: number) => api.delete(`/wishlist/${productId}`),
}

export const orderApi = {
  preview: (couponCode?: string) => data(api.post<CheckoutSummary>('/checkout/preview', { couponCode })),
  create: (addressId: number, couponCode?: string) => data(api.post<Order>('/orders', { addressId, couponCode })),
  list: (page = 0) => data(api.get<Page<Order>>('/orders', { params: { page } })),
  get: (id: number) => data(api.get<Order>(`/orders/${id}`)),
  cancel: (id: number) => data(api.post<Order>(`/orders/${id}/cancel`)),
  pay: (id: number) => data(api.post<{ redirectUrl: string }>(`/orders/${id}/pay`)),
}

export const adminApi = {
  dashboard: () => data(api.get<Dashboard>('/admin/dashboard')),
  products: (q: ProductQuery) => data(api.get<Page<ProductSummary>>('/admin/products', { params: clean(q) })),
  product: (id: number) => data(api.get<ProductDetail>(`/admin/products/${id}`)),
  createProduct: (p: ProductInput) => data(api.post<ProductDetail>('/admin/products', p)),
  updateProduct: (id: number, p: ProductInput) => data(api.put<ProductDetail>(`/admin/products/${id}`, p)),
  deleteProduct: (id: number) => api.delete(`/admin/products/${id}`),
  uploadImages: (id: number, files: File[]) => {
    const form = new FormData()
    files.forEach((f) => form.append('files', f))
    return data(api.post<ProductDetail>(`/admin/products/${id}/images`, form))
  },
  deleteImage: (id: number, imageId: number) => data(api.delete<ProductDetail>(`/admin/products/${id}/images/${imageId}`)),
  createCategory: (c: CategoryInput) => data(api.post<Category>('/admin/categories', c)),
  updateCategory: (id: number, c: CategoryInput) => data(api.put<Category>(`/admin/categories/${id}`, c)),
  deleteCategory: (id: number) => api.delete(`/admin/categories/${id}`),
  orders: (status: OrderStatus | '', page: number) =>
    data(api.get<Page<AdminOrder>>('/admin/orders', { params: clean({ status, page }) })),
  order: (id: number) => data(api.get<AdminOrder>(`/admin/orders/${id}`)),
  changeOrderStatus: (id: number, status: OrderStatus) =>
    data(api.put<AdminOrder>(`/admin/orders/${id}/status`, { status })),
  coupons: () => data(api.get<Coupon[]>('/admin/coupons')),
  createCoupon: (c: CouponInput) => data(api.post<Coupon>('/admin/coupons', c)),
  updateCoupon: (id: number, c: CouponInput) => data(api.put<Coupon>(`/admin/coupons/${id}`, c)),
  deleteCoupon: (id: number) => api.delete(`/admin/coupons/${id}`),
  users: (q: string, page: number) => data(api.get<Page<User>>('/admin/users', { params: clean({ q, page }) })),
  reviews: (page: number) => data(api.get<Page<Review>>('/admin/reviews', { params: { page } })),
  deleteReview: (id: number) => api.delete(`/admin/reviews/${id}`),
}
