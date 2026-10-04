import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  Box,
  Button,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { errorMessage, fieldErrors } from '../../api/client'
import { adminApi, catalogApi } from '../../api/endpoints'
import type { ProductDetail, ProductInput } from '../../api/types'
import EmptyState from '../../components/EmptyState'
import PageLoader from '../../components/PageLoader'
import { useNotify } from '../../context/NotifyContext'
import { PET_TYPES, toLatinDigits } from '../../lib/format'

const EMPTY: ProductInput = {
  name: '',
  description: '',
  brand: '',
  petType: 'DOG',
  categoryId: 0,
  price: 0,
  discountPrice: null,
  stock: 0,
  active: true,
}

const digitsOnly = (v: string) => toLatinDigits(v).replace(/\D/g, '')

export default function ProductEditPage() {
  const params = useParams()
  const isNew = params.id === 'new'
  const id = isNew ? null : Number(params.id)
  const navigate = useNavigate()
  const notify = useNotify()
  const queryClient = useQueryClient()
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories })
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [form, setForm] = useState<ProductInput>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    // The page is reused when the route switches between products: never show the previous product's data.
    setProduct(null)
    setForm(EMPTY)
    setErrors({})
    setLoadError('')
    if (id === null) return
    adminApi.product(id).then((p) => {
      setProduct(p)
      setForm({
        name: p.name,
        description: p.description ?? '',
        brand: p.brand ?? '',
        petType: p.petType,
        categoryId: p.categoryId,
        price: p.price,
        discountPrice: p.discountPrice,
        stock: p.stock,
        active: p.active,
      })
    }).catch((e) => setLoadError(errorMessage(e)))
  }, [id])

  useEffect(() => {
    if (isNew && !form.categoryId && categories.data?.length) setForm((f) => ({ ...f, categoryId: categories.data[0].id }))
  }, [isNew, categories.data, form.categoryId])

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => setForm((f) => ({ ...f, [key]: value }))

  const save = async () => {
    setBusy(true)
    setErrors({})
    try {
      const saved = id === null ? await adminApi.createProduct(form) : await adminApi.updateProduct(id, form)
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', saved.id] })
      notify('محصول ذخیره شد')
      if (id === null) navigate(`/admin/products/${saved.id}`, { replace: true })
      else setProduct(saved)
    } catch (e) {
      setErrors(fieldErrors(e))
      notify(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (id === null || !window.confirm('این محصول حذف شود؟')) return
    try {
      await adminApi.deleteProduct(id)
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      notify('محصول حذف شد')
      navigate('/admin/products')
    } catch (e) {
      notify(errorMessage(e), 'error')
    }
  }

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (id === null || files.length === 0) return
    setBusy(true)
    try {
      setProduct(await adminApi.uploadImages(id, files))
      queryClient.invalidateQueries({ queryKey: ['product', id] })
      notify('تصاویر بارگذاری شد')
    } catch (err) {
      notify(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  const removeImage = async (imageId: number) => {
    if (id === null || !window.confirm('این تصویر حذف شود؟')) return
    try {
      setProduct(await adminApi.deleteImage(id, imageId))
    } catch (e) {
      notify(errorMessage(e), 'error')
    }
  }

  if (loadError) {
    return <EmptyState emoji="📦" title={loadError} action={<Button variant="contained" onClick={() => navigate('/admin/products')}>بازگشت به محصولات</Button>} />
  }
  if (!isNew && !product) return <PageLoader />

  return (
    <Box>
      <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
        {isNew ? 'افزودن محصول' : 'ویرایش محصول'}
      </Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField label="نام محصول" name="name" value={form.name} onChange={(e) => set('name', e.target.value)} error={!!errors.name} helperText={errors.name} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField label="برند" name="brand" value={form.brand} onChange={(e) => set('brand', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField select label="نوع حیوان" value={form.petType} onChange={(e) => set('petType', e.target.value as ProductInput['petType'])}>
              {PET_TYPES.map((p) => <MenuItem key={p.value} value={p.value}>{p.emoji} {p.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField select label="دسته‌بندی" value={form.categoryId || ''} onChange={(e) => set('categoryId', Number(e.target.value))} error={!!errors.categoryId}>
              {categories.data?.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField label="قیمت (تومان)" name="price" value={form.price || ''} onChange={(e) => set('price', Number(digitsOnly(e.target.value)))} error={!!errors.price} helperText={errors.price} slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="قیمت با تخفیف (اختیاری)"
              name="discountPrice"
              value={form.discountPrice ?? ''}
              onChange={(e) => {
                const v = digitsOnly(e.target.value)
                set('discountPrice', v ? Number(v) : null)
              }}
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField label="موجودی" name="stock" value={String(form.stock)} onChange={(e) => set('stock', Number(digitsOnly(e.target.value)))} slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
          </Grid>
          <Grid size={12}>
            <TextField label="توضیحات" multiline minRows={4} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Grid>
          <Grid size={12}>
            <FormControlLabel control={<Switch checked={form.active} onChange={(e) => set('active', e.target.checked)} />} label="نمایش در فروشگاه" />
          </Grid>
        </Grid>
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button variant="contained" onClick={save} disabled={busy}>ذخیره</Button>
          <Button onClick={() => navigate('/admin/products')}>بازگشت</Button>
          {!isNew && <Button color="error" onClick={remove} sx={{ mr: 'auto' }}>حذف محصول</Button>}
        </Box>
      </Paper>

      {product && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography sx={{ fontWeight: 700 }}>تصاویر محصول</Typography>
            <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} disabled={busy}>
              بارگذاری تصویر
              <input hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={upload} data-testid="image-input" />
            </Button>
          </Box>
          {product.images.length === 0 && <Typography color="text.secondary" variant="body2">هنوز تصویری بارگذاری نشده است (حداکثر ۸ تصویر، هر کدام تا ۵ مگابایت).</Typography>}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {product.images.map((img) => (
              <Box key={img.id} sx={{ position: 'relative', border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                <Box component="img" src={img.url} alt="" sx={{ width: 120, height: 120, objectFit: 'cover', display: 'block' }} />
                <IconButton size="small" onClick={() => removeImage(img.id)} aria-label="حذف تصویر" sx={{ position: 'absolute', top: 4, left: 4, bgcolor: 'rgba(255,255,255,.9)' }}>
                  <DeleteIcon fontSize="small" color="error" />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  )
}
