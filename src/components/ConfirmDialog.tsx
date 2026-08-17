import React from 'react'
import {
  Dialog,
  DialogContent,
  Typography,
  Button,
  Box,
} from '@mui/material'
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined'

export interface ConfirmDialogProps {
  open: boolean
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** 'danger' for destructive actions (delete) — red confirm button. 'default' for a neutral confirm. */
  tone?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

/** Styled replacement for window.confirm() — same visual language as CenteredMessage,
 *  so every popup in the app (success/error/confirm) reads as one consistent design. */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const isDanger = tone === 'danger'
  const bgColor = isDanger ? '#fef2f2' : '#EFF6FF'
  const iconColor = isDanger ? '#dc2626' : '#1e3a8a'
  const buttonColor = isDanger ? '#dc2626' : '#1e3a8a'
  const buttonHover = isDanger ? '#b91c1c' : '#1e40af'

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      PaperProps={{
        sx: {
          borderRadius: 0,
          minWidth: 320,
          maxWidth: 480,
          mx: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          border: `1px solid ${isDanger ? '#fecaca' : '#DBEAFE'}`,
        },
      }}
      slotProps={{
        backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.4)' } },
      }}
      sx={{
        '& .MuiDialog-container': {
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}
    >
      <DialogContent
        sx={{
          pt: 4,
          pb: 3,
          px: 4,
          textAlign: 'center',
          backgroundColor: bgColor,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <WarningAmberOutlined sx={{ fontSize: 56, color: iconColor }} />
        </Box>
        {title && (
          <Typography
            variant="h6"
            component="p"
            sx={{ fontWeight: 700, color: '#1f2937', fontSize: '1.15rem', mb: 0.5 }}
          >
            {title}
          </Typography>
        )}
        <Typography
          variant="body1"
          component="p"
          sx={{ fontWeight: 500, color: '#374151', fontSize: '0.95rem', lineHeight: 1.5 }}
        >
          {message}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={loading}
            fullWidth
            sx={{
              py: 1.5,
              borderRadius: 1,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              borderColor: '#d1d5db',
              color: '#374151',
              '&:hover': { borderColor: '#9ca3af', backgroundColor: '#f9fafb' },
            }}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="contained"
            onClick={onConfirm}
            disabled={loading}
            fullWidth
            sx={{
              py: 1.5,
              borderRadius: 1,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              backgroundColor: buttonColor,
              '&:hover': { backgroundColor: buttonHover },
            }}
          >
            {loading ? 'Working...' : confirmLabel}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmDialog
