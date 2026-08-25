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
  TextField,
  IconButton,
  CircularProgress,
} from '@mui/material'
import { Add, Delete, Edit, Subject as SubjectIcon, School as SchoolIcon } from '@mui/icons-material'
import {
  getSchemaSubjects,
  createSchemaSubject,
  updateSchemaSubject,
  deleteSchemaSubject,
  type SchemaSubject,
} from '../../lib/api'
import BackButton from '../../components/BackButton'
import CenteredMessage from '../../components/CenteredMessage'
import ConfirmDialog from '../../components/ConfirmDialog'
import AdminAfterSchoolClasses from './AfterSchoolClasses'
import { usePagination } from '../../hooks/usePagination'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const generateId = (prefix: string): string => {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}${num}`
}

type TabValue = 'subjects' | 'after_school'

const SchemaManagement: React.FC = () => {
  const [tab, setTab] = useState<TabValue>('subjects')
  const [subjects, setSubjects] = useState<SchemaSubject[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const [openSubjectDialog, setOpenSubjectDialog] = useState(false)
  const [editSubjectId, setEditSubjectId] = useState<string | null>(null)
  const [subjectForm, setSubjectForm] = useState({ id: '', subject_name: '' })
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })
  const [deleteSubjectTarget, setDeleteSubjectTarget] = useState<string | null>(null)
  const [deletingSubject, setDeletingSubject] = useState(false)

  const loadSubjects = async () => {
    setLoading(true)
    try {
      setSubjects(await getSchemaSubjects())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubjects()
  }, [])

  const handleAddSubject = async () => {
    try {
      if (editSubjectId) {
        await updateSchemaSubject(editSubjectId, {
          subject_name: subjectForm.subject_name,
        })
      } else {
        await createSchemaSubject(subjectForm)
      }
      setOpenSubjectDialog(false)
      setEditSubjectId(null)
      setSubjectForm({ id: '', subject_name: '' })
      loadSubjects()
      setSnackbar({ open: true, message: editSubjectId ? 'Subject updated' : 'Subject added', severity: 'success' })
    } catch (e: any) {
      setSnackbar({ open: true, message: e?.message || 'Failed to save subject', severity: 'error' })
    }
  }

  const handleDeleteSubject = (id: string) => setDeleteSubjectTarget(id)

  const confirmDeleteSubject = async () => {
    if (!deleteSubjectTarget) return
    setDeletingSubject(true)
    try {
      await deleteSchemaSubject(deleteSubjectTarget)
      loadSubjects()
      setSnackbar({ open: true, message: 'Subject deleted', severity: 'success' })
      setDeleteSubjectTarget(null)
    } catch (e: any) {
      setSnackbar({ open: true, message: e?.message || 'Failed to delete subject', severity: 'error' })
    } finally {
      setDeletingSubject(false)
    }
  }

  const filteredSubjects = subjects.filter((s) =>
    `${s._id} ${s.subject_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const {
    page,
    rowsPerPage,
    pageItems: pagedSubjects,
    handleChangePage,
    handleChangeRowsPerPage,
  } = usePagination(filteredSubjects, 10)

  if (openSubjectDialog) {
    return (
      <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
        <BackButton onClick={() => setOpenSubjectDialog(false)} />
        <Typography variant="h5" fontWeight={700} mb={3}>{editSubjectId ? 'Edit Subject' : 'Add Subject'}</Typography>
        <TextField
          fullWidth
          label="Subject / Course Name"
          value={subjectForm.subject_name}
          onChange={(e) => setSubjectForm((f) => ({ ...f, subject_name: e.target.value }))}
          margin="dense"
        />
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button onClick={() => setOpenSubjectDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddSubject} disabled={!subjectForm.id || !subjectForm.subject_name}>
            {editSubjectId ? 'Save' : 'Add'}
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ pb: 2, borderBottom: `1px solid ${THEME.primaryBorder}`, mb: 2 }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark }}>
          Subjects
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Manage institute subjects and after-school classes
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {(
          [
            { value: 'subjects', label: 'Subjects', icon: <SubjectIcon /> },
            { value: 'after_school', label: 'After-School Classes', icon: <SchoolIcon /> },
          ] as const
        ).map((t) => {
          const active = tab === t.value
          return (
            <Card
              key={t.value}
              elevation={0}
              onClick={() => setTab(t.value)}
              sx={{
                cursor: 'pointer',
                border: `1px solid ${active ? THEME.primary : THEME.primaryBorder}`,
                borderRadius: 0,
                bgcolor: active ? THEME.primaryLight : 'transparent',
                transition: 'background-color 0.15s ease',
                '&:hover': { bgcolor: THEME.primaryLight },
              }}
            >
              <CardContent sx={{ py: 1.5, px: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ color: THEME.primary, display: 'flex' }}>{t.icon}</Box>
                <Typography variant="subtitle2" fontWeight="600" sx={{ color: THEME.textDark }}>{t.label}</Typography>
              </CardContent>
            </Card>
          )
        })}
      </Box>

      {tab === 'subjects' && (
        loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress sx={{ color: THEME.primary }} />
          </Box>
        ) : (
          <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography fontWeight="600">Institute subjects</Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Add />}
                  onClick={() => {
                    setEditSubjectId(null)
                    setSubjectForm({ id: generateId('SB'), subject_name: '' })
                    setOpenSubjectDialog(true)
                  }}
                  sx={{ backgroundColor: THEME.primary, borderRadius: 2, textTransform: 'none' }}
                >
                  Add Subject
                </Button>
              </Box>
              <Box mb={2}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search subjects by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: THEME.primaryLight }}>
                      <TableCell sx={{ fontWeight: 600 }}>Subject / Course Name</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedSubjects.map((s) => (
                      <TableRow key={s._id}>
                        <TableCell>{s.subject_name}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditSubjectId(s._id)
                              setSubjectForm({
                                id: s._id,
                                subject_name: s.subject_name,
                              })
                              setOpenSubjectDialog(true)
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteSubject(s._id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {filteredSubjects.length > 0 && (
                <TablePagination
                  component="div"
                  count={filteredSubjects.length}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[10, 25, 50]}
                />
              )}
            </CardContent>
          </Card>
        )
      )}

      {tab === 'after_school' && <AdminAfterSchoolClasses />}

      <CenteredMessage
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        autoHideDuration={4000}
      />

      <ConfirmDialog
        open={!!deleteSubjectTarget}
        title="Delete subject?"
        message="This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        loading={deletingSubject}
        onConfirm={confirmDeleteSubject}
        onCancel={() => setDeleteSubjectTarget(null)}
      />
    </Box>
  )
}

export default SchemaManagement
