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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Autocomplete,
  Checkbox,
  ListItemText,
  OutlinedInput,
} from '@mui/material'
import { Add, Edit, Delete, School as SchoolIcon, Groups as GroupsIcon, Grade as GradeIcon, Class as ClassIcon, Search as SearchIcon, Print as PrintIcon, Assessment as ReportIcon } from '@mui/icons-material'
import AdminAfterSchoolClasses from './AfterSchoolClasses'
import { usePagination } from '../../hooks/usePagination'
import {
  getClassSections,
  createClassSection,
  updateClassSection,
  deleteClassSection,
  getGrades,
  addGrade,
  updateGrade,
  deleteGrade,
  getAcademicYears,
  getClassDetails,
  getUsers,
  getStudents,
  getSchemaSubjects,
  getSchemaTeacherSubjects,
  createSchemaTeacherSubject,
  assignStudentToClass,
  assignClassSubject,
  createOrUpdateSchemaStudentSubjectMarks,
  EXAM_TYPES,
  type ClassSectionItem,
  type AcademicGrade,
  type AcademicYearItem,
  type ClassDetails as ClassDetailsData,
  type AdminUser,
  type SchemaSubject,
  type SchemaTeacherSubject,
  type ExamType,
} from '../../lib/api'
import BackButton from '../../components/BackButton'
import CenteredMessage from '../../components/CenteredMessage'
import ConfirmDialog from '../../components/ConfirmDialog'

