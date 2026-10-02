import AddIcon from '@mui/icons-material/Add'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { errorMessage, fieldErrors } from '../../api/client'
import { adminApi, catalogApi } from '../../api/endpoints'
import type { Category, CategoryInput } from '../../api/types'
import { useNotify } from '../../context/NotifyContext'
import { formatNumber, toLatinDigits } from '../../lib/format'

const EMPTY: CategoryInput = { name: '', slug: '', description: '', sortOrder: 0 }

export default function CategoriesAdminPage() {
  const notify = useNotify()
  const queryClient = useQueryClient()
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories })
  const [editing, setEditing] = useState<Category | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CategoryInput>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const openDialog = (c: Category | null) => {
    setEditing(c)
    setForm(c ? { name: c.name, slug: c.slug, description: c.description ?? '', sortOrder: c.sortOrder } : EMPTY)
    setErrors({})
    setOpen(true)
  }

  const save = async () => {
    try {
      if (editing) await adminApi.updateCategory(editing.id, form)
      else await adminApi.createCategory(form)
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      notify('دسته‌بندی ذخیره شد')
      setOpen(false)
    } catch (e) {
      setErrors(fieldErrors(e))
      notify(errorMessage(e), 'error')
    }
  }

  const remove = async (c: Category) => {
    if (!window.confirm(`دسته‌بندی «${c.name}» حذف شود؟`)) return
    try {
      await adminApi.deleteCategory(c.id)
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      notify('دسته‌بندی حذف شد')
    } catch (e) {
      notify(errorMessage(e), 'error')
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', mb: 2, alignItems: 'center' }}>
        <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>دسته‌بندی‌ها</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog(null)}>دسته‌بندی جدید</Button>
      </Box>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>ترتیب</TableCell><TableCell>نام</TableCell><TableCell>نامک</TableCell><TableCell /></TableRow>
          </TableHead>
          <TableBody>
            {categories.data?.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{formatNumber(c.sortOrder)}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell dir="ltr">{c.slug}</TableCell>
                <TableCell align="left">
                  <Button size="small" onClick={() => openDialog(c)}>ویرایش</Button>
                  <Button size="small" color="error" onClick={() => remove(c)}>حذف</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editing ? 'ویرایش دسته‌بندی' : 'دسته‌بندی جدید'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField label="نام" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={!!errors.name} helperText={errors.name} />
          <TextField label="نامک (انگلیسی، برای آدرس)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} error={!!errors.slug} helperText={errors.slug} slotProps={{ htmlInput: { dir: 'ltr' } }} />
          <TextField label="توضیحات" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <TextField label="ترتیب نمایش" value={String(form.sortOrder)} onChange={(e) => setForm({ ...form, sortOrder: Number(toLatinDigits(e.target.value).replace(/\D/g, '')) })} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={save}>ذخیره</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
