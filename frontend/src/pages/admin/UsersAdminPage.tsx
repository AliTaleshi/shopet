import { Box, Chip, Pagination, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { adminApi } from '../../api/endpoints'
import { formatDate, toLatinDigits, toPersianDigits } from '../../lib/format'

export default function UsersAdminPage() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const users = useQuery({
    queryKey: ['admin', 'users', q, page],
    queryFn: () => adminApi.users(toLatinDigits(q.trim()), page),
    placeholderData: keepPreviousData,
  })
  return (
    <Box>
      <Box sx={{ display: 'flex', mb: 2, alignItems: 'center', gap: 2 }}>
        <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>کاربران</Typography>
        <TextField size="small" placeholder="جستجوی موبایل یا نام" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} sx={{ width: 240 }} />
      </Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>موبایل</TableCell><TableCell>نام</TableCell><TableCell>نقش</TableCell><TableCell>تاریخ عضویت</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {users.data?.content.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{toPersianDigits(u.phone)}</TableCell>
                <TableCell>{u.fullName ?? '—'}</TableCell>
                <TableCell>{u.role === 'ADMIN' ? <Chip size="small" color="primary" label="مدیر" /> : 'مشتری'}</TableCell>
                <TableCell>{formatDate(u.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {(users.data?.totalPages ?? 0) > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={users.data!.totalPages} page={page + 1} onChange={(_, p) => setPage(p - 1)} />
        </Box>
      )}
    </Box>
  )
}