const generateId = (prefix: string): string => {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}${num}`
}

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const ClassDetails: React.FC = () => {
  const [classes, setClasses] = useState<ClassSectionItem[]>([])
  const [grades, setGrades] = useState<AcademicGrade[]>([])
  const [years, setYears] = useState<AcademicYearItem[]>([])
  const [teachers, setTeachers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [details, setDetails] = useState<ClassDetailsData | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const [tab, setTab] = useState<'classes' | 'afterSchool'>('classes')
  const [drillGradeId, setDrillGradeId] = useState<string | null>(null)
  const [detailSection, setDetailSection] = useState<'students' | 'subjects' | 'marks'>('students')
  const [gradeSearch, setGradeSearch] = useState('')
  const [divisionSearch, setDivisionSearch] = useState('')
  const [detailSearch, setDetailSearch] = useState('')

  const [openAddDialog, setOpenAddDialog] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [editSectionId, setEditSectionId] = useState<string | null>(null)
  const [newClass, setNewClass] = useState({ gradeId: '', academicYearId: '', name: '', classTeacherId: '' })

  const [gradeDialogOpen, setGradeDialogOpen] = useState(false)
  const [editGradeId, setEditGradeId] = useState<string | null>(null)
  const [gradeName, setGradeName] = useState('')
  const [gradeSaving, setGradeSaving] = useState(false)

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })
  const [confirmAction, setConfirmAction] = useState<{ type: 'student' | 'division' | 'grade'; id: string } | null>(null)
  const [confirmActionLoading, setConfirmActionLoading] = useState(false)

  const [openMarksDialog, setOpenMarksDialog] = useState(false)
  const [marksSaving, setMarksSaving] = useState(false)
  const [marksForm, setMarksForm] = useState<{ student_id: string; subject_id: string; exam_type: ExamType; marks: number; note: string }>({
    student_id: '',
    subject_id: '',
    exam_type: 'Assignment',
    marks: 0,
    note: '',
  })

  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportStudentId, setReportStudentId] = useState('')
  const [reportSubjectIds, setReportSubjectIds] = useState<string[]>([])
  const [reportExamTypes, setReportExamTypes] = useState<ExamType[]>([])

  const [allStudents, setAllStudents] = useState<AdminUser[]>([])
  const [addStudentDialogOpen, setAddStudentDialogOpen] = useState(false)
  const [addStudentId, setAddStudentId] = useState('')
  const [addStudentSaving, setAddStudentSaving] = useState(false)

  const [subjects, setSubjects] = useState<SchemaSubject[]>([])
  const [teacherSubjects, setTeacherSubjects] = useState<SchemaTeacherSubject[]>([])
  const [addSubjectDialogOpen, setAddSubjectDialogOpen] = useState(false)
  const [addSubjectId, setAddSubjectId] = useState('')
  const [addSubjectTeacherId, setAddSubjectTeacherId] = useState('')
  const [addSubjectSaving, setAddSubjectSaving] = useState(false)

  const [assignTeacherOpen, setAssignTeacherOpen] = useState(false)
  const [assignTeacherId, setAssignTeacherId] = useState('')
  const [assignTeacherSaving, setAssignTeacherSaving] = useState(false)

  const loadClasses = async () => {
    setLoading(true)
    try {
      const [c, g, y, u, s, subj, ts] = await Promise.all([
        getClassSections(),
        getGrades(),
        getAcademicYears(),
        getUsers(),
        getStudents(),
        getSchemaSubjects(),
        getSchemaTeacherSubjects(),
      ])
      setClasses(c)
      setGrades(g)
      setYears(y)
      setTeachers(u.filter((x) => x.role === 'Teacher'))
      setAllStudents(s)
      setSubjects(subj)
      setTeacherSubjects(ts)
      if (!newClass.academicYearId) {
        const current = y.find((yr) => yr.isCurrent) || y[0]
        if (current) setNewClass((f) => ({ ...f, academicYearId: current.id }))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClasses()
  }, [])

  useEffect(() => {
    setDivisionSearch('')
  }, [drillGradeId])

  const loadClassDetails = async (classId: string, showLoading = true) => {
    if (showLoading) setDetailsLoading(true)
    try {
      const d = await getClassDetails(classId)
      setDetails(d)
    } finally {
      if (showLoading) setDetailsLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedClassId) {
      setDetails(null)
      return
    }
    setDetailSection('students')
    loadClassDetails(selectedClassId)
  }, [selectedClassId])

  useEffect(() => {
    setDetailSearch('')
  }, [detailSection, selectedClassId])

  const handleSaveMarks = async () => {
    if (!marksForm.student_id || !marksForm.subject_id) return
    setMarksSaving(true)
    try {
      await createOrUpdateSchemaStudentSubjectMarks(marksForm)
      setOpenMarksDialog(false)
      setMarksForm({ student_id: '', subject_id: '', exam_type: 'Assignment', marks: 0, note: '' })
      if (selectedClassId) await loadClassDetails(selectedClassId, false)
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to save marks', severity: 'error' })
    } finally {
      setMarksSaving(false)
    }
  }

  const handleAddStudent = async () => {
    if (!addStudentId || !selectedClassId) return
    setAddStudentSaving(true)
    try {
      await assignStudentToClass(addStudentId, selectedClassId)
      setAddStudentDialogOpen(false)
      setAddStudentId('')
      await loadClassDetails(selectedClassId, false)
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to add student', severity: 'error' })
    } finally {
      setAddStudentSaving(false)
    }
  }

  const handleRemoveStudent = (studentId: string) => setConfirmAction({ type: 'student', id: studentId })

  const handleAddSubject = async () => {
    if (!addSubjectId || !selectedClassId) return
    setAddSubjectSaving(true)
    try {
      await assignClassSubject(selectedClassId, addSubjectId)
      if (addSubjectTeacherId) {
        const alreadyAssigned = teacherSubjects.some(
          (r) => String(r.teacher_id) === String(addSubjectTeacherId) && String(r.subject_id) === String(addSubjectId)
        )
        if (alreadyAssigned) {
          setSnackbar({ open: true, message: 'This teacher is already assigned to this subject — kept the existing assignment.', severity: 'success' })
        } else {
          await createSchemaTeacherSubject({ id: generateId('TS'), teacher_id: addSubjectTeacherId, subject_id: addSubjectId })
          setTeacherSubjects(await getSchemaTeacherSubjects())
        }
      }
      setAddSubjectDialogOpen(false)
      setAddSubjectId('')
      setAddSubjectTeacherId('')
      await loadClassDetails(selectedClassId, false)
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to add subject', severity: 'error' })
    } finally {
      setAddSubjectSaving(false)
    }
  }

  const handleAddClass = async () => {
    if (!newClass.gradeId || !newClass.academicYearId || !newClass.name.trim()) return
    setAddLoading(true)
    try {
      if (editSectionId) {
        await updateClassSection(editSectionId, { name: newClass.name.trim(), classTeacherId: newClass.classTeacherId || null })
      } else {
        await createClassSection({
          gradeId: newClass.gradeId,
          academicYearId: newClass.academicYearId,
          name: newClass.name.trim(),
          classTeacherId: newClass.classTeacherId || undefined,
        })
      }
      setOpenAddDialog(false)
      setEditSectionId(null)
      setNewClass((f) => ({ ...f, gradeId: '', name: '', classTeacherId: '' }))
      await loadClasses()
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to save division', severity: 'error' })
    } finally {
      setAddLoading(false)
    }
  }

  const handleOpenAddSection = (gradeId: string) => {
    setEditSectionId(null)
    setNewClass((f) => ({ ...f, gradeId, name: '', classTeacherId: '' }))
    setOpenAddDialog(true)
  }

  /** A grade with just one class doesn't need to be split into named divisions first.
   *  1 division: go straight into it — no need to pick from a list of one.
   *  0 or 2+ divisions: show the division list, since the admin needs to add or choose one. */
  const handleGradeCardClick = (gradeId: string) => {
    const divisionsForGrade = classes.filter((c) => c.gradeId === gradeId)
    if (divisionsForGrade.length === 1) {
      setSelectedClassId(divisionsForGrade[0].id)
      return
    }
    setDrillGradeId(gradeId)
  }

  const handleOpenEditSection = (c: ClassSectionItem) => {
    setEditSectionId(c.id)
    setNewClass((f) => ({ ...f, gradeId: c.gradeId, name: c.name, classTeacherId: c.classTeacherId || '' }))
    setOpenAddDialog(true)
  }

  const handleDeleteSection = (id: string) => setConfirmAction({ type: 'division', id })

  const handleOpenAssignTeacher = () => {
    if (!selectedClassId) return
    const current = classes.find((c) => c.id === selectedClassId)
    setAssignTeacherId(current?.classTeacherId || '')
    setAssignTeacherOpen(true)
  }

  const handleAssignTeacher = async () => {
    if (!selectedClassId) return
    setAssignTeacherSaving(true)
    try {
      await updateClassSection(selectedClassId, { classTeacherId: assignTeacherId || null })
      await Promise.all([loadClasses(), loadClassDetails(selectedClassId, false)])
      setAssignTeacherOpen(false)
      setSnackbar({ open: true, message: 'Class teacher updated', severity: 'success' })
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to update class teacher', severity: 'error' })
    } finally {
      setAssignTeacherSaving(false)
    }
  }

  const handleOpenAddGrade = () => {
    setEditGradeId(null)
    setGradeName('')
    setGradeDialogOpen(true)
  }

  const handleOpenEditGrade = (g: AcademicGrade) => {
    setEditGradeId(g.id)
    setGradeName(g.name)
    setGradeDialogOpen(true)
  }

  const handleSaveGrade = async () => {
    if (!gradeName.trim()) return
    setGradeSaving(true)
    try {
      const updated = editGradeId ? await updateGrade(editGradeId, gradeName.trim()) : await addGrade(gradeName.trim())
      setGrades(updated)
      setGradeDialogOpen(false)
      setEditGradeId(null)
      setGradeName('')
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to save grade', severity: 'error' })
    } finally {
      setGradeSaving(false)
    }
  }

  const handleDeleteGrade = (id: string) => setConfirmAction({ type: 'grade', id })

  const confirmActionMessages: Record<'student' | 'division' | 'grade', { title: string; message: string }> = {
    student: { title: 'Remove student?', message: 'Remove this student from the class?' },
    division: { title: 'Delete division?', message: 'This cannot be undone.' },
    grade: { title: 'Delete grade?', message: 'This cannot be undone.' },
  }

  const runConfirmedAction = async () => {
    if (!confirmAction) return
    setConfirmActionLoading(true)
    try {
      if (confirmAction.type === 'student') {
        await assignStudentToClass(confirmAction.id, null)
        if (selectedClassId) await loadClassDetails(selectedClassId, false)
      } else if (confirmAction.type === 'division') {
        await deleteClassSection(confirmAction.id)
        await loadClasses()
      } else {
        setGrades(await deleteGrade(confirmAction.id))
      }
      setConfirmAction(null)
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Action failed', severity: 'error' })
    } finally {
      setConfirmActionLoading(false)
    }
  }

  const filteredGrades = grades.filter((g) => g.name.toLowerCase().includes(gradeSearch.trim().toLowerCase()))
  const filteredDivisions = classes
    .filter((c) => c.gradeId === drillGradeId)
    .filter((c) => {
      const q = divisionSearch.trim().toLowerCase()
      if (!q) return true
      return c.fullName.toLowerCase().includes(q) || (c.classTeacherName ?? '').toLowerCase().includes(q)
    })

  const detailSearchQuery = detailSearch.trim().toLowerCase()
  const filteredStudents = (details?.students ?? []).filter(
    (s) => !detailSearchQuery || s.name.toLowerCase().includes(detailSearchQuery) || s.email.toLowerCase().includes(detailSearchQuery)
  )
  const filteredSubjects = (details?.subjectsWithTeachers ?? []).filter(
    (s) =>
      !detailSearchQuery ||
      s.subjectName.toLowerCase().includes(detailSearchQuery) ||
      s.teachers.some((t) => t.toLowerCase().includes(detailSearchQuery))
  )
  const filteredMarks = (details?.marks ?? []).filter(
    (m) =>
      !detailSearchQuery ||
      m.studentName.toLowerCase().includes(detailSearchQuery) ||
      m.subjectName.toLowerCase().includes(detailSearchQuery) ||
      m.examType.toLowerCase().includes(detailSearchQuery) ||
      (m.note ?? '').toLowerCase().includes(detailSearchQuery)
  )

  const {
    page: studentsPage,
    rowsPerPage: studentsRowsPerPage,
    pageItems: pagedStudents,
    handleChangePage: handleStudentsChangePage,
    handleChangeRowsPerPage: handleStudentsChangeRowsPerPage,
  } = usePagination(filteredStudents, 10)

  const {
    page: marksPage,
    rowsPerPage: marksRowsPerPage,
    pageItems: pagedMarks,
    handleChangePage: handleMarksChangePage,
    handleChangeRowsPerPage: handleMarksChangeRowsPerPage,
  } = usePagination(filteredMarks, 10)

  const reportStudent = details?.students.find((s) => s.id === reportStudentId) ?? null
  const reportMarks = (details?.marks ?? []).filter(
    (m) => m.studentId === reportStudentId && reportSubjectIds.includes(m.subjectId) && reportExamTypes.includes(m.examType)
  )
  const reportAverage = reportMarks.length > 0 ? reportMarks.reduce((sum, m) => sum + m.marks, 0) / reportMarks.length : null
  const reportSubjectGroups = (details?.subjectsWithTeachers ?? [])
    .filter((s) => reportSubjectIds.includes(s.subjectId))
    .map((s) => ({ subject: s, marks: reportMarks.filter((m) => m.subjectId === s.subjectId) }))
    .filter((g) => g.marks.length > 0)

  if (openAddDialog) {
    const sectionGradeName = grades.find((g) => g.id === newClass.gradeId)?.name ?? ''
    return (
      <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
        <BackButton onClick={() => { setOpenAddDialog(false); setEditSectionId(null) }} />
        <Typography variant="h5" fontWeight={700} mb={3}>{editSectionId ? 'Edit Division' : 'Add Division'}{sectionGradeName ? ` — ${sectionGradeName}` : ''}</Typography>
        <Box display="grid" gap={2.5} sx={{ maxWidth: 480 }}>
          {!editSectionId && (
            <FormControl fullWidth>
              <InputLabel>Academic Year</InputLabel>
              <Select value={newClass.academicYearId} label="Academic Year" onChange={(e) => setNewClass((f) => ({ ...f, academicYearId: e.target.value }))}>
                {years.map((y) => (
                  <MenuItem key={y.id} value={y.id}>{y.year}{y.isCurrent ? ' (current)' : ''}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <TextField
            fullWidth
            label="Division name"
            placeholder="e.g. A"
            value={newClass.name}
            onChange={(e) => setNewClass((f) => ({ ...f, name: e.target.value }))}
          />
          <FormControl fullWidth>
            <InputLabel>Class teacher (optional)</InputLabel>
            <Select value={newClass.classTeacherId} label="Class teacher (optional)" onChange={(e) => setNewClass((f) => ({ ...f, classTeacherId: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {teachers.map((t) => (
                <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button onClick={() => { setOpenAddDialog(false); setEditSectionId(null) }} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddClass}
            disabled={addLoading || !newClass.gradeId || (!editSectionId && !newClass.academicYearId) || !newClass.name.trim()}
            sx={{ backgroundColor: THEME.primary, borderRadius: 0, textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#1e40af' } }}
          >
            {addLoading ? 'Saving...' : editSectionId ? 'Save changes' : 'Add Division'}
          </Button>
        </Box>
        <CenteredMessage
          open={snackbar.open}
          message={snackbar.message}
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          autoHideDuration={4000}
        />
      </Box>
    )
  }

  if (openMarksDialog) {
    return (
      <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
        <BackButton onClick={() => setOpenMarksDialog(false)} />
        <Typography variant="h5" fontWeight={700} mb={3}>Add / Edit Marks</Typography>
        <Box display="grid" gap={2.5} sx={{ maxWidth: 480 }}>
          <Autocomplete
            options={details?.students ?? []}
            getOptionLabel={(s) => s.name}
            value={(details?.students ?? []).find((s) => s.id === marksForm.student_id) || null}
            onChange={(_, val) => setMarksForm((f) => ({ ...f, student_id: val?.id || '' }))}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            renderInput={(params) => <TextField {...params} label="Student" placeholder="Search by name" />}
          />
          <FormControl fullWidth>
            <InputLabel>Subject</InputLabel>
            <Select value={marksForm.subject_id} label="Subject" onChange={(e) => setMarksForm((f) => ({ ...f, subject_id: e.target.value }))}>
              {(details?.subjectsWithTeachers ?? []).map((s) => (
                <MenuItem key={s.subjectId} value={s.subjectId}>{s.subjectName}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Exam Type</InputLabel>
            <Select value={marksForm.exam_type} label="Exam Type" onChange={(e) => setMarksForm((f) => ({ ...f, exam_type: e.target.value as ExamType }))}>
              {EXAM_TYPES.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField fullWidth type="number" label="Marks" value={marksForm.marks} onChange={(e) => setMarksForm((f) => ({ ...f, marks: parseFloat(e.target.value) || 0 }))} />
          <TextField fullWidth label="Note (optional)" placeholder="Remarks about this result" value={marksForm.note} onChange={(e) => setMarksForm((f) => ({ ...f, note: e.target.value }))} multiline rows={2} />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button onClick={() => setOpenMarksDialog(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveMarks}
            disabled={marksSaving || !marksForm.student_id || !marksForm.subject_id}
            sx={{ backgroundColor: THEME.primary, borderRadius: 0, textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#1e40af' } }}
          >
            {marksSaving ? 'Saving...' : 'Save'}
          </Button>
        </Box>
        <CenteredMessage
          open={snackbar.open}
          message={snackbar.message}
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          autoHideDuration={4000}
        />
      </Box>
    )
  }

  if (gradeDialogOpen) {
    return (
      <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
        <BackButton onClick={() => { setGradeDialogOpen(false); setEditGradeId(null) }} />
        <Typography variant="h5" fontWeight={700} mb={3}>{editGradeId ? 'Edit Grade' : 'Add Grade'}</Typography>
        <Box display="grid" gap={2.5} sx={{ maxWidth: 480 }}>
          <TextField
            fullWidth
            autoFocus
            label="Grade name"
            placeholder="e.g. Grade 1"
            value={gradeName}
            onChange={(e) => setGradeName(e.target.value)}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button onClick={() => { setGradeDialogOpen(false); setEditGradeId(null) }} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveGrade}
            disabled={gradeSaving || !gradeName.trim()}
            sx={{ backgroundColor: THEME.primary, borderRadius: 0, textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#1e40af' } }}
          >
            {gradeSaving ? 'Saving...' : 'Save'}
          </Button>
        </Box>
        <CenteredMessage
          open={snackbar.open}
          message={snackbar.message}
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          autoHideDuration={4000}
        />
      </Box>
    )
  }

  if (reportDialogOpen) {
    return (
      <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
        <BackButton onClick={() => setReportDialogOpen(false)} />
        <Typography variant="h5" fontWeight={700} mb={3}>Generate Student Report</Typography>
        <Box display="grid" gap={2.5} sx={{ maxWidth: 480 }}>
          <Autocomplete
            options={details?.students ?? []}
            getOptionLabel={(s) => s.name}
            value={(details?.students ?? []).find((s) => s.id === reportStudentId) || null}
            onChange={(_, val) => setReportStudentId(val?.id || '')}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            renderInput={(params) => <TextField {...params} label="Student" placeholder="Search by name" />}
          />
          <FormControl fullWidth>
            <InputLabel>Subjects</InputLabel>
            <Select
              multiple
              value={reportSubjectIds}
              onChange={(e) => setReportSubjectIds(e.target.value as string[])}
              input={<OutlinedInput label="Subjects" />}
              renderValue={(selected) =>
                (details?.subjectsWithTeachers ?? [])
                  .filter((s) => (selected as string[]).includes(s.subjectId))
                  .map((s) => s.subjectName)
                  .join(', ')
              }
            >
              {(details?.subjectsWithTeachers ?? []).map((s) => (
                <MenuItem key={s.subjectId} value={s.subjectId}>
                  <Checkbox checked={reportSubjectIds.includes(s.subjectId)} />
                  <ListItemText primary={s.subjectName} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Exam Types</InputLabel>
            <Select
              multiple
              value={reportExamTypes}
              onChange={(e) => setReportExamTypes(e.target.value as ExamType[])}
              input={<OutlinedInput label="Exam Types" />}
              renderValue={(selected) => (selected as ExamType[]).join(', ')}
            >
              {EXAM_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  <Checkbox checked={reportExamTypes.includes(t)} />
                  <ListItemText primary={t} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {reportStudent && details && (
          <Box id="printable-report" sx={{ mt: 3, maxWidth: 480 }}>
            <Typography variant="h6" fontWeight={700}>{reportStudent.name}</Typography>
            <Typography variant="body2" sx={{ color: THEME.muted, mb: 2 }}>
              {details.classInfo.fullName} — Exam Report
            </Typography>

            {reportSubjectGroups.length === 0 && (
              <Typography variant="body2" sx={{ color: THEME.muted, py: 2 }}>No marks recorded for the selected subjects / exam types.</Typography>
            )}

            {reportSubjectGroups.map((group) => (
              <Box key={group.subject.subjectId} sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: THEME.textDark, mb: 0.5 }}>
                  {group.subject.subjectName}
                </Typography>
                {group.marks.map((m) => (
                  <Box key={m.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
                    <Typography variant="body2">{m.examType}{m.note ? ` — ${m.note}` : ''}</Typography>
                    <Typography variant="body2" fontWeight={600}>{m.marks}</Typography>
                  </Box>
                ))}
              </Box>
            ))}

            {reportAverage !== null && (
              <Typography variant="body2" fontWeight={600} sx={{ mt: 2 }}>
                Average: {reportAverage.toFixed(1)}
              </Typography>
            )}
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button onClick={() => setReportDialogOpen(false)} sx={{ textTransform: 'none' }}>Close</Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            disabled={!reportStudent}
            onClick={() => window.print()}
            sx={{ backgroundColor: THEME.primary, textTransform: 'none', '&:hover': { backgroundColor: '#1e40af' } }}
          >
            Print / Save as PDF
          </Button>
        </Box>
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #printable-report, #printable-report * { visibility: visible; }
            #printable-report { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `}</style>
        <CenteredMessage
          open={snackbar.open}
          message={snackbar.message}
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          autoHideDuration={4000}
        />
      </Box>
    )
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 2, pb: 2 }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          Class Details
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Regular classes and after-school special classes
        </Typography>
      </Box>

      {!(tab === 'classes' && (drillGradeId || selectedClassId)) && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          {(
            [
              { value: 'classes', label: 'Classes', icon: <ClassIcon /> },
              { value: 'afterSchool', label: 'After-School Classes', icon: <SchoolIcon /> },
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
      )}

      {tab === 'afterSchool' && <AdminAfterSchoolClasses />}

      {tab === 'classes' && (
      <>
      {!drillGradeId && !selectedClassId && (
        <>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Typography variant="h6" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em' }}>
            Grades
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenAddGrade}
            sx={{ backgroundColor: THEME.primary, borderRadius: 0, textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#1e40af' } }}
          >
            Add Grade
          </Button>
        </Box>
        <TextField
          fullWidth
          size="small"
          placeholder="Search grades..."
          value={gradeSearch}
          onChange={(e) => setGradeSearch(e.target.value)}
          sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}`, maxWidth: 360 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: THEME.muted }} /></InputAdornment> }}
        />
        </>
      )}

      {drillGradeId && !selectedClassId && (
        <>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Box>
            <BackButton label="Back to Grades" onClick={() => setDrillGradeId(null)} />
            <Typography variant="h6" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em' }}>
              {grades.find((g) => g.id === drillGradeId)?.name ?? 'Grade'} — Divisions
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenAddSection(drillGradeId)}
            sx={{ backgroundColor: THEME.primary, borderRadius: 0, textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#1e40af' } }}
          >
            Add Division
          </Button>
        </Box>
        <TextField
          fullWidth
          size="small"
          placeholder="Search divisions..."
          value={divisionSearch}
          onChange={(e) => setDivisionSearch(e.target.value)}
          sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}`, maxWidth: 360 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: THEME.muted }} /></InputAdornment> }}
        />
        </>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress sx={{ color: THEME.primary }} />
        </Box>
      ) : (
        <>
          {!drillGradeId && !selectedClassId && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)', md: 'repeat(6, 1fr)' }, gap: 1.5, mb: 4 }}>
              {filteredGrades.length === 0 && (
                <Typography variant="body2" sx={{ color: THEME.muted, gridColumn: '1 / -1' }}>
                  {grades.length === 0 ? 'No grades yet. Add one to get started.' : 'No grades match your search.'}
                </Typography>
              )}
              {filteredGrades.map((g) => {
                const divisionCount = classes.filter((c) => c.gradeId === g.id).length
                return (
                  <Card
                    key={g.id}
                    elevation={0}
                    onClick={() => handleGradeCardClick(g.id)}
                    sx={{
                      border: `1px solid ${THEME.primaryBorder}`,
                      borderRadius: 0,
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      '&:hover': { borderColor: THEME.primary },
                    }}
                  >
                    <CardContent sx={{ py: 1.5, px: 1.5, textAlign: 'center', position: 'relative', '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.25, mb: 0.5 }}>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenEditGrade(g) }}>
                          <Edit fontSize="inherit" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDeleteGrade(g.id) }}>
                          <Delete fontSize="inherit" />
                        </IconButton>
                      </Box>
                      <Typography variant="body2" fontWeight="700" sx={{ color: THEME.primary }}>
                        {g.name}
                      </Typography>
                      {divisionCount > 0 && (
                        <Typography variant="caption" sx={{ color: THEME.muted }}>
                          {divisionCount} division{divisionCount === 1 ? '' : 's'}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </Box>
          )}

          {drillGradeId && !selectedClassId && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)', md: 'repeat(6, 1fr)' }, gap: 1.5, mb: 4 }}>
              {filteredDivisions.length === 0 && (
                <Typography variant="body2" sx={{ color: THEME.muted, gridColumn: '1 / -1' }}>
                  {classes.filter((c) => c.gradeId === drillGradeId).length === 0
                    ? 'No divisions yet for this grade. Add one to get started.'
                    : 'No divisions match your search.'}
                </Typography>
              )}
              {filteredDivisions
                .map((c) => (
                  <Card
                    key={c.id}
                    elevation={0}
                    onClick={() => setSelectedClassId(c.id)}
                    sx={{
                      border: `1px solid ${THEME.primaryBorder}`,
                      borderRadius: 0,
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      '&:hover': { borderColor: THEME.primary },
                    }}
                  >
                    <CardContent sx={{ py: 1.5, px: 1.5, textAlign: 'center', '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.25, mb: 0.5 }}>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenEditSection(c) }}>
                          <Edit fontSize="inherit" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDeleteSection(c.id) }}>
                          <Delete fontSize="inherit" />
                        </IconButton>
                      </Box>
                      <Typography variant="body2" fontWeight="700" sx={{ color: THEME.primary }}>
                        {c.fullName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: THEME.muted }}>
                        {c.classTeacherName || 'No class teacher'}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
            </Box>
          )}

          {selectedClassId && (
            detailsLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress sx={{ color: THEME.primary }} />
              </Box>
            ) : details ? (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                  <BackButton label={drillGradeId ? 'Back to Divisions' : 'Back to Grades'} onClick={() => setSelectedClassId(null)} />
                  {!drillGradeId && (
                    <Button
                      size="small"
                      onClick={() => {
                        const gradeId = classes.find((c) => c.id === selectedClassId)?.gradeId
                        if (gradeId) {
                          setSelectedClassId(null)
                          setDrillGradeId(gradeId)
                        }
                      }}
                      sx={{ textTransform: 'none', color: THEME.primary, mb: 2 }}
                    >
                      Split this grade into multiple divisions
                    </Button>
                  )}
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2.5, mb: 3 }}>
                  <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
                    <CardContent sx={{ py: 2.5, px: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: 48, height: 48, backgroundColor: THEME.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.primary }}>
                        <SchoolIcon />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark }}>{details.classInfo.fullName}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ color: THEME.muted }}>{details.classInfo.classTeacherName || 'No class teacher assigned'}</Typography>
                          <IconButton size="small" title="Assign class teacher" onClick={handleOpenAssignTeacher} sx={{ p: 0.25 }}>
                            <Edit fontSize="inherit" sx={{ fontSize: 14, color: THEME.primary }} />
                          </IconButton>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                  <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
                    <CardContent sx={{ py: 2.5, px: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: 48, height: 48, backgroundColor: THEME.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
                        <GroupsIcon />
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark }}>{details.studentCount}</Typography>
                        <Typography variant="caption" sx={{ color: THEME.muted }}>Students in class</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, mb: 3 }}>
                  {(
                    [
                      { value: 'students', label: 'Students in Class', icon: <GroupsIcon /> },
                      { value: 'subjects', label: 'Subjects & Teachers', icon: <ClassIcon /> },
                      { value: 'marks', label: 'Student Marks', icon: <GradeIcon /> },
                    ] as const
                  ).map((s) => {
                    const active = detailSection === s.value
                    return (
                      <Card
                        key={s.value}
                        elevation={0}
                        onClick={() => setDetailSection(s.value)}
                        sx={{
                          cursor: 'pointer',
                          border: `1px solid ${active ? THEME.primary : THEME.primaryBorder}`,
                          borderRadius: 0,
                          bgcolor: active ? THEME.primaryLight : 'transparent',
                          transition: 'background-color 0.15s ease',
                          '&:hover': { bgcolor: THEME.primaryLight },
                        }}
                      >
                        <CardContent sx={{ py: 1.5, px: 1.5, textAlign: 'center', '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ color: THEME.primary, display: 'flex', justifyContent: 'center', mb: 0.5 }}>{s.icon}</Box>
                          <Typography variant="body2" fontWeight="600" sx={{ color: THEME.textDark }}>{s.label}</Typography>
                        </CardContent>
                      </Card>
                    )
                  })}
                </Box>

                {detailSection === 'students' && (
                <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
                  <CardContent sx={{ py: 2.5, px: 2.5 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
                        Students in Class
                      </Typography>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Add />}
                        onClick={() => { setAddStudentId(''); setAddStudentDialogOpen(true) }}
                        sx={{ backgroundColor: THEME.primary, borderRadius: 0, textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#1e40af' } }}
                      >
                        Add Student
                      </Button>
                    </Box>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Search students..."
                      value={detailSearch}
                      onChange={(e) => setDetailSearch(e.target.value)}
                      sx={{ mb: 2, maxWidth: 360 }}
                      InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: THEME.muted }} /></InputAdornment> }}
                    />
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: THEME.primaryLight }}>
                            <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredStudents.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} align="center" sx={{ py: 3, color: THEME.muted }}>
                                {details.students.length === 0 ? 'No students in this division yet.' : 'No students match your search.'}
                              </TableCell>
                            </TableRow>
                          )}
                          {pagedStudents.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell>{s.name}</TableCell>
                              <TableCell sx={{ color: THEME.muted }}>{s.email}</TableCell>
                              <TableCell align="right">
                                <IconButton size="small" color="error" title="Remove from class" onClick={() => handleRemoveStudent(s.id)}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    {filteredStudents.length > 0 && (
                      <TablePagination
                        component="div"
                        count={filteredStudents.length}
                        page={studentsPage}
                        onPageChange={handleStudentsChangePage}
                        rowsPerPage={studentsRowsPerPage}
                        onRowsPerPageChange={handleStudentsChangeRowsPerPage}
                        rowsPerPageOptions={[10, 25, 50]}
                      />
                    )}
                  </CardContent>
                </Card>
                )}

                {detailSection === 'subjects' && (
                <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
                  <CardContent sx={{ py: 2.5, px: 2.5 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
                        Subjects & Teachers
                      </Typography>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Add />}
                        onClick={() => { setAddSubjectId(''); setAddSubjectTeacherId(''); setAddSubjectDialogOpen(true) }}
                        sx={{ backgroundColor: THEME.primary, borderRadius: 0, textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#1e40af' } }}
                      >
                        Add Subject
                      </Button>
                    </Box>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Search subjects or teachers..."
                      value={detailSearch}
                      onChange={(e) => setDetailSearch(e.target.value)}
                      sx={{ mb: 2, maxWidth: 360 }}
                      InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: THEME.muted }} /></InputAdornment> }}
                    />
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: THEME.primaryLight }}>
                            <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Teacher(s)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredSubjects.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={2} align="center" sx={{ py: 3, color: THEME.muted }}>
                                {details.subjectsWithTeachers.length === 0 ? 'No subjects recorded for this class yet.' : 'No subjects match your search.'}
                              </TableCell>
                            </TableRow>
                          )}
                          {filteredSubjects.map((s) => (
                            <TableRow key={s.subjectId}>
                              <TableCell>{s.subjectName}</TableCell>
                              <TableCell>
                                {s.teachers.length === 0 ? (
                                  <Typography variant="body2" sx={{ color: THEME.muted }}>Unassigned</Typography>
                                ) : (
                                  s.teachers.map((t) => (
                                    <Chip key={t} label={t} size="small" sx={{ mr: 0.5, mb: 0.5, borderRadius: 0, bgcolor: THEME.primaryLight, color: THEME.primary }} />
                                  ))
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
                )}

                {detailSection === 'marks' && (
                <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
                  <CardContent sx={{ py: 2.5, px: 2.5 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <GradeIcon sx={{ color: THEME.primary, fontSize: 22 }} />
                        <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
                          Student Marks
                        </Typography>
                      </Box>
                      <Box display="flex" gap={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<ReportIcon />}
                          disabled={details.students.length === 0}
                          onClick={() => {
                            setReportStudentId('')
                            setReportSubjectIds((details.subjectsWithTeachers ?? []).map((s) => s.subjectId))
                            setReportExamTypes([...EXAM_TYPES])
                            setReportDialogOpen(true)
                          }}
                          sx={{ borderColor: THEME.primaryBorder, color: THEME.primary, borderRadius: 0, textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: THEME.primary, backgroundColor: THEME.primaryLight } }}
                        >
                          Generate Report
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Add />}
                          disabled={details.students.length === 0}
                          onClick={() => {
                            setMarksForm({ student_id: '', subject_id: '', exam_type: 'Assignment', marks: 0, note: '' })
                            setOpenMarksDialog(true)
                          }}
                          sx={{ backgroundColor: THEME.primary, borderRadius: 0, textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#1e40af' } }}
                        >
                          Add / Edit Marks
                        </Button>
                      </Box>
                    </Box>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Search by student, subject, exam type or note..."
                      value={detailSearch}
                      onChange={(e) => setDetailSearch(e.target.value)}
                      sx={{ mb: 2, maxWidth: 360 }}
                      InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: THEME.muted }} /></InputAdornment> }}
                    />
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: THEME.primaryLight }}>
                            <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Exam Type</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Marks</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Note</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredMarks.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} align="center" sx={{ py: 3, color: THEME.muted }}>
                                {details.marks.length === 0 ? 'No marks recorded for this class yet.' : 'No marks match your search.'}
                              </TableCell>
                            </TableRow>
                          )}
                          {pagedMarks.map((m) => (
                            <TableRow key={m.id}>
                              <TableCell>{m.studentName}</TableCell>
                              <TableCell>{m.subjectName}</TableCell>
                              <TableCell>{m.examType}</TableCell>
                              <TableCell>{m.marks}</TableCell>
                              <TableCell sx={{ color: THEME.muted }}>{m.note || '—'}</TableCell>
                              <TableCell align="right">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setMarksForm({
                                      student_id: m.studentId,
                                      subject_id: m.subjectId,
                                      exam_type: m.examType,
                                      marks: m.marks,
                                      note: m.note ?? '',
                                    })
                                    setOpenMarksDialog(true)
                                  }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    {filteredMarks.length > 0 && (
                      <TablePagination
                        component="div"
                        count={filteredMarks.length}
                        page={marksPage}
                        onPageChange={handleMarksChangePage}
                        rowsPerPage={marksRowsPerPage}
                        onRowsPerPageChange={handleMarksChangeRowsPerPage}
                        rowsPerPageOptions={[10, 25, 50]}
                      />
                    )}
                  </CardContent>
                </Card>
                )}
              </>
            ) : null
          )}
        </>
      )}
      </>
      )}

      <Dialog open={addStudentDialogOpen} onClose={() => setAddStudentDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add Student to Class</DialogTitle>
        <DialogContent>
          <Autocomplete
            sx={{ mt: 1 }}
            options={allStudents.filter((s) => !(details?.students ?? []).some((d) => d.id === String(s.id)))}
            getOptionLabel={(s) => `${s.name} (${s.email})`}
            value={allStudents.find((s) => String(s.id) === addStudentId) || null}
            onChange={(_, val) => setAddStudentId(val ? String(val.id) : '')}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            renderInput={(params) => <TextField {...params} label="Student" placeholder="Search by name or email" />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddStudentDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            disabled={addStudentSaving || !addStudentId}
            onClick={handleAddStudent}
            sx={{ backgroundColor: THEME.primary, textTransform: 'none', '&:hover': { backgroundColor: '#1e40af' } }}
          >
            {addStudentSaving ? 'Adding...' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addSubjectDialogOpen} onClose={() => setAddSubjectDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add Subject to Class</DialogTitle>
        <DialogContent>
          <Box display="grid" gap={2.5} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Subject</InputLabel>
              <Select value={addSubjectId} label="Subject" onChange={(e) => setAddSubjectId(e.target.value)}>
                {subjects
                  .filter((s) => !(details?.subjectsWithTeachers ?? []).some((d) => d.subjectId === s._id))
                  .map((s) => (
                    <MenuItem key={s._id} value={s._id}>{s.subject_name}</MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Teacher (optional)</InputLabel>
              <Select value={addSubjectTeacherId} label="Teacher (optional)" onChange={(e) => setAddSubjectTeacherId(e.target.value)}>
                <MenuItem value="">None</MenuItem>
                {teachers.map((t) => (
                  <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddSubjectDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            disabled={addSubjectSaving || !addSubjectId}
            onClick={handleAddSubject}
            sx={{ backgroundColor: THEME.primary, textTransform: 'none', '&:hover': { backgroundColor: '#1e40af' } }}
          >
            {addSubjectSaving ? 'Adding...' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={assignTeacherOpen} onClose={() => setAssignTeacherOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Assign Class Teacher</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Class teacher</InputLabel>
            <Select value={assignTeacherId} label="Class teacher" onChange={(e) => setAssignTeacherId(e.target.value)}>
              <MenuItem value="">None</MenuItem>
              {teachers.map((t) => (
                <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignTeacherOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            disabled={assignTeacherSaving}
            onClick={handleAssignTeacher}
            sx={{ backgroundColor: THEME.primary, textTransform: 'none', '&:hover': { backgroundColor: '#1e40af' } }}
          >
            {assignTeacherSaving ? 'Saving...' : 'Save'}
          </Button>
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
        open={!!confirmAction}
        title={confirmAction ? confirmActionMessages[confirmAction.type].title : ''}
        message={confirmAction ? confirmActionMessages[confirmAction.type].message : ''}
        confirmLabel={confirmAction?.type === 'student' ? 'Remove' : 'Delete'}
        tone="danger"
        loading={confirmActionLoading}
        onConfirm={runConfirmedAction}
        onCancel={() => setConfirmAction(null)}
      />
    </Box>
  )
}

export default ClassDetails
