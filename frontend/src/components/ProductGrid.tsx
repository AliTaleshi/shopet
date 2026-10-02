import { Grid, Skeleton } from '@mui/material'
import type { ProductSummary } from '../api/types'
import ProductCard from './ProductCard'

const columns = { xs: 6, sm: 4, md: 3 }

export default function ProductGrid({ products, loading, skeletons = 8 }: { products?: ProductSummary[]; loading?: boolean; skeletons?: number }) {
  if (loading) {
    return (
      <Grid container spacing={2}>
        {Array.from({ length: skeletons }, (_, i) => (
          <Grid key={i} size={columns}>
            <Skeleton variant="rounded" height={340} />
          </Grid>
        ))}
      </Grid>
    )
  }
  return (
    <Grid container spacing={2}>
      {products?.map((p) => (
        <Grid key={p.id} size={columns}>
          <ProductCard product={p} />
        </Grid>
      ))}
    </Grid>
  )
}
