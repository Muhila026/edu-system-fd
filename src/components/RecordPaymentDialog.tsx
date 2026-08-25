import React, { useEffect, useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, TextField, Button } from '@mui/material'
import { CloudUpload } from '@mui/icons-material'
import { recordFeePayment, type FeeRecord } from '../lib/api'

interface RecordPaymentDialogProps {
  open: boolean
  record: FeeRecord | null
  onClose: () => void
  /** Called after a successful save so the caller can refresh its fee records list. */
  onSaved: () => void
}

/** Shared by the Fees "who's paid" list and the Payments "search student" flow — the single
 *  place a payment against a fee record gets recorded, with an optional receipt/proof image. */
const RecordPaymentDialog: React.FC<RecordPaymentDialogProps> = ({ open, record, onClose, onSaved }) => {
  const [amount, setAmount] = useState('')
  const [proof, setProof] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && record) {
      setAmount(String(record.amount - record.paidAmount))
      setProof(null)
      setError('')
    }
  }, [open, record])

  const handleSave = async () => {
    if (!record) return
    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      setError('Enter a valid amount')
      return
    }
    setSaving(true)
    setError('')
    try {
      await recordFeePayment(record.id, record.paidAmount + numAmount, undefined, proof || undefined)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Record Payment</DialogTitle>
      <DialogContent>
        <Box display="grid" gap={2.5} sx={{ mt: 1 }}>
          {record && (
            <Typography variant="body2" color="text.secondary">
              {record.studentName} — {record.title} (Rs. {(record.amount - record.paidAmount).toLocaleString()} remaining)
            </Typography>
          )}
          <TextField fullWidth label="Amount to record (Rs.)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button
            component="label"
            variant="outlined"
            startIcon={<CloudUpload />}
            sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
          >
            {proof ? proof.name : 'Attach receipt/proof — image or PDF (optional)'}
            <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
          </Button>
          {error && (
            <Typography variant="body2" sx={{ color: '#991b1b' }}>
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" disabled={saving} onClick={handleSave} sx={{ textTransform: 'none' }}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RecordPaymentDialog
