import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, TextField } from '@mui/material'
import { useEffect, useState } from 'react'
import { errorMessage, fieldErrors } from '../api/client'
import { accountApi } from '../api/endpoints'
import type { Address } from '../api/types'
import { useNotify } from '../context/NotifyContext'
import { toLatinDigits } from '../lib/format'

const EMPTY: Address = {
  title: '',
  receiverName: '',
  receiverPhone: '',
  province: '',
  city: '',
  postalCode: '',
  addressLine: '',
}

interface Props {
  open: boolean
  address?: Address | null
  onClose: () => void
  onSaved: (address: Address) => void
}

const FIELDS: { name: keyof Address; label: string; size: number; multiline?: boolean; inputMode?: 'numeric' | 'tel' }[] = [
  { name: 'title', label: 'عنوان (مثلاً خانه)', size: 6 },
  { name: 'receiverName', label: 'نام و نام خانوادگی گیرنده', size: 6 },
  { name: 'receiverPhone', label: 'موبایل گیرنده', size: 6, inputMode: 'tel' },
  { name: 'postalCode', label: 'کد پستی ۱۰ رقمی', size: 6, inputMode: 'numeric' },
  { name: 'province', label: 'استان', size: 6 },
  { name: 'city', label: 'شهر', size: 6 },
  { name: 'addressLine', label: 'نشانی کامل', size: 12, multiline: true },
]

export default function AddressDialog({ open, address, onClose, onSaved }: Props) {
  const notify = useNotify()
  const [form, setForm] = useState<Address>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(address ?? EMPTY)
      setErrors({})
    }
  }, [open, address])

  const save = async () => {
    setSaving(true)
    const payload: Address = {
      ...form,
      receiverPhone: toLatinDigits(form.receiverPhone.trim()),
      postalCode: toLatinDigits(form.postalCode.trim()),
    }
    try {
      const saved = address?.id ? await accountApi.updateAddress(address.id, payload) : await accountApi.addAddress(payload)
      notify('آدرس ذخیره شد')
      onSaved(saved)
    } catch (e) {
      setErrors(fieldErrors(e))
      notify(errorMessage(e), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{address?.id ? 'ویرایش آدرس' : 'افزودن آدرس جدید'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          {FIELDS.map((f) => (
            <Grid key={f.name} size={{ xs: 12, sm: f.size }}>
              <TextField
                label={f.label}
                name={f.name}
                value={form[f.name] ?? ''}
                onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                error={!!errors[f.name]}
                helperText={errors[f.name]}
                multiline={f.multiline}
                minRows={f.multiline ? 2 : undefined}
                slotProps={{ htmlInput: { inputMode: f.inputMode } }}
              />
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>انصراف</Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          ذخیره آدرس
        </Button>
      </DialogActions>
    </Dialog>
  )
}
