import { Box, Button, Paper, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { errorMessage } from '../../api/client'
import { accountApi } from '../../api/endpoints'
import { useAuth } from '../../context/AuthContext'
import { useNotify } from '../../context/NotifyContext'
import { formatDate, toPersianDigits } from '../../lib/format'

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const notify = useNotify()
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setFullName(user?.fullName ?? '')
  }, [user])
  if (!user) return null

  const save = async () => {
    setSaving(true)
    try {
      setUser(await accountApi.updateProfile(fullName))
      notify('اطلاعات حساب ذخیره شد')
    } catch (e) {
      notify(errorMessage(e), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 520 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField label="شماره موبایل" value={toPersianDigits(user.phone)} disabled />
        <TextField label="نام و نام خانوادگی" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Typography variant="body2" color="text.secondary">
          عضویت از {formatDate(user.createdAt)}
        </Typography>
        <Button variant="contained" onClick={save} disabled={saving || !fullName.trim()} sx={{ alignSelf: 'flex-start' }}>
          ذخیره تغییرات
        </Button>
      </Box>
    </Paper>
  )
}
