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
  TablePagination,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material'
import { Add, Delete, Edit } from '@mui/icons-material'
import CenteredMessage from '../../components/CenteredMessage'
import ConfirmDialog from '../../components/ConfirmDialog'
import BackButton from '../../components/BackButton'
import { usePagination } from '../../hooks/usePagination'
import {
  getAfterSchoolClasses,
  addAfterSchoolClass,
  updateAfterSchoolClass,
  deleteAfterSchoolClass,
  getGrades,
  type AfterSchoolClass,
  type AfterSchoolClassName,
  type AcademicGrade,
} from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const AfterSchoolClasses: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<AfterSchoolClass[]>([])
  const [grades, setGrades] = useState<AcademicGrade[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const [openAdd, setOpenAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<{ name: AfterSchoolClassName; description: string; schedule: string; level: AfterSchoolClass['level']; admissionFee: string }>({
    name: '',
    description: '',
    schedule: '',
    level: '',
    admissionFee: '900',
  })

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })

  const loadAll = async () => {
    setLoading(true)
    const [c, g] = await Promise.all([getAfterSchoolClasses(), getGrades()])
    setClasses(c)
    setGrades(g)
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  const resetForm = () => setForm({ name: '', description: '', schedule: '', level: '', admissionFee: '900' })

  const handleAdd = async () => {
    if (!form.name.trim() || !form.level) {
      setSnackbar({ open: true, message: 'Class name and grade level are required', severity: 'error' })
      return
    }
    if (editId) {
      setClasses(
        await updateAfterSchoolClass(editId, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          schedule: form.schedule.trim() || undefined,
          level: form.level,
          admissionFee: Number(form.admissionFee),
        })
      )
      setSnackbar({ open: true, message: 'Class updated', severity: 'success' })
    } else {
      setClasses(
        await addAfterSchoolClass({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          schedule: form.schedule.trim() || undefined,
          level: form.level,
          admissionFee: Number(form.admissionFee),
        })
      )
      setSnackbar({ open: true, message: 'Class added', severity: 'success' })
    }
    setOpenAdd(false)
    setEditId(null)
    resetForm()
  }

  const handleOpenEdit = (c: AfterSchoolClass) => {
    setEditId(c.id)
    setForm({
      name: c.name,
      description: c.description || '',
      schedule: c.schedule || '',
      level: c.level,
      admissionFee: String(c.admissionFee),
    })
    setOpenAdd(true)
  }

  const [deleteClassTarget, setDeleteClassTarget] = useState<string | null>(null)
  const [deletingClass, setDeletingClass] = useState(false)

  const handleDelete = (id: string) => setDeleteClassTarget(id)

  const confirmDeleteClass = async () => {
    if (!deleteClassTarget) return
    setDeletingClass(true)
    try {
      setClasses(await deleteAfterSchoolClass(deleteClassTarget))
      setSnackbar({ open: true, message: 'Class deleted', severity: 'success' })
      setDeleteClassTarget(null)
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to delete class', severity: 'error' })
    } finally {
      setDeletingClass(false)
    }
  }

  const filteredClasses = classes.filter((c) =>
    `${c.id} ${c.name}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const {
    page: classesPage,
    rowsPerPage: classesRowsPerPage,
    pageItems: pagedClasses,
    handleChangePage: handleClassesChangePage,
    handleChangeRowsPerPage: handleClassesChangeRowsPerPage,
  } = usePagination(filteredClasses, 10)

  if (openAdd) {
    return (
      <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
        <BackButton onClick={() => { setOpenAdd(false); setEditId(null) }} />
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, mb: 3 }}>
          {editId ? 'Edit After-School Class' : 'Add After-School Class'}
        </Typography>
        <Box display="grid" gap={2.5} mt={1} maxWidth="sm">
          <TextField
            fullWidth
            label="Class name"
            placeholder="e.g. Computer / IT Course"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField fullWidth label="Description" placeholder="Optional" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline rows={2} />
          <TextField fullWidth label="Schedule" placeholder="e.g. Mon & Wed, 3:30–5:00 PM" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} />
          <FormControl fullWidth>
            <InputLabel>Level</InputLabel>
            <Select value={form.level} label="Level" onChange={(e) => setForm({ ...form, level: e.target.value })}>
              {grades.map((g) => (
                <MenuItem key={g.id} value={g.name}>{g.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button onClick={() => { setOpenAdd(false); setEditId(null) }} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} sx={{ backgroundColor: THEME.primary, textTransform: 'none', '&:hover': { backgroundColor: '#1e40af' } }}>
            {editId ? 'Save changes' : 'Add'}
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ pb: 2, mb: 2 }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          After-School Special Classes
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Computer / IT, Abacus, and Electrician Training — for O/L and A/L students
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress sx={{ color: THEME.primary }} />
        </Box>
      ) : (
        <>
          {/* Classes */}
          <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 2, mb: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography fontWeight="600">After-school classes</Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Add />}
                  onClick={() => { setEditId(null); resetForm(); setOpenAdd(true) }}
                  sx={{ backgroundColor: THEME.primary, borderRadius: 2, textTransform: 'none' }}
                >
                  Add Class
                </Button>
              </Box>
              <Box mb={2}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search classes by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: THEME.primaryLight }}>
                      <TableCell sx={{ fontWeight: 600 }}>Class Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Level</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedClasses.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell>{c.level}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" title="Edit class" onClick={() => handleOpenEdit(c)}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" title="Delete class" onClick={() => handleDelete(c.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {filteredClasses.length > 0 && (
                <TablePagination
                  component="div"
                  count={filteredClasses.length}
                  page={classesPage}
                  onPageChange={handleClassesChangePage}
                  rowsPerPage={classesRowsPerPage}
                  onRowsPerPageChange={handleClassesChangeRowsPerPage}
                  rowsPerPageOptions={[10, 25, 50]}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      <CenteredMessage
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        autoHideDuration={4000}
      />

      <ConfirmDialog
        open={!!deleteClassTarget}
        title="Delete class?"
        message="All enrollments for it will also be removed."
        confirmLabel="Delete"
        tone="danger"
        loading={deletingClass}
        onConfirm={confirmDeleteClass}
        onCancel={() => setDeleteClassTarget(null)}
      />
    </Box>
  )
}

export default AfterSchoolClasses
