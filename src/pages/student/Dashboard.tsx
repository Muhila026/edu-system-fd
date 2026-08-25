import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
} from '@mui/material'
import {
  Settings as SettingsIcon,
  Payments as PaymentsIcon,
  MenuBook as MenuBookIcon,
} from '@mui/icons-material'
import { motion } from 'framer-motion'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

export interface StudentDashboardProps {
  onSelectPage?: (page: string) => void
}

const shortcutItems = [
  { label: 'My Subjects', page: 'My Subjects', icon: <MenuBookIcon />, color: '#0d9488' },
  { label: 'Payment History', page: 'Payment History', icon: <PaymentsIcon />, color: '#059669' },
  { label: 'Profile & Settings', page: 'Profile & Settings', icon: <SettingsIcon />, color: '#6b7280' },
]

const StudentDashboard = (props: StudentDashboardProps): React.ReactElement => {
  const { onSelectPage } = props

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
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
          Student Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Your quick links
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
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(8, 1fr)' },
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
    </Box>
  )
}

export default StudentDashboard
