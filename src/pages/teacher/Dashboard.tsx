import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  ButtonBase,
} from '@mui/material'
import {
  People,
  School,
  Class as ClassIcon,
  Groups,
  Grade as GradeIcon,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import {
  getTeacherMySubjects,
  getTeacherMyClass,
  getSchemaStudentSubjects,
} from '../../lib/api'
import type {
  TeacherSubjectWithName,
  TeacherMyClass,
  SchemaStudentSubject,
} from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

interface DashboardStats {
  title: string
  value: string
  change: string
}

interface DashboardData {
  stats: DashboardStats[]
}

interface TeacherDashboardProps {
  onSelectPage?: (page: string) => void
}

const statConfig = [
  { title: 'Total Students', icon: <People />, color: THEME.primary },
  /** Aligned with My Subjects: count = teacher_subjects rows (same as subject list). */
  { title: 'Subjects', icon: <School />, color: '#0d9488' },
]

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onSelectPage }) => {
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData>({ stats: [] })
  /** Classes where this teacher is the class teacher (empty if none). */
  const [myClasses, setMyClasses] = useState<TeacherMyClass[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      // Each call isolated so one failure does not throw and wipe the whole dashboard
      const [subjectsRes, myClassRes, studentSubjectsRes] = await Promise.all([
        getTeacherMySubjects().catch(() => [] as TeacherSubjectWithName[]),
        getTeacherMyClass().catch(() => [] as TeacherMyClass[]),
        getSchemaStudentSubjects().catch(() => [] as SchemaStudentSubject[]),
      ])

      const subjectsArr = Array.isArray(subjectsRes) ? subjectsRes : []
      const myClassArr = Array.isArray(myClassRes) ? myClassRes : []
      const studentSubjectsArr = Array.isArray(studentSubjectsRes) ? studentSubjectsRes : []

      // subject_id -> set of student_id (enrollment per subject from student_subjects)
      const subjectStudentMap: Record<string, Set<number>> = {}
      studentSubjectsArr.forEach((record) => {
        const subjectId = String(record.subject_id ?? '').trim()
        const studentIdNum = Number(record.student_id)
        if (!subjectId || Number.isNaN(studentIdNum)) return
        if (!subjectStudentMap[subjectId]) subjectStudentMap[subjectId] = new Set()
        subjectStudentMap[subjectId].add(studentIdNum)
      })
      // Subjects count = same as My Subjects (teacher_subjects rows)
      const subjectsCount = subjectsArr.length

      // Total students = unique students enrolled in any of the teacher's subjects
      const teacherSubjectIds = new Set(
        subjectsArr.map((s) => String(s.subject_id ?? '').trim()).filter(Boolean)
      )
      const uniqueStudentIds = new Set<number>()
      teacherSubjectIds.forEach((subjectId) => {
        const set = subjectStudentMap[subjectId]
        if (set) set.forEach((id) => uniqueStudentIds.add(id))
      })
      const totalStudentsInSubjects = uniqueStudentIds.size

      const stats: DashboardStats[] = [
        {
          title: 'Total Students',
          value: String(totalStudentsInSubjects),
          change:
            totalStudentsInSubjects > 0
              ? 'Unique students enrolled in your subjects'
              : 'No students yet — assign subjects and enrollments',
        },
        {
          title: 'Subjects',
          value: String(subjectsCount),
          change: 'Subjects assigned to you (My Subjects)',
        },
      ]

      setDashboardData({ stats })
      setMyClasses(myClassArr)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setDashboardData({
        stats: [
          { title: 'Total Students', value: '—', change: '—' },
          { title: 'Subjects', value: '—', change: '—' },
        ],
      })
      setMyClasses([])
    } finally {
      setLoading(false)
    }
  }

  const displayStats = dashboardData.stats.length > 0
    ? dashboardData.stats
    : [
        { title: 'Total Students', value: '—', change: '—' },
        { title: 'Subjects', value: '—', change: '—' },
      ]

  const handleQuickAction = (page: string) => {
    if (onSelectPage) onSelectPage(page)
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box
        sx={{
          mb: 3,
          pb: 3,
          borderBottom: `1px solid ${THEME.primaryBorder}`,
        }}
      >
        <Typography
          variant="h5"
          fontWeight="700"
          sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}
        >
          Teacher Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Overview of your classes and subjects.
        </Typography>
      </Box>

      {/* Class teacher banner — only shown when this teacher is the class teacher for one or more classes */}
      {!loading && myClasses.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <ButtonBase
            onClick={() => handleQuickAction('My Class')}
            sx={{ display: 'block', width: '100%', textAlign: 'left', mb: 3 }}
          >
            <Card
              elevation={0}
              sx={{
                border: `1px solid ${THEME.primaryBorder}`,
                borderRadius: 0,
                backgroundColor: THEME.primaryLight,
                width: '100%',
              }}
            >
              <CardContent sx={{ py: 2, px: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                <ClassIcon sx={{ color: THEME.primary }} />
                <Box>
                  <Typography variant="body2" fontWeight="700" sx={{ color: THEME.textDark }}>
                    You are the class teacher for{' '}
                    {myClasses.map((c) => c.fullName).join(', ')}
                  </Typography>
                  <Typography variant="caption" sx={{ color: THEME.muted }}>
                    View class roster and subjects — click to open My Class
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </ButtonBase>
        </motion.div>
      )}

      {/* Stats */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress sx={{ color: THEME.primary }} />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: 2.5,
            mb: 4,
          }}
        >
          {displayStats.map((stat, index) => {
            const config = statConfig[index % statConfig.length]
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <Card
                  elevation={0}
                  sx={{
                    border: `1px solid ${THEME.primaryBorder}`,
                    borderRadius: 0,
                    backgroundColor: '#fff',
                    overflow: 'hidden',
                  }}
                >
                  <CardContent sx={{ py: 2.5, px: 2.5 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ color: THEME.muted, fontWeight: 500, mb: 0.5 }}
                        >
                          {stat.title}
                        </Typography>
                        <Typography
                          variant="h4"
                          fontWeight="700"
                          sx={{ color: THEME.textDark, letterSpacing: '-0.02em' }}
                        >
                          {stat.value}
                        </Typography>
                        <Typography variant="caption" sx={{ color: THEME.muted, mt: 0.5, display: 'block' }}>
                          {stat.change}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: 0,
                          backgroundColor: THEME.primaryLight,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: config.color,
                        }}
                      >
                        {config.icon}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </Box>
      )}

      <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle2" fontWeight="600" sx={{ color: THEME.textDark, mb: 1.5 }}>
          Quick Actions
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          {myClasses.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <ButtonBase
                onClick={() => handleQuickAction('My Class')}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderRadius: 0,
                  backgroundColor: THEME.primaryLight,
                  border: `1px solid ${THEME.primaryBorder}`,
                  '&:hover': { backgroundColor: '#DBEAFE' },
                }}
              >
                <ClassIcon sx={{ color: THEME.primary, mr: 1, fontSize: 20 }} />
                <Typography variant="body2" fontWeight="600" sx={{ color: THEME.primary }}>
                  My Class
                </Typography>
              </ButtonBase>
            </motion.div>
          )}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <ButtonBase
              onClick={() => handleQuickAction('Enter Marks')}
              sx={{
                px: 2,
                py: 1.5,
                borderRadius: 0,
                backgroundColor: THEME.primaryLight,
                border: `1px solid ${THEME.primaryBorder}`,
                '&:hover': { backgroundColor: '#DBEAFE' },
              }}
            >
              <GradeIcon sx={{ color: THEME.primary, mr: 1, fontSize: 20 }} />
              <Typography variant="body2" fontWeight="600" sx={{ color: THEME.primary }}>
                Enter Marks
              </Typography>
            </ButtonBase>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <ButtonBase
              onClick={() => handleQuickAction('Manage Students')}
              sx={{
                px: 2,
                py: 1.5,
                borderRadius: 0,
                backgroundColor: THEME.primaryLight,
                border: `1px solid ${THEME.primaryBorder}`,
                '&:hover': { backgroundColor: '#DBEAFE' },
              }}
            >
              <Groups sx={{ color: THEME.primary, mr: 1, fontSize: 20 }} />
              <Typography variant="body2" fontWeight="600" sx={{ color: THEME.primary }}>
                Manage Students
              </Typography>
            </ButtonBase>
          </motion.div>
        </Box>
      </Box>
    </Box>
  )
}

export default TeacherDashboard
