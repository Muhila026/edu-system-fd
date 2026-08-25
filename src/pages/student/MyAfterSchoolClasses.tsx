import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  CircularProgress,
} from '@mui/material'
import { School as SchoolIcon, CheckCircle } from '@mui/icons-material'
import CenteredMessage from '../../components/CenteredMessage'
import {
  getAfterSchoolClasses,
  getMyClassEnrollments,
  enrollInAfterSchoolClass,
  type AfterSchoolClass,
  type ClassEnrollment,
} from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const enrollmentColor = (status: ClassEnrollment['status']) => {
  switch (status) {
    case 'Active':
      return { bg: '#dcfce7', color: '#15803d' }
    case 'Completed':
      return { bg: '#dbeafe', color: '#1e40af' }
    default:
      return { bg: '#fef3c7', color: '#92400e' }
  }
}

const MyAfterSchoolClasses: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<AfterSchoolClass[]>([])
  const [enrollments, setEnrollments] = useState<ClassEnrollment[]>([])
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })

  const loadAll = async () => {
    setLoading(true)
    const [c, e] = await Promise.all([getAfterSchoolClasses(), getMyClassEnrollments()])
    setClasses(c)
    setEnrollments(e)
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  const enrollmentFor = (classId: string) => enrollments.find((e) => e.classId === classId)

  const handleEnroll = async (classId: string) => {
    setEnrolling(classId)
    try {
      setEnrollments(await enrollInAfterSchoolClass(classId))
      setSnackbar({ open: true, message: 'Enrollment request submitted. Admission fee applies — see Payment History.', severity: 'success' })
    } catch (e: any) {
      setSnackbar({ open: true, message: e.message || 'Failed to enroll', severity: 'error' })
    } finally {
      setEnrolling(null)
    }
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          After-School Classes
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Special after-school classes available for O/L and A/L students
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress sx={{ color: THEME.primary }} />
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          {classes.map((c) => {
            const enrollment = enrollmentFor(c.id)
            return (
              <Card key={c.id} elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
                <CardContent sx={{ py: 2.5, px: 2.5 }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: 0, backgroundColor: THEME.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.primary, mb: 1.5 }}>
                    <SchoolIcon />
                  </Box>
                  <Typography variant="h6" fontWeight="700" sx={{ color: THEME.textDark, mb: 0.5 }}>{c.name}</Typography>
                  {c.description && <Typography variant="body2" sx={{ color: THEME.muted, mb: 1 }}>{c.description}</Typography>}
                  {c.schedule && <Typography variant="caption" sx={{ color: THEME.muted, display: 'block', mb: 1 }}>Schedule: {c.schedule}</Typography>}
                  <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                    <Chip size="small" label={c.level} sx={{ borderRadius: 0, bgcolor: THEME.primaryLight, color: THEME.primary }} />
                    <Chip size="small" label={`Rs. ${c.admissionFee.toLocaleString()} admission`} sx={{ borderRadius: 0, bgcolor: '#f3f4f6', color: THEME.textDark }} />
                  </Box>
                  {enrollment ? (
                    <Chip
                      icon={<CheckCircle sx={{ fontSize: 16 }} />}
                      label={`Enrolled — ${enrollment.status}`}
                      size="small"
                      sx={{ borderRadius: 0, bgcolor: enrollmentColor(enrollment.status).bg, color: enrollmentColor(enrollment.status).color }}
                    />
                  ) : (
                    <Button
                      variant="contained"
                      size="small"
                      disabled={enrolling === c.id}
                      onClick={() => handleEnroll(c.id)}
                      sx={{ backgroundColor: THEME.primary, borderRadius: 0, textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#1e40af' } }}
                    >
                      {enrolling === c.id ? 'Enrolling...' : 'Enroll'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </Box>
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

export default MyAfterSchoolClasses
