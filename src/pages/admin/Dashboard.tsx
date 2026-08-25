import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
} from '@mui/material'
import {
  Groups as GroupsIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Subject as SubjectIcon,
  Payments as PaymentsIcon,
  Settings as SettingsIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  ShowChart,
  Class as ClassIcon,
} from '@mui/icons-material'
import { LineChart } from '@mui/x-charts/LineChart'
import { motion } from 'framer-motion'
import { getAdminDashboard, type AdminDashboardData } from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

interface AdminDashboardProps {
  onSelectPage?: (page: string) => void
}

const shortcutItems = [
  { label: 'User Management', page: 'User Management', icon: <PersonIcon />, color: '#1e3a8a' },
  { label: 'Subjects', page: 'Subjects', icon: <SubjectIcon />, color: '#0d9488' },
  { label: 'Class Details', page: 'Class Details', icon: <ClassIcon />, color: '#b45309' },
  { label: 'Payments', page: 'Payments', icon: <PaymentsIcon />, color: '#7c3aed' },
  { label: 'Profile', page: 'Profile', icon: <SettingsIcon />, color: '#6b7280' },
]

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onSelectPage }) => {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null)

  useEffect(() => {
    getAdminDashboard().then(setDashboard).catch(() => setDashboard(null))
  }, [])

  const counts = dashboard?.counts ?? { totalUsers: 0, students: 0, teachers: 0, other: 0 }

  const countCards = [
    { title: 'Total Users', value: counts.totalUsers, icon: <GroupsIcon />, color: '#1e3a8a' },
    { title: 'Students', value: counts.students, icon: <SchoolIcon />, color: '#15803d' },
    { title: 'Teachers', value: counts.teachers, icon: <PersonIcon />, color: '#1e40af' },
    { title: 'Other', value: counts.other, icon: <AdminPanelSettingsIcon />, color: '#991b1b' },
  ]

  const paymentSeries = dashboard?.paymentSeries ?? []
  const chartDates = paymentSeries.map((p) => p.date.slice(5)) // MM-DD
  const chartTotals = paymentSeries.map((p) => p.total)

  return (
    <Box sx={{ fontFamily: "'Roboto', sans-serif" }}>
      {/* Header */}
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
          Admin Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          System overview and platform analytics
        </Typography>
      </Box>

      {/* Shortcuts */}
      {onSelectPage && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle2" fontWeight="600" sx={{ color: THEME.muted, mb: 1.5 }}>
            Shortcuts
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
              gap: 1.5,
            }}
          >
            {shortcutItems.map((item, index) => (
              <motion.div
                key={item.page}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 + index * 0.04 }}
              >
                <Card
                  elevation={0}
                  onClick={() => onSelectPage(item.page)}
                  sx={{
                    border: `1px solid ${THEME.primaryBorder}`,
                    borderRadius: 0,
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      borderColor: item.color,
                      boxShadow: `0 2px 8px ${item.color}20`,
                    },
                  }}
                >
                  <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 0,
                        backgroundColor: THEME.primaryLight,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: item.color,
                        mb: 1,
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Typography variant="caption" fontWeight="600" sx={{ color: THEME.textDark }}>
                      {item.label}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </Box>
        </Box>
      )}

      {/* Count Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 4,
        }}
      >
        {countCards.map((stat, index) => (
          <motion.div
            key={stat.title}
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
                      color: stat.color,
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </Box>

      {/* Payment Analysis */}
      <Card
        elevation={0}
        sx={{
          border: `1px solid ${THEME.primaryBorder}`,
          borderRadius: 0,
          backgroundColor: '#fff',
          mb: 4,
        }}
      >
        <CardContent sx={{ py: 2.5, px: 2.5 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <ShowChart sx={{ color: THEME.primary, fontSize: 22 }} />
              <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
                Payment Analysis
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: THEME.muted }}>
              Last 30 days &middot; Today: Rs. {(dashboard?.todayCollection ?? 0).toLocaleString()}
            </Typography>
          </Box>
          {paymentSeries.length === 0 ? (
            <Typography variant="body2" sx={{ color: THEME.muted, py: 4, textAlign: 'center' }}>
              No payment data yet for this period.
            </Typography>
          ) : (
            <LineChart
              height={260}
              series={[{ data: chartTotals, label: 'Collected (Rs.)', color: THEME.primary, curve: 'monotoneX', valueFormatter: (v) => (v == null ? '' : `Rs. ${v.toLocaleString()}`) }]}
              xAxis={[{ data: chartDates, scaleType: 'point' }]}
              yAxis={[{ valueFormatter: (v: number) => v.toLocaleString() }]}
              margin={{ left: 80, right: 20, top: 20, bottom: 30 }}
              grid={{ horizontal: true }}
            />
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default AdminDashboard
