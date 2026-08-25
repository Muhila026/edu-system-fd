import React, { useEffect, useState } from 'react'
import { Box, Card, CardContent, Typography, CircularProgress, Chip } from '@mui/material'
import { EventBusy, Schedule } from '@mui/icons-material'
import { getChildFees, getChildReceipts, type ChildFeeRecord, type ChildReceipt } from '../../lib/api'
import { useParentChildren } from '../../lib/useParentChildren'
import ChildSelector from '../../components/ChildSelector'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const ParentDashboard: React.FC = () => {
  const { loading, children, selectedChildId, setSelectedChildId } = useParentChildren()
  const [fees, setFees] = useState<ChildFeeRecord[]>([])
  const [receipts, setReceipts] = useState<ChildReceipt[]>([])
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    if (!selectedChildId) return
    setSummaryLoading(true)
    Promise.all([getChildFees(selectedChildId), getChildReceipts(selectedChildId)]).then(([f, r]) => {
      setFees(f)
      setReceipts(r)
      setSummaryLoading(false)
    })
  }, [selectedChildId])

  const outstanding = fees.reduce((sum, f) => sum + (f.amount - f.paidAmount), 0)
  const todayStr = new Date().toISOString().slice(0, 10)
  const dueFees = fees
    .filter((f) => f.status !== 'Paid' && f.dueDateEnd)
    .sort((a, b) => (a.dueDateEnd! < b.dueDateEnd! ? -1 : 1))

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          Parent Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Overview of your children's fees and receipts
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress sx={{ color: THEME.primary }} />
        </Box>
      ) : children.length === 0 ? (
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
          <CardContent sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: THEME.muted }}>
              No children are linked to your account yet. Contact the school office to have your account linked to your child's record.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          <ChildSelector children={children} selectedChildId={selectedChildId} onSelect={setSelectedChildId} />

          {summaryLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={28} sx={{ color: THEME.primary }} />
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2.5 }}>
              <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
                <CardContent sx={{ py: 2.5, px: 2.5 }}>
                  <Typography variant="body2" sx={{ color: THEME.muted, mb: 0.5 }}>Outstanding Balance</Typography>
                  <Typography variant="h4" fontWeight="700" sx={{ color: outstanding > 0 ? '#991b1b' : THEME.textDark }}>
                    Rs. {outstanding.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
              <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
                <CardContent sx={{ py: 2.5, px: 2.5 }}>
                  <Typography variant="body2" sx={{ color: THEME.muted, mb: 0.5 }}>Receipts on File</Typography>
                  <Typography variant="h4" fontWeight="700" sx={{ color: THEME.textDark }}>{receipts.length}</Typography>
                </CardContent>
              </Card>
            </Box>
          )}

          {!summaryLoading && dueFees.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" fontWeight="700" sx={{ color: THEME.textDark, mb: 1.5 }}>Fees Due</Typography>
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                {dueFees.map((f) => {
                  const overdue = !!f.dueDateEnd && f.dueDateEnd < todayStr
                  const remaining = f.amount - f.paidAmount
                  return (
                    <Card key={f.id} elevation={0} sx={{ border: `1px solid ${overdue ? '#fecaca' : THEME.primaryBorder}`, borderRadius: 0, bgcolor: overdue ? '#fef2f2' : '#fff' }}>
                      <CardContent sx={{ py: 2, px: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, '&:last-child': { pb: 2 } }}>
                        <Box>
                          <Typography variant="body2" fontWeight={700} sx={{ color: THEME.textDark }}>{f.title}</Typography>
                          <Typography variant="caption" sx={{ color: THEME.muted }}>{f.feeType}</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Typography variant="body2" fontWeight={700} sx={{ color: '#991b1b' }}>Rs. {remaining.toLocaleString()} due</Typography>
                          <Chip
                            size="small"
                            icon={overdue ? <EventBusy sx={{ fontSize: 16 }} /> : <Schedule sx={{ fontSize: 16 }} />}
                            label={overdue ? `Overdue since ${f.dueDateEnd}` : `Due ${f.dueDateStart ? `${f.dueDateStart} – ` : ''}${f.dueDateEnd}`}
                            sx={{ borderRadius: 0, bgcolor: overdue ? '#fee2e2' : THEME.primaryLight, color: overdue ? '#991b1b' : THEME.primary }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  )
                })}
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  )
}

export default ParentDashboard
