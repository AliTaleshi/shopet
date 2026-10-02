import FilterListIcon from '@mui/icons-material/FilterList'
import {
  Box,
  Button,
  Checkbox,
  Drawer,
  FormControlLabel,
  Grid,
  MenuItem,
  Pagination,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { catalogApi } from '../api/endpoints'
import type { PetType, ProductQuery } from '../api/types'
import EmptyState from '../components/EmptyState'
import ProductGrid from '../components/ProductGrid'
import { PET_TYPES, SORT_OPTIONS, formatNumber, petTypeLabel, toLatinDigits } from '../lib/format'

const PAGE_SIZE = 12

function readQuery(params: URLSearchParams): ProductQuery {
  const num = (k: string) => (params.get(k) ? Number(params.get(k)) : undefined)
  return {
    q: params.get('q') ?? undefined,
    categoryId: num('categoryId'),
    petType: (params.get('petType') as PetType) ?? undefined,
    minPrice: num('minPrice'),
    maxPrice: num('maxPrice'),
    inStock: params.get('inStock') === 'true' || undefined,
    discounted: params.get('discounted') === 'true' || undefined,
    sort: (params.get('sort') as ProductQuery['sort']) ?? 'newest',
    page: Math.max(0, (num('page') ?? 1) - 1),
    size: PAGE_SIZE,
  }
}

function Filters({ params, update }: { params: URLSearchParams; update: (changes: Record<string, string | null>) => void }) {
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories })
  const [minPrice, setMinPrice] = useState(params.get('minPrice') ?? '')
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') ?? '')

  useEffect(() => {
    setMinPrice(params.get('minPrice') ?? '')
    setMaxPrice(params.get('maxPrice') ?? '')
  }, [params])

  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography sx={{ fontWeight: 700 }}>فیلترها</Typography>
      <TextField
        select
        size="small"
        label="نوع حیوان"
        value={params.get('petType') ?? ''}
        onChange={(e) => update({ petType: e.target.value || null })}
      >
        <MenuItem value="">همه</MenuItem>
        {PET_TYPES.map((p) => (
          <MenuItem key={p.value} value={p.value}>
            {p.emoji} {p.label}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="دسته‌بندی"
        value={params.get('categoryId') ?? ''}
        onChange={(e) => update({ categoryId: e.target.value || null })}
      >
        <MenuItem value="">همه</MenuItem>
        {categories.data?.map((c) => (
          <MenuItem key={c.id} value={String(c.id)}>
            {c.name}
          </MenuItem>
        ))}
      </TextField>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField size="small" label="از قیمت" value={minPrice} onChange={(e) => setMinPrice(toLatinDigits(e.target.value).replace(/\D/g, ''))} slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
        <TextField size="small" label="تا قیمت" value={maxPrice} onChange={(e) => setMaxPrice(toLatinDigits(e.target.value).replace(/\D/g, ''))} slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
      </Box>
      <Button variant="outlined" size="small" onClick={() => update({ minPrice: minPrice || null, maxPrice: maxPrice || null })}>
        اعمال محدوده قیمت (تومان)
      </Button>
      <FormControlLabel
        control={<Checkbox checked={params.get('inStock') === 'true'} onChange={(e) => update({ inStock: e.target.checked ? 'true' : null })} />}
        label="فقط کالاهای موجود"
      />
      <FormControlLabel
        control={<Checkbox checked={params.get('discounted') === 'true'} onChange={(e) => update({ discounted: e.target.checked ? 'true' : null })} />}
        label="فقط تخفیف‌دارها"
      />
      <Button color="inherit" size="small" onClick={() => update({ petType: null, categoryId: null, minPrice: null, maxPrice: null, inStock: null, discounted: null, q: null })}>
        حذف همه فیلترها
      </Button>
    </Paper>
  )
}

export default function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const [drawer, setDrawer] = useState(false)
  const query = readQuery(params)
  const products = useQuery({
    queryKey: ['products', query],
    queryFn: () => catalogApi.products(query),
    placeholderData: keepPreviousData,
  })

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)))
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }

  const title = query.q
    ? `نتایج جستجو برای «${query.q}»`
    : query.petType
      ? `محصولات ${petTypeLabel(query.petType)}`
      : query.discounted
        ? 'محصولات تخفیف‌دار'
        : 'همه محصولات'

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 3 }} sx={{ display: { xs: 'none', md: 'block' } }}>
        <Filters params={params} update={update} />
      </Grid>
      <Grid size={{ xs: 12, md: 9 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" component="h1">
              {title}
            </Typography>
            {products.data && (
              <Typography variant="body2" color="text.secondary">
                {formatNumber(products.data.totalElements)} کالا
              </Typography>
            )}
          </Box>
          <Button sx={{ display: { md: 'none' } }} startIcon={<FilterListIcon />} variant="outlined" onClick={() => setDrawer(true)}>
            فیلترها
          </Button>
          <TextField select size="small" label="مرتب‌سازی" value={query.sort} onChange={(e) => update({ sort: e.target.value })} sx={{ width: 170 }}>
            {SORT_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        {products.data?.totalElements === 0 ? (
          <EmptyState emoji="🔍" title="محصولی با این مشخصات پیدا نشد." />
        ) : (
          <ProductGrid products={products.data?.content} loading={products.isLoading} />
        )}
        {(products.data?.totalPages ?? 0) > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={products.data!.totalPages}
              page={(query.page ?? 0) + 1}
              onChange={(_, page) => {
                update({ page: String(page) })
                window.scrollTo(0, 0)
              }}
              color="primary"
            />
          </Box>
        )}
      </Grid>
      <Drawer anchor="right" open={drawer} onClose={() => setDrawer(false)}>
        <Box sx={{ width: 300, p: 2 }}>
          <Filters
            params={params}
            update={(c) => {
              update(c)
              setDrawer(false)
            }}
          />
        </Box>
      </Drawer>
    </Grid>
  )
}
