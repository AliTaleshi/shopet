import { Box } from '@mui/material'
import type { PetType } from '../api/types'
import { petTypeEmoji } from '../lib/format'

const BACKGROUNDS: Record<PetType, string> = {
  DOG: 'linear-gradient(135deg, #fde68a, #fdba74)',
  CAT: 'linear-gradient(135deg, #fbcfe8, #c4b5fd)',
  BIRD: 'linear-gradient(135deg, #bbf7d0, #67e8f9)',
  FISH: 'linear-gradient(135deg, #bae6fd, #93c5fd)',
  SMALL_PET: 'linear-gradient(135deg, #fed7aa, #fecaca)',
  REPTILE: 'linear-gradient(135deg, #d9f99d, #86efac)',
}

interface Props {
  src: string | null | undefined
  alt: string
  petType: PetType
  height?: number | string
  /** `cover` fills the box (cards, thumbnails); `contain` shows the whole photo (product gallery). */
  fit?: 'cover' | 'contain'
}

/** Product photo, or a colourful pet-themed placeholder when the product has no image. */
export default function ProductImage({ src, alt, petType, height = 200, fit = 'cover' }: Props) {
  if (src) {
    return (
      <Box
        component="img"
        src={src}
        alt={alt}
        loading="lazy"
        sx={{ width: '100%', height, objectFit: fit, bgcolor: '#fff', display: 'block' }}
      />
    )
  }
  return (
    <Box
      role="img"
      aria-label={alt}
      sx={{
        width: '100%',
        height,
        background: BACKGROUNDS[petType],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: typeof height === 'number' ? Math.round(height * 0.38) : 72,
        userSelect: 'none',
      }}
    >
      {petTypeEmoji(petType)}
    </Box>
  )
}
