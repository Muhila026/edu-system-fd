import React, { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material'
import { CloudUpload } from '@mui/icons-material'
import {
  submitPaymentRequest,
  getInventoryItems,
  getAfterSchoolClasses,
  type TransactionType,
  type InventoryItemOption,
  type AfterSchoolClass,
} from '../lib/api'
import CenteredMessage from './CenteredMessage'

type FeeOption = { id: string; title: string; amount: number; paidAmount: number }

interface SubmitPaymentDialogProps {
  open: boolean
  onClose: () => void
  /** When set, submitting on behalf of a child (parent flow); omitted for a student's own submission. */
  studentId?: string
  /** Outstanding fee records for the relevant student (self or child), pre-fetched by the caller. */
  feeOptions: FeeOption[]
  onSubmitted: () => void
}

const SubmitPaymentDialog: React.FC<SubmitPaymentDialogProps> = ({ open, onClose, studentId, feeOptions, onSubmitted }) => {
  const [type, setType] = useState<TransactionType>('Fee')
  const [referenceId, setReferenceId] = useState('')
  const [amount, setAmount] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [note, setNote] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successOpen, setSuccessOpen] = useState(false)

  const [items, setItems] = useState<InventoryItemOption[]>([])
  const [classes, setClasses] = useState<AfterSchoolClass[]>([])

  useEffect(() => {
    if (!open) return
    getInventoryItems().then(setItems)
    getAfterSchoolClasses().then(setClasses)
  }, [open])

  useEffect(() => {
    if (!open) return
    setType('Fee')
    setReferenceId('')
    setAmount('')
    setQuantity('1')
    setReceiptNumber('')
    setNote('')
    setProofFile(null)
    setError('')
  }, [open])

  const outstandingFees = feeOptions.filter((f) => f.amount > f.paidAmount)

  const handleReferenceChange = (id: string) => {
    setReferenceId(id)
    if (type === 'Fee') {
      const fee = outstandingFees.find((f) => f.id === id)
      if (fee) setAmount(String(fee.amount - fee.paidAmount))
    } else if (type === 'Item') {
      const item = items.find((i) => i.id === id)
      if (item) setAmount(String(item.price * (Number(quantity) || 1)))
    } else if (type === 'After-School Class') {
      const cls = classes.find((c) => c.id === id)
      if (cls) setAmount(String(cls.admissionFee))
    }
  }

  const handleSubmit = async () => {
    if (!referenceId || !amount || Number(amount) <= 0 || !proofFile) {
      setError('Pick what you paid for, enter the amount, and attach a proof image.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await submitPaymentRequest({
        studentId,
        type,
        referenceId,
        amount: Number(amount),
        quantity: type === 'Item' ? Number(quantity) || 1 : undefined,
        receiptNumber: receiptNumber.trim() || undefined,
        note: note.trim() || undefined,
        proofImage: proofFile,
      })
      onSubmitted()
      onClose()
      setSuccessOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit payment request')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Submit Payment Proof</DialogTitle>
      <DialogContent>
        <Box display="grid" gap={2.5} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Paid via bank/online transfer? Upload your receipt here — an admin will review and confirm it.
          </Typography>

          <FormControl fullWidth>
            <InputLabel>Paying for</InputLabel>
            <Select
              value={type}
              label="Paying for"
              onChange={(e) => {
                setType(e.target.value as TransactionType)
                setReferenceId('')
                setAmount('')
              }}
            >
              <MenuItem value="Fee">School Fee</MenuItem>
              <MenuItem value="Item">Item Purchase</MenuItem>
              <MenuItem value="After-School Class">After-School Class</MenuItem>
            </Select>
          </FormControl>

          {type === 'Fee' && (
            <FormControl fullWidth>
              <InputLabel>Fee</InputLabel>
              <Select value={referenceId} label="Fee" onChange={(e) => handleReferenceChange(e.target.value)}>
                {outstandingFees.length === 0 && <MenuItem value="" disabled>No outstanding fees</MenuItem>}
                {outstandingFees.map((f) => (
                  <MenuItem key={f.id} value={f.id}>
                    {f.title} (Rs. {(f.amount - f.paidAmount).toLocaleString()} remaining)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {type === 'Item' && (
            <>
              <FormControl fullWidth>
                <InputLabel>Item</InputLabel>
                <Select value={referenceId} label="Item" onChange={(e) => handleReferenceChange(e.target.value)}>
                  {items.map((i) => (
                    <MenuItem key={i.id} value={i.id}>
                      {i.name} (Rs. {i.price.toLocaleString()} each)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                type="number"
                label="Quantity"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value)
                  const item = items.find((i) => i.id === referenceId)
                  if (item) setAmount(String(item.price * (Number(e.target.value) || 1)))
                }}
              />
            </>
          )}

          {type === 'After-School Class' && (
            <FormControl fullWidth>
              <InputLabel>Class</InputLabel>
              <Select value={referenceId} label="Class" onChange={(e) => handleReferenceChange(e.target.value)}>
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name} (Rs. {c.admissionFee.toLocaleString()} admission)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            fullWidth
            type="number"
            label="Amount paid (Rs.)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <TextField
            fullWidth
            label="Bank/transfer receipt number (optional)"
            value={receiptNumber}
            onChange={(e) => setReceiptNumber(e.target.value)}
          />
          <TextField
            fullWidth
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            multiline
            rows={2}
          />

          <Button
            component="label"
            variant="outlined"
            startIcon={<CloudUpload />}
            sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
          >
            {proofFile ? proofFile.name : 'Attach receipt image'}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            />
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
        <Button variant="contained" disabled={saving} onClick={handleSubmit} sx={{ textTransform: 'none' }}>
          {saving ? 'Submitting...' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>

    <CenteredMessage
      open={successOpen}
      message="Payment proof submitted. An admin will review and confirm it."
      severity="success"
      onClose={() => setSuccessOpen(false)}
      autoHideDuration={4000}
    />
    </>
  )
}

export default SubmitPaymentDialog
