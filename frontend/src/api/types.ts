export type Role = 'CUSTOMER' | 'ADMIN'
export type PetType = 'DOG' | 'CAT' | 'BIRD' | 'FISH' | 'SMALL_PET' | 'REPTILE'
export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
export type CouponType = 'PERCENT' | 'FIXED'

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface User {
  id: number
  phone: string
  fullName: string | null
  role: Role
  createdAt: string
}

export interface OtpRequestResult {
  phone: string
  expiresInSeconds: number
  resendInSeconds: number
  devCode: string | null
}

export interface LoginResult {
  token: string
  user: User
  newUser: boolean
}

export interface Address {
  id?: number
  title: string
  receiverName: string
  receiverPhone: string
  province: string
  city: string
  postalCode: string
  addressLine: string
}

export interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  sortOrder: number
}

export interface ProductSummary {
  id: number
  name: string
  brand: string | null
  petType: PetType
  categoryId: number
  categoryName: string
  price: number
  discountPrice: number | null
  finalPrice: number
  stock: number
  active: boolean
  imageUrl: string | null
  ratingAvg: number
  ratingCount: number
}

export interface ProductImage {
  id: number
  url: string
}

export interface ProductDetail extends Omit<ProductSummary, 'imageUrl'> {
  description: string | null
  images: ProductImage[]
  soldCount: number
  createdAt: string
}

export interface ProductQuery {
  q?: string
  categoryId?: number
  petType?: PetType
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  discounted?: boolean
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'rating'
  page?: number
  size?: number
}

export interface CartLine {
  productId: number
  name: string
  imageUrl: string | null
  petType: PetType
  price: number
  unitPrice: number
  quantity: number
  stock: number
  available: boolean
  lineTotal: number
}

export interface Cart {
  items: CartLine[]
  itemsTotal: number
  count: number
}

export interface CheckoutSummary {
  cart: Cart
  itemsTotal: number
  discount: number
  shippingCost: number
  total: number
  couponCode: string | null
}

export interface OrderItem {
  productId: number
  productName: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface Order {
  id: number
  userId: number
  status: OrderStatus
  itemsTotal: number
  discountAmount: number
  shippingCost: number
  total: number
  couponCode: string | null
  receiverName: string
  receiverPhone: string
  province: string
  city: string
  postalCode: string
  addressLine: string
  items: OrderItem[]
  createdAt: string
  paidAt: string | null
  allowedNextStatuses: OrderStatus[]
}

export interface Review {
  id: number
  productId: number
  rating: number
  comment: string | null
  authorName: string
  createdAt: string
}

export interface ReviewEligibility {
  canReview: boolean
  alreadyReviewed: boolean
  purchased: boolean
}

export interface AdminOrder {
  order: Order
  customerPhone: string | null
  customerName: string | null
}

export interface Coupon {
  id: number
  code: string
  type: CouponType
  value: number
  minOrderAmount: number
  maxDiscount: number | null
  usageLimit: number | null
  usedCount: number
  expiresAt: string | null
  active: boolean
  createdAt: string
}

export type CouponInput = Omit<Coupon, 'id' | 'usedCount' | 'createdAt'>

export interface ProductInput {
  name: string
  description: string
  brand: string
  petType: PetType
  categoryId: number
  price: number
  discountPrice: number | null
  stock: number
  active: boolean
}

export interface CategoryInput {
  name: string
  slug: string
  description: string
  sortOrder: number
}

export interface Dashboard {
  productCount: number
  userCount: number
  orderCount: number
  pendingPaymentCount: number
  toProcessCount: number
  revenue: number
  recentOrders: Order[]
  lowStock: ProductSummary[]
}
