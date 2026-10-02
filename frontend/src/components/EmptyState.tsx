import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'

export default function EmptyState({ emoji = '🐾', title, action }: { emoji?: string; title: string; action?: ReactNode }) {
  return (
    <Box sx={{ textAlign: 'center', py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <Box sx={{ fontSize: 64 }}>{emoji}</Box>
      <Typography variant="h6" color="text.secondary">
        {title}
      </Typography>
      {action}
    </Box>
  )
}
