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
  TablePagination,
} from '@mui/material'
import { Assignment, ReceiptLong, EventBusy, Schedule } from '@mui/icons-material'
import {
  getMyFees,
  getMyTransactions,
  type FeeRecord,
  type TransactionRecord,
} from '../../lib/api'
import { usePagination } from '../../hooks/usePagination'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const statusColor = (status: FeeRecord['status']) => {
  switch (status) {
    case 'Paid':
      return { bg: '#dcfce7', color: '#15803d' }
    case 'Partial':
      return { bg: '#fef3c7', color: '#92400e' }
    default:
      return { bg: '#fee2e2', color: '#991b1b' }
  }
}

type Section = 'fees' | 'receipts'

const SECTIONS: Array<{ value: Section; label: string; icon: React.ReactNode }> = [
  { value: 'fees', label: 'Fee Records', icon: <Assignment /> },
  { value: 'receipts', label: 'Payment Receipts', icon: <ReceiptLong /> },
]

const MyFees: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [fees, setFees] = useState<FeeRecord[]>([])
  const [receipts, setReceipts] = useState<TransactionRecord[]>([])
  const [section, setSection] = useState<Section>('fees')

  const loadAll = () => {
    Promise.all([getMyFees(), getMyTransactions()]).then(([f, r]) => {
      setFees(f)
      setReceipts(r)
      setLoading(false)
    })
  }

  useEffect(() => {
    loadAll()
  }, [])

  const totalDue = fees.reduce((sum, f) => sum + (f.amount - f.paidAmount), 0)
  const totalPaid = fees.reduce((sum, f) => sum + f.paidAmount, 0)
  const todayStr = new Date().toISOString().slice(0, 10)
  const pendingFees = fees
    .filter((f) => f.status !== 'Paid')
    .sort((a, b) => {
      if (a.dueDateEnd && b.dueDateEnd) return a.dueDateEnd < b.dueDateEnd ? -1 : 1
      if (a.dueDateEnd) return -1
      if (b.dueDateEnd) return 1
      return 0
    })

  const { page: feesPage, rowsPerPage: feesRowsPerPage, pageItems: pagedFees, handleChangePage: handleChangeFeesPage, handleChangeRowsPerPage: handleChangeFeesRowsPerPage } = usePagination(fees, 10)
  const { page: receiptsPage, rowsPerPage: receiptsRowsPerPage, pageItems: pagedReceipts, handleChangePage: handleChangeReceiptsPage, handleChangeRowsPerPage: handleChangeReceiptsRowsPerPage } = usePagination(receipts, 10)

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
            Payment History
          </Typography>
          <Typography variant="body2" sx={{ color: THEME.muted }}>
            Your fee status and every payment you've made — fees, items and after-school classes
          </Typography>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress sx={{ color: THEME.primary }} />
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2.5, mb: 3 }}>
            <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
              <CardContent sx={{ py: 2.5, px: 2.5 }}>
                <Typography variant="body2" sx={{ color: THEME.muted, mb: 0.5 }}>Total Paid</Typography>
                <Typography variant="h4" fontWeight="700" sx={{ color: '#15803d' }}>Rs. {totalPaid.toLocaleString()}</Typography>
              </CardContent>
            </Card>
            <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
              <CardContent sx={{ py: 2.5, px: 2.5 }}>
                <Typography variant="body2" sx={{ color: THEME.muted, mb: 0.5 }}>Outstanding</Typography>
                <Typography variant="h4" fontWeight="700" sx={{ color: totalDue > 0 ? '#991b1b' : THEME.textDark }}>Rs. {totalDue.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, mb: 3 }}>
            {SECTIONS.map((s) => {
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
                  <CardContent sx={{ py: 1.5, px: 2, display: 'flex', alignItems: 'center', gap: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ color: THEME.primary, display: 'flex' }}>{s.icon}</Box>
                    <Typography variant="body2" fontWeight="600" sx={{ color: THEME.textDark }}>{s.label}</Typography>
                  </CardContent>
                </Card>
              )
            })}
          </Box>

          {section === 'fees' && (
          <>
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
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
                <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>Fee Records</Typography>
              </Box>
              {fees.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: THEME.muted }}>No fee records yet.</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: THEME.primaryLight }}>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Fee</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Amount</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Paid</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Due Date</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pagedFees.map((f) => (
                        <TableRow key={f.id} sx={{ '&:hover': { backgroundColor: THEME.primaryLight } }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} sx={{ color: THEME.textDark }}>{f.title}</Typography>
                            <Typography variant="caption" sx={{ color: THEME.muted }}>{f.feeType}</Typography>
                          </TableCell>
                          <TableCell>Rs. {f.amount.toLocaleString()}</TableCell>
                          <TableCell>Rs. {f.paidAmount.toLocaleString()}</TableCell>
                          <TableCell>{f.dueDateStart && f.dueDateEnd ? `${f.dueDateStart} – ${f.dueDateEnd}` : f.dueDateEnd || '—'}</TableCell>
                          <TableCell>
                            <Chip size="small" label={f.status} sx={{ borderRadius: 0, bgcolor: statusColor(f.status).bg, color: statusColor(f.status).color }} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {fees.length > 0 && (
                <TablePagination
                  component="div"
                  count={fees.length}
                  page={feesPage}
                  onPageChange={handleChangeFeesPage}
                  rowsPerPage={feesRowsPerPage}
                  onRowsPerPageChange={handleChangeFeesRowsPerPage}
                  rowsPerPageOptions={[10, 25, 50]}
                />
              )}
            </CardContent>
          </Card>
          </>
          )}

          {section === 'receipts' && (
          <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
                <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>Payment Receipts</Typography>
              </Box>
              {receipts.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: THEME.muted }}>No payments recorded yet.</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: THEME.primaryLight }}>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Receipt No.</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>For</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Amount</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Mode</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pagedReceipts.map((r) => (
                        <TableRow key={r.id} sx={{ '&:hover': { backgroundColor: THEME.primaryLight } }}>
                          <TableCell sx={{ color: THEME.muted }}>{r.receiptNumber}</TableCell>
                          <TableCell>
                            <Chip size="small" label={r.type} sx={{ borderRadius: 0, bgcolor: THEME.primaryLight, color: THEME.primary }} />
                          </TableCell>
                          <TableCell>{r.label}</TableCell>
                          <TableCell>Rs. {r.amount.toLocaleString()}</TableCell>
                          <TableCell>{r.paymentDate}</TableCell>
                          <TableCell>{r.paymentMode}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {receipts.length > 0 && (
                <TablePagination
                  component="div"
                  count={receipts.length}
                  page={receiptsPage}
                  onPageChange={handleChangeReceiptsPage}
                  rowsPerPage={receiptsRowsPerPage}
                  onRowsPerPageChange={handleChangeReceiptsRowsPerPage}
                  rowsPerPageOptions={[10, 25, 50]}
                />
              )}
            </CardContent>
          </Card>
          )}
        </>
      )}
    </Box>
  )
}

export default MyFees
