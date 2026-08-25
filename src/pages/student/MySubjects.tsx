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
  Chip,
  CircularProgress,
} from '@mui/material'
import { MenuBook as MenuBookIcon, Person as PersonIcon } from '@mui/icons-material'
import {
  getCurrentUser,
  getSchemaStudentSubjects,
  getSchemaSubjects,
  getSchemaTeacherSubjects,
  getSchemaStudentSubjectMarks,
  type SchemaSubject,
  type SchemaStudentSubjectMarks,
} from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

type SubjectRow = {
  subject_id: string
  subject_name: string
  teacher_name: string
  marks: SchemaStudentSubjectMarks[]
}

const MySubjects: React.FC = () => {
  const [rows, setRows] = useState<SubjectRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const studentId = getCurrentUser().id
      const [enrollments, subjects, teacherSubjects, marks] = await Promise.all([
        getSchemaStudentSubjects(studentId),
        getSchemaSubjects(),
        getSchemaTeacherSubjects(),
        getSchemaStudentSubjectMarks(studentId),
      ])

      const subjectById = new Map<string, SchemaSubject>(subjects.map((s) => [s._id, s]))
      const teacherBySubject = new Map<string, string>()
      teacherSubjects.forEach((ts) => {
        if (ts.teacher_name && !teacherBySubject.has(ts.subject_id)) {
          teacherBySubject.set(ts.subject_id, ts.teacher_name)
        }
      })

      const list: SubjectRow[] = enrollments.map((e) => ({
        subject_id: e.subject_id,
        subject_name: subjectById.get(e.subject_id)?.subject_name || e.subject_id,
        teacher_name: teacherBySubject.get(e.subject_id) || '',
        marks: marks.filter((m) => m.subject_id === e.subject_id),
      }))

      setRows(list)
    } catch (error) {
      console.error('Error loading my subjects:', error)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          My Subjects
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Your enrolled subjects, subject teachers and marks
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress sx={{ color: THEME.primary }} />
        </Box>
      ) : rows.length === 0 ? (
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, backgroundColor: '#fff' }}>
          <CardContent sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: THEME.muted }}>
              No subjects enrolled yet. Ask admin to assign you subjects.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {rows.map((row) => (
            <Card
              key={row.subject_id}
              elevation={0}
              sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, backgroundColor: '#fff' }}
            >
              <CardContent sx={{ py: 2.5, px: 2.5 }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  flexWrap="wrap"
                  gap={1.5}
                  mb={2}
                >
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 0,
                        backgroundColor: THEME.primaryLight,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: THEME.primary,
                      }}
                    >
                      <MenuBookIcon />
                    </Box>
                    <Typography variant="h6" fontWeight="700" sx={{ color: THEME.textDark }}>
                      {row.subject_name}
                    </Typography>
                  </Box>
                  <Chip
                    icon={<PersonIcon sx={{ fontSize: 16 }} />}
                    label={row.teacher_name ? `Teacher: ${row.teacher_name}` : 'Teacher not assigned yet'}
                    size="small"
                    sx={{
                      borderRadius: 0,
                      bgcolor: row.teacher_name ? THEME.primaryLight : '#f3f4f6',
                      color: row.teacher_name ? THEME.primary : THEME.muted,
                      fontWeight: 600,
                    }}
                  />
                </Box>

                {row.marks.length === 0 ? (
                  <Typography variant="body2" sx={{ color: THEME.muted }}>
                    No marks recorded yet for this subject.
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ borderBottom: `2px solid ${THEME.primaryBorder}` }}>
                          <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1 }}>Exam Type</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1 }}>Marks</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1 }}>Note</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {row.marks.map((m) => (
                          <TableRow key={m._id} sx={{ '&:last-child td': { borderBottom: 'none' } }}>
                            <TableCell sx={{ py: 1 }}>{m.exam_type}</TableCell>
                            <TableCell sx={{ py: 1, fontWeight: 600, color: THEME.textDark }}>{m.marks}</TableCell>
                            <TableCell sx={{ py: 1, color: THEME.muted }}>{m.note || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  )
}

export default MySubjects
