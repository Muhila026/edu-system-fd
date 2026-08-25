import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  FormControlLabel,
  Switch,
  OutlinedInput,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import { Add, Delete, Payments as PaymentsIcon, CheckCircle, Inventory2, ExpandMore, Groups, Visibility } from '@mui/icons-material'
import CenteredMessage from '../../components/CenteredMessage'
import ConfirmDialog from '../../components/ConfirmDialog'
import BackButton from '../../components/BackButton'
import RecordPaymentDialog from '../../components/RecordPaymentDialog'
import {
  getFeeStructures,
  addFeeStructure,
  deleteFeeStructure,
  getFeeRecords,
  assignFeeToClass,
  getGrades,
  type FeeStructure,
  type FeeRecord,
  type FeeType,
  type AcademicGrade,
} from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const FEE_TYPES: FeeType[] = [
  'School Fee',
  'Admission Fee',
  'Term 1 Exam Fee',
  'Term 2 Exam Fee',
  'Term 3 Exam Fee',
  'Event/Activity Fee',
  'After-School Class Admission Fee',
]

const statusColor = (status: FeeRecord['status']) => {
  switch (status) {
    case 'Paid':
      return { bg: '#dcfce7', color: '#15803d' }
    case 'Partial':
      return { bg: '#fef3c7', color: '#92400e' }
    default:
      return { bg: '#fee2e2', color: '#991b1b' }
  }
}

