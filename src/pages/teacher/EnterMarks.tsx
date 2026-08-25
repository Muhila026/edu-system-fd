import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  CircularProgress,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { Grade as GradeIcon, Search as SearchIcon, Save as SaveIcon } from '@mui/icons-material'
import CenteredMessage from '../../components/CenteredMessage'
import {
  getTeacherMyClass,
  getTeacherMySubjects,
  getAttendanceStudentList,
  getSchemaStudentSubjects,
  getSchemaStudentSubjectMarks,
  createOrUpdateSchemaStudentSubjectMarks,
  getClassDetails,
  EXAM_TYPES,
  type StudentListItem,
  type SchemaStudentSubject,
  type SchemaStudentSubjectMarks,
  type ExamType,
  type TeacherMyClass,
} from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

type SubjectOption = { subject_id: string; subject_name: string }

const cellKey = (studentId: number, examType: ExamType) => `${studentId}:${examType}`

const EnterMarks: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [isClassTeacher, setIsClassTeacher] = useState(false)
  const [myClasses, setMyClasses] = useState<TeacherMyClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [classStudentIds, setClassStudentIds] = useState<Set<number>>(new Set())

  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [roster, setRoster] = useState<StudentListItem[]>([])
  const [studentSubjectLinks, setStudentSubjectLinks] = useState<SchemaStudentSubject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState('')

  const [marksRows, setMarksRows] = useState<SchemaStudentSubjectMarks[]>([])
  const [marksLoading, setMarksLoading] = useState(false)
  const [search, setSearch] = useState('')

  const [edits, setEdits] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })

  const loadSubjectsForClass = async (classId: string) => {
    const details = await getClassDetails(classId)
    if (!details) {
      setClassStudentIds(new Set())
      setSubjects([])
      setSelectedSubjectId('')
      return
    }
    setClassStudentIds(new Set(details.students.map((s) => Number(s.id))))
    const subjList = details.subjectsWithTeachers.map((s) => ({ subject_id: s.subjectId, subject_name: s.subjectName }))
    setSubjects(subjList)
    setSelectedSubjectId(subjList.length > 0 ? subjList[0].subject_id : '')
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [myClassesRes, rosterRes, linksRes] = await Promise.all([
          getTeacherMyClass(),
          getAttendanceStudentList(),
          getSchemaStudentSubjects(),
        ])
        setRoster(rosterRes)
        setStudentSubjectLinks(linksRes)
        setMyClasses(myClassesRes)

        if (myClassesRes.length > 0) {
          setIsClassTeacher(true)
          const classId = myClassesRes[0].id
          setSelectedClassId(classId)
          await loadSubjectsForClass(classId)
        } else {
          const subjectsRes = await getTeacherMySubjects()
          const subjList = subjectsRes.map((s) => ({ subject_id: s.subject_id, subject_name: s.subject_name }))
          setSubjects(subjList)
          if (subjList.length > 0) setSelectedSubjectId(subjList[0].subject_id)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleClassChange = async (classId: string) => {
    setSelectedClassId(classId)
    setLoading(true)
    try {
      await loadSubjectsForClass(classId)
    } finally {
      setLoading(false)
    }
  }

  const loadMarks = async (subjectId: string) => {
    setMarksLoading(true)
    try {
      setMarksRows(await getSchemaStudentSubjectMarks(undefined, subjectId))
    } finally {
      setMarksLoading(false)
    }
  }

  useEffect(() => {
    setSearch('')
    setEdits({})
    if (!selectedSubjectId) {
      setMarksRows([])
      return
    }
    loadMarks(selectedSubjectId)
  }, [selectedSubjectId])

  const studentsInSubject = roster
    .filter(
      (r) =>
        studentSubjectLinks.some((l) => l.subject_id === selectedSubjectId && Number(l.student_id) === r.student_id) &&
        (!isClassTeacher || classStudentIds.has(r.student_id))
    )
    .filter((r) => !search.trim() || r.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  const marksByKey = new Map(marksRows.map((m) => [cellKey(Number(m.student_id), m.exam_type), m]))

  const cellValue = (studentId: number, examType: ExamType): string => {
    const key = cellKey(studentId, examType)
    if (key in edits) return edits[key]
    return String(marksByKey.get(key)?.marks ?? '')
  }

  const handleCellChange = (studentId: number, examType: ExamType, value: string) => {
    setEdits((prev) => ({ ...prev, [cellKey(studentId, examType)]: value }))
  }

  const editedCount = Object.keys(edits).length

  const handleSaveAll = async () => {
    const keys = Object.keys(edits)
    if (keys.length === 0) return
    setSaving(true)
    try {
      await Promise.all(
        keys.map((key) => {
          const [studentId, examType] = key.split(':')
          return createOrUpdateSchemaStudentSubjectMarks({
            student_id: studentId,
            subject_id: selectedSubjectId,
            exam_type: examType as ExamType,
            marks: parseFloat(edits[key]) || 0,
          })
        })
      )
      setEdits({})
      await loadMarks(selectedSubjectId)
      setSnackbar({ open: true, message: `Saved marks for ${keys.length} cell${keys.length === 1 ? '' : 's'}`, severity: 'success' })
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to save marks', severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="320px">
        <CircularProgress sx={{ color: THEME.primary }} />
      </Box>
    )
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          Enter Marks
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          {isClassTeacher
            ? 'You are the class teacher — enter or edit marks for every subject in your class.'
            : 'Add or update exam marks for the subjects you teach.'}
        </Typography>
      </Box>

      {subjects.length === 0 ? (
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, backgroundColor: '#fff' }}>
          <CardContent sx={{ py: 5, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: THEME.muted }}>
              {isClassTeacher
                ? 'No subjects have been assigned to your class yet. Contact admin to get subjects assigned.'
                : 'You are not assigned to teach any subjects yet. Contact admin to get subjects assigned.'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, backgroundColor: '#fff' }}>
          <CardContent sx={{ py: 2.5, px: 2.5 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <GradeIcon sx={{ color: THEME.primary, fontSize: 22 }} />
                <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>Marks</Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={<SaveIcon />}
                disabled={editedCount === 0 || saving}
                onClick={handleSaveAll}
                sx={{ backgroundColor: THEME.primary, borderRadius: 0, textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#1e40af' } }}
              >
                {saving ? 'Saving...' : editedCount > 0 ? `Save ${editedCount} change${editedCount === 1 ? '' : 's'}` : 'Save changes'}
              </Button>
            </Box>

            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2} mb={2}>
              {isClassTeacher && myClasses.length > 1 && (
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Class</InputLabel>
                  <Select value={selectedClassId} label="Class" onChange={(e) => handleClassChange(e.target.value)}>
                    {myClasses.map((c) => (
                      <MenuItem key={c.id} value={c.id}>{c.fullName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Subject</InputLabel>
                <Select value={selectedSubjectId} label="Subject" onChange={(e) => setSelectedSubjectId(e.target.value)}>
                  {subjects.map((s) => (
                    <MenuItem key={s.subject_id} value={s.subject_id}>{s.subject_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small"
                placeholder="Search by student name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ flex: 1, minWidth: 220 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: THEME.muted }} /></InputAdornment> }}
              />
            </Box>

            {marksLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress sx={{ color: THEME.primary }} />
              </Box>
            ) : studentsInSubject.length === 0 ? (
              <Typography variant="body2" sx={{ color: THEME.muted, py: 2 }}>
                No students match this subject{search.trim() ? ' and search' : ''}.
              </Typography>
            ) : (
              <TableContainer sx={{ maxHeight: 560, border: `1px solid ${THEME.primaryBorder}` }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, bgcolor: THEME.primaryLight, minWidth: 180 }}>Student</TableCell>
                      {EXAM_TYPES.map((t) => (
                        <TableCell key={t} align="center" sx={{ fontWeight: 600, bgcolor: THEME.primaryLight, minWidth: 110 }}>{t}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {studentsInSubject.map((s) => (
                      <TableRow key={s.student_id} hover>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark, whiteSpace: 'nowrap' }}>{s.name}</TableCell>
                        {EXAM_TYPES.map((examType) => {
                          const key = cellKey(s.student_id, examType)
                          const isEdited = key in edits
                          return (
                            <TableCell key={examType} align="center" sx={{ p: 0.5 }}>
                              <TextField
                                size="small"
                                type="number"
                                value={cellValue(s.student_id, examType)}
                                onChange={(e) => handleCellChange(s.student_id, examType, e.target.value)}
                                sx={{
                                  width: 90,
                                  '& .MuiOutlinedInput-root': {
                                    bgcolor: isEdited ? '#fef9c3' : 'transparent',
                                  },
                                  '& input': { textAlign: 'center', py: 0.75 },
                                }}
                              />
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

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

export default EnterMarks
