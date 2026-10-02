import { Button } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import EmptyState from '../components/EmptyState'

export default function NotFoundPage() {
  return (
    <EmptyState
      emoji="🐕‍🦺"
      title="صفحه‌ای که دنبالش بودید پیدا نشد."
      action={<Button variant="contained" component={RouterLink} to="/">بازگشت به صفحه اصلی</Button>}
    />
  )
}