const FeesManagement: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [structures, setStructures] = useState<FeeStructure[]>([])
  const [records, setRecords] = useState<FeeRecord[]>([])
  const [grades, setGrades] = useState<AcademicGrade[]>([])

  const [openAddStructure, setOpenAddStructure] = useState(false)
  const [newStructure, setNewStructure] = useState<{
    feeType: FeeType
    title: string
    description: string
    amount: string
    dueDateStart: string
    dueDateEnd: string
    gradeId: string
    isPackage: boolean
    packageItemIds: string[]
  }>({
    feeType: 'School Fee',
    title: '',
    description: '',
    amount: '',
    dueDateStart: '',
    dueDateEnd: '',
    gradeId: '',
    isPackage: false,
    packageItemIds: [],
  })

  const [openAssign, setOpenAssign] = useState(false)
  const [assignForm, setAssignForm] = useState<{ gradeId: string; feeStructureId: string }>({ gradeId: '', feeStructureId: '' })
  const [assignSaving, setAssignSaving] = useState(false)

  const [viewFee, setViewFee] = useState<FeeStructure | null>(null)
  const [viewSearch, setViewSearch] = useState('')

  const [paymentRecord, setPaymentRecord] = useState<FeeRecord | null>(null)

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })

  const loadAll = async () => {
    setLoading(true)
    const [s, r, g] = await Promise.all([getFeeStructures(), getFeeRecords(), getGrades()])
    setStructures(s)
    setRecords(r)
    setGrades(g)
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  const totalCollected = records.reduce((sum, r) => sum + r.paidAmount, 0)
  const totalOutstanding = records.reduce((sum, r) => sum + (r.amount - r.paidAmount), 0)

  const handleAddStructure = async () => {
    if (!newStructure.title.trim()) {
      setSnackbar({ open: true, message: 'Title is required', severity: 'error' })
      return
    }
    if (newStructure.isPackage) {
      if (newStructure.packageItemIds.length < 2) {
        setSnackbar({ open: true, message: 'Select at least 2 fees to bundle into a package', severity: 'error' })
        return
      }
    } else if (!newStructure.amount) {
      setSnackbar({ open: true, message: 'Amount is required', severity: 'error' })
      return
    }
    await addFeeStructure({
      feeType: newStructure.feeType,
      title: newStructure.title.trim(),
      description: newStructure.description.trim() || undefined,
      amount: Number(newStructure.amount) || 0,
      dueDateStart: newStructure.dueDateStart || null,
      dueDateEnd: newStructure.dueDateEnd || null,
      gradeId: newStructure.gradeId || null,
      isPackage: newStructure.isPackage,
      packageItemIds: newStructure.isPackage ? newStructure.packageItemIds : undefined,
    })
    setStructures(await getFeeStructures())
    setOpenAddStructure(false)
    setNewStructure({ feeType: 'School Fee', title: '', description: '', amount: '', dueDateStart: '', dueDateEnd: '', gradeId: '', isPackage: false, packageItemIds: [] })
    setSnackbar({ open: true, message: newStructure.isPackage ? 'Fee package created' : 'Fee added', severity: 'success' })
  }

  const packageableFees = structures.filter((s) => !s.isPackage)
  const packageTotal = newStructure.packageItemIds.reduce((sum, id) => {
    const fee = structures.find((s) => s.id === id)
    return sum + (fee?.amount ?? 0)
  }, 0)

  const [deleteStructureTarget, setDeleteStructureTarget] = useState<string | null>(null)
  const [deletingStructure, setDeletingStructure] = useState(false)

  const handleDeleteStructure = (id: string) => setDeleteStructureTarget(id)

  const confirmDeleteStructure = async () => {
    if (!deleteStructureTarget) return
    setDeletingStructure(true)
    try {
      setStructures(await deleteFeeStructure(deleteStructureTarget))
      setSnackbar({ open: true, message: 'Fee structure deleted', severity: 'success' })
      setDeleteStructureTarget(null)
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to delete fee structure', severity: 'error' })
    } finally {
      setDeletingStructure(false)
    }
  }

  /** Quick "Assign to Class" from a specific fee row — pre-fills the fee, and its grade if it's grade-scoped. */
  const openAssignForFee = (fee: FeeStructure) => {
    setAssignForm({ gradeId: fee.gradeId || '', feeStructureId: fee.id })
    setOpenAssign(true)
  }

  // Fee catalog, divided by grade — a grade with fees defined (e.g. Admission + Term fees) gets its
  // own section; fees with no gradeId (school-wide, e.g. Event fees) collect under "School-wide".
  const gradedFeeGroups = grades
    .map((g) => ({ grade: g, fees: structures.filter((s) => s.gradeId === g.id) }))
    .filter((grp) => grp.fees.length > 0)
  const schoolWideFees = structures.filter((s) => !s.gradeId)

  const handleAssign = async () => {
    if (!assignForm.feeStructureId || !assignForm.gradeId) {
      setSnackbar({ open: true, message: 'Select a fee and a class', severity: 'error' })
      return
    }
    setAssignSaving(true)
    try {
      const result = await assignFeeToClass({ feeStructureId: assignForm.feeStructureId, gradeId: assignForm.gradeId })
      setRecords(await getFeeRecords())
      setOpenAssign(false)
      setAssignForm({ gradeId: '', feeStructureId: '' })
      const gradeName = grades.find((g) => g.id === assignForm.gradeId)?.name ?? 'the class'
      setSnackbar({
        open: true,
        message:
          result.created > 0
            ? `Fee assigned to ${result.created} student${result.created === 1 ? '' : 's'} in ${gradeName}${result.alreadyAssigned > 0 ? ` (${result.alreadyAssigned} already had it)` : ''}`
            : `Every student in ${gradeName} already has this fee`,
        severity: 'success',
      })
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to assign fee', severity: 'error' })
    } finally {
      setAssignSaving(false)
    }
  }

  if (openAddStructure) {
    return (
      <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
        <BackButton onClick={() => setOpenAddStructure(false)} />
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, mb: 3 }}>
          {newStructure.isPackage ? 'Create Fee Package' : 'Add Fee'}
        </Typography>
        <Box display="grid" gap={2.5} mt={1} maxWidth="sm">
          <FormControlLabel
            control={
              <Switch
                checked={newStructure.isPackage}
                onChange={(e) => setNewStructure({ ...newStructure, isPackage: e.target.checked, packageItemIds: [] })}
              />
            }
            label="This is a package (bundle of existing fees)"
          />
          <FormControl fullWidth>
            <InputLabel>Fee Type</InputLabel>
            <Select
              value={newStructure.feeType}
              label="Fee Type"
              onChange={(e) => setNewStructure({ ...newStructure, feeType: e.target.value as FeeType })}
            >
              {FEE_TYPES.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField fullWidth label="Title" placeholder={newStructure.isPackage ? 'e.g. New Admission Package' : 'e.g. Sports Meet'} value={newStructure.title} onChange={(e) => setNewStructure({ ...newStructure, title: e.target.value })} />
          <TextField fullWidth label="Description" placeholder="Optional" value={newStructure.description} onChange={(e) => setNewStructure({ ...newStructure, description: e.target.value })} multiline rows={2} />
          <FormControl fullWidth>
            <InputLabel>Grade (optional)</InputLabel>
            <Select
              value={newStructure.gradeId}
              label="Grade (optional)"
              onChange={(e) => setNewStructure({ ...newStructure, gradeId: e.target.value })}
            >
              <MenuItem value="">School-wide (no specific grade)</MenuItem>
              {grades.map((g) => (
                <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {newStructure.isPackage ? (
            <FormControl fullWidth>
              <InputLabel>Fees included in package</InputLabel>
              <Select
                multiple
                input={<OutlinedInput label="Fees included in package" />}
                value={newStructure.packageItemIds}
                onChange={(e) => setNewStructure({ ...newStructure, packageItemIds: e.target.value as string[] })}
                renderValue={(selected) =>
                  (selected as string[])
                    .map((id) => packageableFees.find((f) => f.id === id)?.title)
                    .filter(Boolean)
                    .join(', ')
                }
              >
                {packageableFees.map((f) => (
                  <MenuItem key={f.id} value={f.id}>{f.title} — Rs. {f.amount.toLocaleString()}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <TextField fullWidth label="Amount (Rs.)" type="number" value={newStructure.amount} onChange={(e) => setNewStructure({ ...newStructure, amount: e.target.value })} />
          )}
          {newStructure.isPackage && newStructure.packageItemIds.length > 0 && (
            <Typography variant="body2" sx={{ color: THEME.textDark }}>
              Package total: <strong>Rs. {packageTotal.toLocaleString()}</strong>
            </Typography>
          )}
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
            <TextField fullWidth label="Due Date — Start (optional)" type="date" value={newStructure.dueDateStart} onChange={(e) => setNewStructure({ ...newStructure, dueDateStart: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField fullWidth label="Due Date — End" type="date" value={newStructure.dueDateEnd} onChange={(e) => setNewStructure({ ...newStructure, dueDateEnd: e.target.value })} InputLabelProps={{ shrink: true }} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button onClick={() => setOpenAddStructure(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddStructure} sx={{ backgroundColor: THEME.primary, textTransform: 'none', '&:hover': { backgroundColor: '#1e40af' } }}>
            {newStructure.isPackage ? 'Create Package' : 'Add Fee'}
          </Button>
        </Box>
      </Box>
    )
  }

  if (openAssign) {
    const selectedFee = structures.find((s) => s.id === assignForm.feeStructureId) || null
    const gradeLocked = !!selectedFee?.gradeId
    return (
      <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
        <BackButton onClick={() => setOpenAssign(false)} />
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, mb: 1 }}>Assign Fee to Class</Typography>
        <Typography variant="body2" sx={{ color: THEME.muted, mb: 3 }}>
          Fees are given to a whole class at once — every student in the selected grade gets this fee.
        </Typography>
        <Box display="grid" gap={2.5} mt={1} maxWidth="sm">
          <FormControl fullWidth>
            <InputLabel>Fee</InputLabel>
            <Select
              value={assignForm.feeStructureId}
              label="Fee"
              onChange={(e) => {
                const fee = structures.find((s) => s.id === e.target.value)
                setAssignForm({ feeStructureId: e.target.value, gradeId: fee?.gradeId || assignForm.gradeId })
              }}
            >
              {structures.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.title} — Rs. {s.amount.toLocaleString()}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth disabled={gradeLocked}>
            <InputLabel>Class (Grade)</InputLabel>
            <Select
              value={assignForm.gradeId}
              label="Class (Grade)"
              onChange={(e) => setAssignForm({ ...assignForm, gradeId: e.target.value })}
            >
              {grades.map((g) => (
                <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {gradeLocked && (
            <Typography variant="caption" sx={{ color: THEME.muted }}>
              This fee is specific to {grades.find((g) => g.id === selectedFee?.gradeId)?.name} — class is locked to match.
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button onClick={() => setOpenAssign(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" disabled={assignSaving} onClick={handleAssign} sx={{ backgroundColor: THEME.primary, textTransform: 'none', '&:hover': { backgroundColor: '#1e40af' } }}>
            {assignSaving ? 'Assigning...' : 'Assign'}
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Box>
          <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
            Fees
          </Typography>
          <Typography variant="body2" sx={{ color: THEME.muted }}>
            School fees, admission fees, exam fees, event fees, and after-school class admission fees
          </Typography>
        </Box>
        <Box display="flex" gap={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => setOpenAddStructure(true)}
            sx={{ borderColor: THEME.primary, color: THEME.primary, borderRadius: 0, textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: '#1e40af', backgroundColor: THEME.primaryLight } }}
          >
            Add Fee
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => { setAssignForm({ gradeId: '', feeStructureId: '' }); setOpenAssign(true) }}
            disabled={structures.length === 0}
            sx={{ backgroundColor: THEME.primary, borderRadius: 0, textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#1e40af' } }}
          >
            Assign Fee to Class
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress sx={{ color: THEME.primary }} />
        </Box>
      ) : (
        <>
          {/* Stats */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
            <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
              <CardContent sx={{ py: 2, px: 2 }}>
                <Typography variant="h5" fontWeight="700" sx={{ color: THEME.primary }}>{structures.length}</Typography>
                <Typography variant="body2" sx={{ color: THEME.muted }}>Fee Types</Typography>
              </CardContent>
            </Card>
            <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
              <CardContent sx={{ py: 2, px: 2 }}>
                <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark }}>{records.length}</Typography>
                <Typography variant="body2" sx={{ color: THEME.muted }}>Fee Records</Typography>
              </CardContent>
            </Card>
            <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
              <CardContent sx={{ py: 2, px: 2 }}>
                <Typography variant="h5" fontWeight="700" sx={{ color: '#15803d' }}>Rs. {totalCollected.toLocaleString()}</Typography>
                <Typography variant="body2" sx={{ color: THEME.muted }}>Collected</Typography>
              </CardContent>
            </Card>
            <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
              <CardContent sx={{ py: 2, px: 2 }}>
                <Typography variant="h5" fontWeight="700" sx={{ color: '#991b1b' }}>Rs. {totalOutstanding.toLocaleString()}</Typography>
                <Typography variant="body2" sx={{ color: THEME.muted }}>Outstanding</Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Fee Structures / Packages — divided by grade. Click a grade to expand its fees. */}
          {(() => {
            const renderFeeTable = (fees: FeeStructure[]) => (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: THEME.primaryLight }}>
                      <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Fee Type</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Title</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Due Date</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: THEME.textDark }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fees.map((f) => (
                      <TableRow key={f.id} sx={{ '&:hover': { backgroundColor: THEME.primaryLight } }}>
                        <TableCell><Chip size="small" label={f.feeType} sx={{ borderRadius: 0, bgcolor: THEME.primaryLight, color: THEME.primary }} /></TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={0.75}>
                            {f.isPackage && <Inventory2 fontSize="small" sx={{ color: '#7c3aed' }} titleAccess="Package" />}
                            <Typography variant="body2" fontWeight={600} sx={{ color: THEME.textDark }}>{f.title}</Typography>
                          </Box>
                          {f.description && <Typography variant="caption" sx={{ color: THEME.muted }}>{f.description}</Typography>}
                          {f.isPackage && f.packageItems && f.packageItems.length > 0 && (
                            <Box mt={0.5}>
                              {f.packageItems.map((pi) => (
                                <Chip key={pi.id} label={pi.title} size="small" sx={{ mr: 0.5, mb: 0.5, borderRadius: 0, bgcolor: '#f3f4f6', color: THEME.textDark }} />
                              ))}
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>Rs. {f.amount.toLocaleString()}</TableCell>
                        <TableCell>{f.dueDateStart && f.dueDateEnd ? `${f.dueDateStart} – ${f.dueDateEnd}` : f.dueDateEnd || '—'}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" sx={{ color: THEME.primary }} title="View who's paid" onClick={() => { setViewFee(f); setViewSearch('') }}>
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton size="small" sx={{ color: THEME.primary }} title="Assign to class" onClick={() => openAssignForFee(f)}>
                            <Groups fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" title="Delete" onClick={() => handleDeleteStructure(f.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )

            if (structures.length === 0) {
              return (
                <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, mb: 3 }}>
                  <CardContent sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: THEME.muted }}>No fee structures yet. Add one to get started.</Typography>
                  </CardContent>
                </Card>
              )
            }

            return (
              <Box sx={{ mb: 3 }}>
                {gradedFeeGroups.map(({ grade, fees }) => (
                  <Accordion key={grade.id} elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, mb: 1.5, '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMore />} sx={{ backgroundColor: THEME.primaryLight }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ color: THEME.textDark }}>
                        {grade.name} <Typography component="span" variant="body2" sx={{ color: THEME.muted, ml: 1 }}>({fees.length} fee{fees.length === 1 ? '' : 's'})</Typography>
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>{renderFeeTable(fees)}</AccordionDetails>
                  </Accordion>
                ))}
                {schoolWideFees.length > 0 && (
                  <Accordion elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMore />} sx={{ backgroundColor: '#f3f4f6' }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ color: THEME.textDark }}>
                        School-wide <Typography component="span" variant="body2" sx={{ color: THEME.muted, ml: 1 }}>({schoolWideFees.length} fee{schoolWideFees.length === 1 ? '' : 's'}, not tied to a specific grade)</Typography>
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>{renderFeeTable(schoolWideFees)}</AccordionDetails>
                  </Accordion>
                )}
              </Box>
            )
          })()}

        </>
      )}

      <Dialog open={!!viewFee} onClose={() => setViewFee(null)} fullWidth maxWidth="md">
        <DialogTitle>
          {viewFee?.title} — who's paid
          {viewFee?.gradeId && <Typography variant="body2" sx={{ color: THEME.muted }}>{grades.find((g) => g.id === viewFee.gradeId)?.name}</Typography>}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by student name or email..."
            value={viewSearch}
            onChange={(e) => setViewSearch(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: THEME.primaryLight }}>
                  <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Student</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Paid</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: THEME.textDark }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const feeRecords = records.filter((r) => r.feeStructureId === viewFee?.id)
                  const q = viewSearch.trim().toLowerCase()
                  const filtered = q
                    ? feeRecords.filter((r) => r.studentName.toLowerCase().includes(q) || r.studentEmail.toLowerCase().includes(q))
                    : feeRecords
                  if (filtered.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4, color: THEME.muted }}>
                          {feeRecords.length === 0 ? "No students assigned this fee yet — use \"Assign to class\" first." : 'No students match your search.'}
                        </TableCell>
                      </TableRow>
                    )
                  }

                  // Group by class ("Grade 1A", etc.) so a fee spanning multiple classes reads
                  // as one section per class instead of one long undifferentiated list.
                  const byClass = new Map<string, typeof filtered>()
                  for (const r of filtered) {
                    const key = r.className || 'No class assigned'
                    const group = byClass.get(key)
                    if (group) group.push(r)
                    else byClass.set(key, [r])
                  }
                  const classNames = [...byClass.keys()].sort((a, b) => a.localeCompare(b))

                  return classNames.flatMap((className) => [
                    <TableRow key={`group-${className}`}>
                      <TableCell colSpan={5} sx={{ bgcolor: '#f3f4f6', py: 0.75, fontWeight: 700, color: THEME.textDark, borderBottom: 'none' }}>
                        {className} <Typography component="span" variant="caption" sx={{ color: THEME.muted, fontWeight: 500 }}>({byClass.get(className)!.length})</Typography>
                      </TableCell>
                    </TableRow>,
                    ...byClass.get(className)!.map((r) => (
                      <TableRow key={r.id} sx={{ '&:hover': { backgroundColor: THEME.primaryLight } }}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} sx={{ color: THEME.textDark }}>{r.studentName}</Typography>
                          <Typography variant="caption" sx={{ color: THEME.muted }}>{r.studentEmail}</Typography>
                        </TableCell>
                        <TableCell>Rs. {r.amount.toLocaleString()}</TableCell>
                        <TableCell>Rs. {r.paidAmount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Chip size="small" label={r.status} sx={{ borderRadius: 0, bgcolor: statusColor(r.status).bg, color: statusColor(r.status).color }} />
                        </TableCell>
                        <TableCell align="right">
                          {r.status !== 'Paid' && (
                            <IconButton
                              size="small"
                              sx={{ color: THEME.primary }}
                              title="Record payment"
                              onClick={() => setPaymentRecord(r)}
                            >
                              <PaymentsIcon fontSize="small" />
                            </IconButton>
                          )}
                          {r.status === 'Paid' && <CheckCircle fontSize="small" sx={{ color: '#15803d' }} />}
                        </TableCell>
                      </TableRow>
                    )),
                  ])
                })()}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewFee(null)} sx={{ textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>

      <CenteredMessage
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        autoHideDuration={4000}
      />

      <ConfirmDialog
        open={!!deleteStructureTarget}
        title="Delete fee structure?"
        message="This cannot be undone. Students already assigned this fee keep their existing records."
        confirmLabel="Delete"
        tone="danger"
        loading={deletingStructure}
        onConfirm={confirmDeleteStructure}
        onCancel={() => setDeleteStructureTarget(null)}
      />

      <RecordPaymentDialog
        open={!!paymentRecord}
        record={paymentRecord}
        onClose={() => setPaymentRecord(null)}
        onSaved={async () => setRecords(await getFeeRecords())}
      />
    </Box>
  )
}

export default FeesManagement
