import AddIcon from '@mui/icons-material/Add'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { errorMessage, fieldErrors } from '../../api/client'
import { adminApi } from '../../api/endpoints'
import type { Coupon, CouponInput } from '../../api/types'
import { useNotify } from '../../context/NotifyContext'
import { formatDate, formatNumber, formatToman, toLatinDigits } from '../../lib/format'

const EMPTY: CouponInput = { code: '', type: 'PERCENT', value: 10, minOrderAmount: 0, maxDiscount: null, usageLimit: null, expiresAt: null, active: true }
const digits = (v: string) => toLatinDigits(v).replace(/\D/g, '')
const optionalNumber = (v: string) => (digits(v) ? Number(digits(v)) : null)

export default function CouponsAdminPage() {
  const notify = useNotify()
  const queryClient = useQueryClient()
  const coupons = useQuery({ queryKey: ['admin', 'coupons'], queryFn: adminApi.coupons })
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CouponInput>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const openDialog = (c: Coupon | null) => {
    setEditing(c)
    setForm(c ? { ...c } : EMPTY)
    setErrors({})
    setOpen(true)
  }

  const save = async () => {
    try {
      if (editing) await adminApi.updateCoupon(editing.id, form)
      else await adminApi.createCoupon(form)
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] })
      notify('کد تخفیف ذخیره شد')
      setOpen(false)
    } catch (e) {
      setErrors(fieldErrors(e))
      notify(errorMessage(e), 'error')
    }
  }

  const remove = async (c: Coupon) => {
    if (!window.confirm(`کد ${c.code} حذف شود؟`)) return
    try {
      await adminApi.deleteCoupon(c.id)
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] })
    } catch (e) {
      notify(errorMessage(e), 'error')
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', mb: 2, alignItems: 'center' }}>
        <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>کدهای تخفیف</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog(null)}>کد جدید</Button>
      </Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>کد</TableCell><TableCell>تخفیف</TableCell><TableCell>حداقل خرید</TableCell><TableCell>استفاده</TableCell><TableCell>انقضا</TableCell><TableCell>وضعیت</TableCell><TableCell /></TableRow>
          </TableHead>
          <TableBody>
            {coupons.data?.map((c) => (
              <TableRow key={c.id}>
                <TableCell dir="ltr" sx={{ fontWeight: 700 }}>{c.code}</TableCell>
                <TableCell>
                  {c.type === 'PERCENT' ? `${formatNumber(c.value)}٪` : formatToman(c.value)}
                  {c.maxDiscount && ` (سقف ${formatToman(c.maxDiscount)})`}
                </TableCell>
                <TableCell>{c.minOrderAmount ? formatToman(c.minOrderAmount) : '—'}</TableCell>
                <TableCell>{formatNumber(c.usedCount)}{c.usageLimit ? ` از ${formatNumber(c.usageLimit)}` : ''}</TableCell>
                <TableCell>{c.expiresAt ? formatDate(c.expiresAt) : '—'}</TableCell>
                <TableCell>{c.active ? <Chip size="small" color="success" label="فعال" /> : <Chip size="small" label="غیرفعال" />}</TableCell>
                <TableCell align="left" sx={{ whiteSpace: 'nowrap' }}>
                  <Button size="small" onClick={() => openDialog(c)}>ویرایش</Button>
                  <Button size="small" color="error" onClick={() => remove(c)}>حذف</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editing ? 'ویرایش کد تخفیف' : 'کد تخفیف جدید'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField label="کد" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} error={!!errors.code} helperText={errors.code} slotProps={{ htmlInput: { dir: 'ltr' } }} />
          <TextField select label="نوع" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CouponInput['type'] })}>
            <MenuItem value="PERCENT">درصدی</MenuItem>
            <MenuItem value="FIXED">مبلغ ثابت (تومان)</MenuItem>
          </TextField>
          <TextField label={form.type === 'PERCENT' ? 'درصد تخفیف' : 'مبلغ تخفیف (تومان)'} value={String(form.value)} onChange={(e) => setForm({ ...form, value: Number(digits(e.target.value)) })} error={!!errors.value} helperText={errors.value} />
          {form.type === 'PERCENT' && (
            <TextField label="سقف تخفیف (تومان، اختیاری)" value={form.maxDiscount ?? ''} onChange={(e) => setForm({ ...form, maxDiscount: optionalNumber(e.target.value) })} />
          )}
          <TextField label="حداقل مبلغ خرید (تومان)" value={String(form.minOrderAmount)} onChange={(e) => setForm({ ...form, minOrderAmount: Number(digits(e.target.value)) })} />
          <TextField label="سقف تعداد استفاده (اختیاری)" value={form.usageLimit ?? ''} onChange={(e) => setForm({ ...form, usageLimit: optionalNumber(e.target.value) })} />
          <TextField
            label="تاریخ انقضا (اختیاری)"
            type="date"
            value={form.expiresAt ? form.expiresAt.slice(0, 10) : ''}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : null })}
            slotProps={{ inputLabel: { shrink: true } }}
            helperText={form.expiresAt ? `تا پایان ${formatDate(form.expiresAt)}` : undefined}
          />
          <FormControlLabel control={<Switch checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />} label="فعال" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={save}>ذخیره</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
