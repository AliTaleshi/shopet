import { Button } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import { wishlistApi } from '../../api/endpoints'
import EmptyState from '../../components/EmptyState'
import ProductGrid from '../../components/ProductGrid'

export default function WishlistPage() {
  const list = useQuery({ queryKey: ['wishlist', 'list'], queryFn: wishlistApi.list })
  if (list.data?.length === 0) {
    return <EmptyState emoji="💛" title="لیست علاقه‌مندی‌های شما خالی است." action={<Button component={RouterLink} to="/products" variant="contained">مشاهده محصولات</Button>} />
  }
  return <ProductGrid products={list.data} loading={list.isLoading} skeletons={4} />
}
