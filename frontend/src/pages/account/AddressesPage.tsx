import AddIcon from '@mui/icons-material/Add'
import { Box, Button, Card, CardActions, CardContent, Grid, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { errorMessage } from '../../api/client'
import { accountApi } from '../../api/endpoints'
import type { Address } from '../../api/types'
import AddressDialog from '../../components/AddressDialog'
import EmptyState from '../../components/EmptyState'
import PageLoader from '../../components/PageLoader'
import { useNotify } from '../../context/NotifyContext'
import { toPersianDigits } from '../../lib/format'

export default function AddressesPage() {
  const notify = useNotify()
  const queryClient = useQueryClient()
  const addresses = useQuery({ queryKey: ['addresses'], queryFn: accountApi.addresses })
  const [editing, setEditing] = useState<Address | null>(null)
  const [open, setOpen] = useState(false)
  const remove = useMutation({
    mutationFn: (id: number) => accountApi.deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      notify('آدرس حذف شد')
    },
    onError: (e) => notify(errorMessage(e), 'error'),
  })

  if (addresses.isLoading) return <PageLoader />
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setOpen(true) }}>
          افزودن آدرس
        </Button>
      </Box>
      {addresses.data?.length === 0 && <EmptyState emoji="📍" title="هنوز آدرسی ثبت نکرده‌اید." />}
      <Grid container spacing={2}>
        {addresses.data?.map((a) => (
          <Grid key={a.id} size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography sx={{ fontWeight: 700 }}>{a.title}</Typography>
                <Typography variant="body2">{a.province}، {a.city}، {a.addressLine}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {a.receiverName} · {toPersianDigits(a.receiverPhone)} · کد پستی {toPersianDigits(a.postalCode)}
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => { setEditing(a); setOpen(true) }}>ویرایش</Button>
                <Button size="small" color="error" onClick={() => remove.mutate(a.id!)}>حذف</Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      <AddressDialog
        open={open}
        address={editing}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false)
          queryClient.invalidateQueries({ queryKey: ['addresses'] })
        }}
      />
    </Box>
  )
}
