import { Button } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

interface BackButtonProps {
  onClick: () => void
  label?: string
}

export default function BackButton({ onClick, label = 'Back' }: BackButtonProps) {
  return (
    <Button startIcon={<ArrowBackIcon />} onClick={onClick} sx={{ mb: 2 }} color="inherit">
      {label}
    </Button>
  )
}
