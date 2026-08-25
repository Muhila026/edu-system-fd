import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  TextField,
  TablePagination,
} from '@mui/material'
import { EventBusy, Schedule } from '@mui/icons-material'
import { getChildFees, type ChildFeeRecord } from '../../lib/api'
import { useParentChildren } from '../../lib/useParentChildren'
import ChildSelector from '../../components/ChildSelector'
import { usePagination } from '../../hooks/usePagination'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const feeStatusColor = (status: ChildFeeRecord['status']) => {
  switch (status) {
    case 'Paid':
      return { bg: '#dcfce7', color: '#15803d' }
    case 'Partial':
      return { bg: '#fef3c7', color: '#92400e' }
    default:
      return { bg: '#fee2e2', color: '#991b1b' }
  }
}

const ParentFees: React.FC = () => {
  const { loading, children, selectedChildId, setSelectedChildId } = useParentChildren()
  const [fees, setFees] = useState<ChildFeeRecord[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [search, setSearch] = useState('')

  const filteredFees = fees.filter((f) =>
    `${f.title} ${f.feeType} ${f.status}`.toLowerCase().includes(search.toLowerCase())
  )
  const todayStr = new Date().toISOString().slice(0, 10)
  const pendingFees = fees
    .filter((f) => f.status !== 'Paid')
    .sort((a, b) => {
      if (a.dueDateEnd && b.dueDateEnd) return a.dueDateEnd < b.dueDateEnd ? -1 : 1
      if (a.dueDateEnd) return -1
      if (b.dueDateEnd) return 1
      return 0
    })

  const { page, rowsPerPage, pageItems: pagedFees, handleChangePage, handleChangeRowsPerPage } = usePagination(filteredFees, 10)

  const loadFees = (studentId: string) => {
    setDetailLoading(true)
    getChildFees(studentId).then((f) => {
      setFees(f)
      setDetailLoading(false)
    })
  }

  useEffect(() => {
    if (!selectedChildId) return
    loadFees(selectedChildId)
  }, [selectedChildId])

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          Fees
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Your children's fee status
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

          {pendingFees.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="700" sx={{ color: THEME.textDark, mb: 1.5 }}>Still to Pay</Typography>
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                {pendingFees.map((f) => {
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
                          {f.dueDateEnd && (
                            <Chip
                              size="small"
                              icon={overdue ? <EventBusy sx={{ fontSize: 16 }} /> : <Schedule sx={{ fontSize: 16 }} />}
                              label={overdue ? `Overdue since ${f.dueDateEnd}` : `Due ${f.dueDateStart ? `${f.dueDateStart} – ` : ''}${f.dueDateEnd}`}
                              sx={{ borderRadius: 0, bgcolor: overdue ? '#fee2e2' : THEME.primaryLight, color: overdue ? '#991b1b' : THEME.primary }}
                            />
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  )
                })}
              </Box>
            </Box>
          )}

          <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
            <CardContent>
              <Box mb={2}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search fees by title, type, or status..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Box>
              {detailLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress size={28} sx={{ color: THEME.primary }} />
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: THEME.primaryLight }}>
                        <TableCell sx={{ fontWeight: 600 }}>Fee</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Paid</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredFees.length === 0 && (
                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: THEME.muted }}>No fee records found.</TableCell></TableRow>
                      )}
                      {pagedFees.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{f.title}</Typography>
                            <Typography variant="caption" sx={{ color: THEME.muted }}>{f.feeType}</Typography>
                          </TableCell>
                          <TableCell>Rs. {f.amount.toLocaleString()}</TableCell>
                          <TableCell>Rs. {f.paidAmount.toLocaleString()}</TableCell>
                          <TableCell>{f.dueDateStart && f.dueDateEnd ? `${f.dueDateStart} – ${f.dueDateEnd}` : f.dueDateEnd || '—'}</TableCell>
                          <TableCell>
                            <Chip size="small" label={f.status} sx={{ borderRadius: 0, bgcolor: feeStatusColor(f.status).bg, color: feeStatusColor(f.status).color }} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {!detailLoading && filteredFees.length > 0 && (
                <TablePagination
                  component="div"
                  count={filteredFees.length}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[10, 25, 50]}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  )
}

export default ParentFees
