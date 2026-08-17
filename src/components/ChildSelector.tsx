import React from 'react'
import { Box, Card, CardContent, Typography, Avatar } from '@mui/material'
import type { ParentChild } from '../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

interface ChildSelectorProps {
  children: ParentChild[]
  selectedChildId: string | null
  onSelect: (studentId: string) => void
}

const ChildSelector: React.FC<ChildSelectorProps> = ({ children, selectedChildId, onSelect }) => (
  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
    {children.map((c) => (
      <Card
        key={c.studentId}
        elevation={0}
        onClick={() => onSelect(c.studentId)}
        sx={{
          border: `1px solid ${c.studentId === selectedChildId ? THEME.primary : THEME.primaryBorder}`,
          borderRadius: 0,
          cursor: 'pointer',
          backgroundColor: c.studentId === selectedChildId ? THEME.primaryLight : '#fff',
          minWidth: 220,
        }}
      >
        <CardContent sx={{ py: 1.5, px: 2, display: 'flex', alignItems: 'center', gap: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Avatar sx={{ bgcolor: THEME.primary, width: 36, height: 36, fontSize: '0.9rem' }}>
            {c.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ color: THEME.textDark }}>{c.name}</Typography>
            <Typography variant="caption" sx={{ color: THEME.muted }}>{c.relationship} of this student</Typography>
          </Box>
        </CardContent>
      </Card>
    ))}
  </Box>
)

export default ChildSelector
