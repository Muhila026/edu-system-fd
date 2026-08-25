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
  TablePagination,
  TextField,
  InputAdornment,
  CircularProgress,
  Chip,
} from '@mui/material'
import { School as SchoolIcon, Groups as GroupsIcon, Class as ClassIcon, Search as SearchIcon } from '@mui/icons-material'
import BackButton from '../../components/BackButton'
import { getTeacherMyClass, getClassDetails, type TeacherMyClass, type ClassDetails } from '../../lib/api'
import { usePagination } from '../../hooks/usePagination'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const MyClass: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<TeacherMyClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [details, setDetails] = useState<ClassDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [section, setSection] = useState<'students' | 'subjects'>('students')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const list = await getTeacherMyClass()
        setClasses(list)
        if (list.length === 1) setSelectedClassId(list[0].id)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedClassId) {
      setDetails(null)
      return
    }
    setSection('students')
    setSearch('')
    const load = async () => {
      setDetailsLoading(true)
      try {
        setDetails(await getClassDetails(selectedClassId))
      } finally {
        setDetailsLoading(false)
      }
    }
    load()
  }, [selectedClassId])

  const query = search.trim().toLowerCase()
  const filteredStudents = (details?.students ?? []).filter(
    (s) => !query || s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query)
  )
  const filteredSubjects = (details?.subjectsWithTeachers ?? []).filter(
    (s) => !query || s.subjectName.toLowerCase().includes(query) || s.teachers.some((t) => t.toLowerCase().includes(query))
  )
  const { page, rowsPerPage, pageItems: pagedStudents, handleChangePage, handleChangeRowsPerPage } = usePagination(filteredStudents, 10)

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
          My Class
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          The class you are the class teacher for.
        </Typography>
      </Box>

      {classes.length === 0 && (
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, backgroundColor: '#fff' }}>
          <CardContent sx={{ py: 5, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: THEME.muted }}>
              You are not currently assigned as a class teacher for any class.
            </Typography>
          </CardContent>
        </Card>
      )}

      {classes.length > 1 && !selectedClassId && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1.5 }}>
          {classes.map((c) => (
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
              <CardContent sx={{ py: 2, px: 1.5, textAlign: 'center', '&:last-child': { pb: 2 } }}>
                <Typography variant="body2" fontWeight="700" sx={{ color: THEME.primary }}>
                  {c.fullName}
                </Typography>
                <Typography variant="caption" sx={{ color: THEME.muted }}>
                  {c.studentCount} student{c.studentCount === 1 ? '' : 's'}
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
            {classes.length > 1 && <BackButton label="Back to My Classes" onClick={() => setSelectedClassId(null)} />}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2.5, mb: 3 }}>
              <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
                <CardContent sx={{ py: 2.5, px: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 48, height: 48, backgroundColor: THEME.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.primary }}>
                    <SchoolIcon />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark }}>{details.classInfo.fullName}</Typography>
                    <Typography variant="caption" sx={{ color: THEME.muted }}>You are the class teacher</Typography>
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

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr' }, gap: 1.5, mb: 3, maxWidth: 480 }}>
              {(
                [
                  { value: 'students', label: 'Students in Class', icon: <GroupsIcon /> },
                  { value: 'subjects', label: 'Subjects & Teachers', icon: <ClassIcon /> },
                ] as const
              ).map((s) => {
                const active = section === s.value
                return (
                  <Card
                    key={s.value}
                    elevation={0}
                    onClick={() => setSection(s.value)}
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

            {section === 'students' && (
              <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
                <CardContent sx={{ py: 2.5, px: 2.5 }}>
                  <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark, mb: 2 }}>
                    Students in Class
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search students..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ mb: 2, maxWidth: 360 }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: THEME.muted }} /></InputAdornment> }}
                  />
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: THEME.primaryLight }}>
                          <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredStudents.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} align="center" sx={{ py: 3, color: THEME.muted }}>
                              {details.students.length === 0 ? 'No students in this class yet.' : 'No students match your search.'}
                            </TableCell>
                          </TableRow>
                        )}
                        {pagedStudents.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell>{s.name}</TableCell>
                            <TableCell sx={{ color: THEME.muted }}>{s.email}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {filteredStudents.length > 0 && (
                    <TablePagination
                      component="div"
                      count={filteredStudents.length}
                      page={page}
                      onPageChange={handleChangePage}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={handleChangeRowsPerPage}
                      rowsPerPageOptions={[10, 25, 50]}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {section === 'subjects' && (
              <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
                <CardContent sx={{ py: 2.5, px: 2.5 }}>
                  <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark, mb: 2 }}>
                    Subjects & Teachers
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search subjects or teachers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
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
          </>
        ) : null
      )}
    </Box>
  )
}

export default MyClass
