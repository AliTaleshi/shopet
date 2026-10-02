import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Box, Button, Card, CardActionArea, Grid, Paper, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { catalogApi } from '../api/endpoints'
import ProductGrid from '../components/ProductGrid'
import { PET_TYPES } from '../lib/format'

function Section({ title, to, children }: { title: string; to: string; children: ReactNode }) {
  return (
    <Box component="section" sx={{ mt: 5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">
          {title}
        </Typography>
        <Button component={RouterLink} to={to} endIcon={<ArrowBackIcon />}>
          مشاهده همه
        </Button>
      </Box>
      {children}
    </Box>
  )
}

export default function HomePage() {
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories })
  const discounted = useQuery({
    queryKey: ['products', 'home-discounted'],
    queryFn: () => catalogApi.products({ discounted: true, inStock: true, size: 8, sort: 'popular' }),
  })
  const newest = useQuery({
    queryKey: ['products', 'home-newest'],
    queryFn: () => catalogApi.products({ sort: 'newest', size: 8 }),
  })

  return (
    <>
      <Paper
        sx={{
          p: { xs: 3, md: 6 },
          borderRadius: 4,
          color: '#fff',
          background: 'linear-gradient(120deg, #c2410c 0%, #ea580c 50%, #fb923c 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          overflow: 'hidden',
        }}
      >
        <Box>
          <Typography variant="h3" component="h1" sx={{ fontSize: { xs: 28, md: 44 }, mb: 1.5 }}>
            هر چیزی که دوست کوچولوی شما لازم دارد
          </Typography>
          <Typography sx={{ opacity: 0.9, mb: 3, maxWidth: 520 }}>
            غذا، تشویقی، اسباب‌بازی و لوازم بهداشتی اصل برای سگ، گربه، پرنده، ماهی و دیگر حیوانات خانگی. ارسال رایگان برای خریدهای بالای یک میلیون تومان.
          </Typography>
          <Button variant="contained" color="secondary" size="large" component={RouterLink} to="/products">
            شروع خرید
          </Button>
        </Box>
        <Box sx={{ fontSize: { xs: 0, md: 120 }, lineHeight: 1, display: { xs: 'none', md: 'block' } }} aria-hidden>
          🐶🐱
        </Box>
      </Paper>

      <Box component="section" sx={{ mt: 4 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
          خرید بر اساس حیوان
        </Typography>
        <Grid container spacing={2}>
          {PET_TYPES.map((p) => (
            <Grid key={p.value} size={{ xs: 4, sm: 2 }}>
              <Card>
                <CardActionArea component={RouterLink} to={`/products?petType=${p.value}`} sx={{ py: 2, textAlign: 'center' }}>
                  <Box sx={{ fontSize: 40 }}>{p.emoji}</Box>
                  <Typography sx={{ fontWeight: 700 }}>{p.label}</Typography>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {(discounted.data?.content.length ?? 0) > 0 && (
        <Section title="🔥 تخفیف‌های ویژه" to="/products?discounted=true">
          <ProductGrid products={discounted.data?.content} loading={discounted.isLoading} />
        </Section>
      )}

      <Box component="section" sx={{ mt: 5 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
          دسته‌بندی‌ها
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {categories.data?.map((c) => (
            <Button key={c.id} variant="outlined" component={RouterLink} to={`/products?categoryId=${c.id}`} sx={{ borderRadius: 5, bgcolor: '#fff' }}>
              {c.name}
            </Button>
          ))}
        </Box>
      </Box>

      <Section title="جدیدترین محصولات" to="/products?sort=newest">
        <ProductGrid products={newest.data?.content} loading={newest.isLoading} />
      </Section>
    </>
  )
}
