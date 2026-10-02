import AddIcon from '@mui/icons-material/Add'
import {
  Box,
  Button,
  Chip,
  Pagination,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { adminApi } from '../../api/endpoints'
import ProductImage from '../../components/ProductImage'
import { formatNumber, formatToman, petTypeLabel } from '../../lib/format'

export default function ProductsAdminPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const products = useQuery({
    queryKey: ['admin', 'products', q, page],
    queryFn: () => adminApi.products({ q, page, size: 20 }),
    placeholderData: keepPreviousData,
  })

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>محصولات</Typography>
        <TextField size="small" placeholder="جستجوی نام یا برند" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} sx={{ width: 240 }} />
        <Button variant="contained" startIcon={<AddIcon />} component={RouterLink} to="/admin/products/new">
          محصول جدید
        </Button>
      </Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>نام</TableCell>
              <TableCell>دسته / حیوان</TableCell>
              <TableCell>قیمت نهایی</TableCell>
              <TableCell>موجودی</TableCell>
              <TableCell>وضعیت</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.data?.content.map((p) => (
              <TableRow key={p.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/products/${p.id}`)}>
                <TableCell sx={{ width: 56 }}>
                  <Box sx={{ width: 44, borderRadius: 1, overflow: 'hidden' }}>
                    <ProductImage src={p.imageUrl} alt={p.name} petType={p.petType} height={44} />
                  </Box>
                </TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.categoryName} / {petTypeLabel(p.petType)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatToman(p.finalPrice)}</TableCell>
                <TableCell sx={{ color: p.stock < 5 ? 'error.main' : undefined }}>{formatNumber(p.stock)}</TableCell>
                <TableCell>{p.active ? <Chip size="small" color="success" label="فعال" /> : <Chip size="small" label="غیرفعال" />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {(products.data?.totalPages ?? 0) > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={products.data!.totalPages} page={page + 1} onChange={(_, p) => setPage(p - 1)} />
        </Box>
      )}
    </Box>
  )
}
