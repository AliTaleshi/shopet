import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { wishlistApi } from '../api/endpoints'
import { useAuth } from './AuthContext'
import { useNotify } from './NotifyContext'

export function useWishlist() {
  const { user, loading } = useAuth()
  const notify = useNotify()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const ids = useQuery({ queryKey: ['wishlist', 'ids'], queryFn: wishlistApi.ids, enabled: !!user })

  const toggle = useMutation({
    mutationFn: async (productId: number) => {
      const has = ids.data?.includes(productId)
      await (has ? wishlistApi.remove(productId) : wishlistApi.add(productId))
      return !has
    },
    onSuccess: (added) => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] })
      notify(added ? 'به علاقه‌مندی‌ها اضافه شد' : 'از علاقه‌مندی‌ها حذف شد', 'info')
    },
    onError: (e) => notify(errorMessage(e), 'error'),
  })

  return {
    has: (productId: number) => !!ids.data?.includes(productId),
    toggle: (productId: number) => {
      if (loading) return // Stored session is still being checked.
      if (!user) {
        navigate('/login', { state: { from: location.pathname + location.search } })
        return
      }
      toggle.mutate(productId)
    },
  }
}
