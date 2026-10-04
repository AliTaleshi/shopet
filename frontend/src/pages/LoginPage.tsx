import { Alert, Box, Button, Link, Paper, TextField, Typography } from '@mui/material'
import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { accountApi, authApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useNotify } from '../context/NotifyContext'
import { formatNumber, isValidMobile, toLatinDigits, toPersianDigits } from '../lib/format'

type Step = 'phone' | 'code' | 'name'

export default function LoginPage() {
  const auth = useAuth()
  const cart = useCart()
  const notify = useNotify()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  // Only the first step redirects: during verification the user gets set before we finish (cart merge, name).
  if (auth.user && step === 'phone') return <Navigate to={from} replace />

  const requestCode = async (e?: FormEvent) => {
    e?.preventDefault()
    setError('')
    if (!isValidMobile(phone)) {
      setError('شماره موبایل را به‌صورت ۰۹xxxxxxxxx وارد کنید.')
      return
    }
    setBusy(true)
    try {
      const res = await authApi.requestOtp(toLatinDigits(phone.trim()))
      setDevCode(res.devCode)
      setResendIn(res.resendInSeconds)
      setCode('')
      setStep('code')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const verify = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await authApi.verifyOtp(toLatinDigits(phone.trim()), toLatinDigits(code.trim()))
      auth.login(res.token, res.user)
      await cart.mergeGuestCart()
      if (res.newUser) {
        setStep('name')
      } else {
        notify('خوش آمدید!')
        navigate(from, { replace: true })
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const saveName = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (fullName.trim()) auth.setUser(await accountApi.updateProfile(fullName.trim()))
      notify('به شاپت خوش آمدید!')
      navigate(from, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 2, md: 6 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 }, width: '100%', maxWidth: 420 }}>
        <Typography variant="h5" component="h1" sx={{ mb: 1, textAlign: 'center' }}>
          {step === 'name' ? 'تکمیل اطلاعات' : 'ورود | ثبت‌نام'}
        </Typography>
        {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

        {step === 'phone' && (
          <Box component="form" onSubmit={requestCode} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Typography color="text.secondary">لطفاً شماره موبایل خود را وارد کنید.</Typography>
            <TextField
              label="شماره موبایل"
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
              slotProps={{ htmlInput: { inputMode: 'tel', dir: 'ltr', maxLength: 16 } }}
            />
            <Button type="submit" variant="contained" size="large" disabled={busy}>
              دریافت کد تأیید
            </Button>
          </Box>
        )}

        {step === 'code' && (
          <Box component="form" onSubmit={verify} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Typography color="text.secondary">
              کد ۵ رقمی ارسال‌شده به {toPersianDigits(toLatinDigits(phone))} را وارد کنید.{' '}
              <Link component="button" type="button" onClick={() => setStep('phone')}>
                تغییر شماره
              </Link>
            </Typography>
            {devCode && (
              <Alert severity="info" data-testid="dev-code">
                حالت نمایشی: کد تأیید شما <b dir="ltr">{devCode}</b> است.
              </Alert>
            )}
            <TextField
              label="کد تأیید"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              slotProps={{ htmlInput: { inputMode: 'numeric', dir: 'ltr', maxLength: 5, style: { textAlign: 'center', letterSpacing: 8, fontSize: 22 } } }}
            />
            <Button type="submit" variant="contained" size="large" disabled={busy || toLatinDigits(code).length !== 5}>
              ورود
            </Button>
            <Button onClick={() => requestCode()} disabled={busy || resendIn > 0}>
              {resendIn > 0 ? `ارسال مجدد کد تا ${formatNumber(resendIn)} ثانیه دیگر` : 'ارسال مجدد کد'}
            </Button>
          </Box>
        )}

        {step === 'name' && (
          <Box component="form" onSubmit={saveName} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Typography color="text.secondary">حساب شما ساخته شد. نام خود را وارد کنید.</Typography>
            <TextField label="نام و نام خانوادگی" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
            <Button type="submit" variant="contained" size="large" disabled={busy}>
              ذخیره و ادامه
            </Button>
            <Button onClick={() => navigate(from, { replace: true })}>بعداً</Button>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
