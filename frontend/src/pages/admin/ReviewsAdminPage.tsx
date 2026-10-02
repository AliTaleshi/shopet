import { Box, Button, Link, Pagination, Paper, Rating, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { errorMessage } from '../../api/client'
import { adminApi } from '../../api/endpoints'
import { useNotify } from '../../context/NotifyContext'
import { formatDate, toPersianDigits } from '../../lib/format'

export default function ReviewsAdminPage() {
  const notify = useNotify()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const reviews = useQuery({ queryKey: ['admin', 'reviews', page], queryFn: () => adminApi.reviews(page), placeholderData: keepPreviousData })

  const remove = async (id: number) => {
    if (!window.confirm('این نظر حذف شود؟')) return
    try {
      await adminApi.deleteReview(id)
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] })
      notify('نظر حذف شد')
    } catch (e) {
      notify(errorMessage(e), 'error')
    }
  }

  return (
    <Box>
      <Typography variant="h5" component="h1" sx={{ mb: 2 }}>نظرات کاربران</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>محصول</TableCell><TableCell>کاربر</TableCell><TableCell>امتیاز</TableCell><TableCell>متن</TableCell><TableCell>تاریخ</TableCell><TableCell /></TableRow>
          </TableHead>
          <TableBody>
            {reviews.data?.content.length === 0 && (
              <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', color: 'text.secondary' }}>نظری ثبت نشده است.</TableCell></TableRow>
            )}
            {reviews.data?.content.map((r) => (
              <TableRow key={r.id}>
                <TableCell><Link component={RouterLink} to={`/products/${r.productId}`}>#{toPersianDigits(r.productId)}</Link></TableCell>
                <TableCell>{r.authorName}</TableCell>
                <TableCell><Rating value={r.rating} readOnly size="small" /></TableCell>
                <TableCell sx={{ maxWidth: 280 }}>{r.comment ?? '—'}</TableCell>
                <TableCell>{formatDate(r.createdAt)}</TableCell>
                <TableCell><Button size="small" color="error" onClick={() => remove(r.id)}>حذف</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {(reviews.data?.totalPages ?? 0) > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={reviews.data!.totalPages} page={page + 1} onChange={(_, p) => setPage(p - 1)} />
        </Box>
      )}
    </Box>
  )
}
