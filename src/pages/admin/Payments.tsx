import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  CircularProgress,
  Link,
} from '@mui/material'
import { Payments as PaymentsIcon, CheckCircle, Search, ReceiptLong } from '@mui/icons-material'
import RecordPaymentDialog from '../../components/RecordPaymentDialog'
import { usePagination } from '../../hooks/usePagination'
import { getFeeRecords, getTransactions, resolveUploadUrl, type FeeRecord, type TransactionRecord } from '../../lib/api'

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

const Payments: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<FeeRecord[]>([])
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [paymentRecord, setPaymentRecord] = useState<FeeRecord | null>(null)

  const [paySearch, setPaySearch] = useState('')
  const [historySearch, setHistorySearch] = useState('')

  const loadAll = async () => {
    setLoading(true)
    const [r, t] = await Promise.all([getFeeRecords(), getTransactions()])
    setRecords(r)
    setTransactions(t)
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  // Find a student by id/name/email and pay any of their fees directly, without having to
  // first locate the right fee structure.
  const paySearchQuery = paySearch.trim().toLowerCase()
  const paySearchResults = paySearchQuery
    ? records.filter(
        (r) =>
          r.studentId.toLowerCase().includes(paySearchQuery) ||
          r.studentName.toLowerCase().includes(paySearchQuery) ||
          r.studentEmail.toLowerCase().includes(paySearchQuery)
      )
    : []

  const historyQuery = historySearch.trim().toLowerCase()
  const filteredHistory = historyQuery
    ? transactions.filter(
        (t) =>
          (t.studentName ?? '').toLowerCase().includes(historyQuery) ||
          (t.studentEmail ?? '').toLowerCase().includes(historyQuery) ||
          t.receiptNumber.toLowerCase().includes(historyQuery) ||
          t.label.toLowerCase().includes(historyQuery)
      )
    : transactions

  const { page, rowsPerPage, pageItems: pagedHistory, handleChangePage, handleChangeRowsPerPage } = usePagination(filteredHistory, 10)

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          Payments
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Find a student and take a payment, or look up past payments
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress sx={{ color: THEME.primary }} />
        </Box>
      ) : (
        <>
          {/* Search a student by id/name/email and pay any of their fees directly. */}
          <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, mb: 3 }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
                <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>Search Student to Pay</Typography>
              </Box>
              <Box sx={{ p: 2.5, pb: paySearchQuery ? 0 : 2.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by student ID, name or email..."
                  value={paySearch}
                  onChange={(e) => setPaySearch(e.target.value)}
                  InputProps={{ startAdornment: <Search fontSize="small" sx={{ color: THEME.muted, mr: 1 }} /> }}
                />
              </Box>
              {paySearchQuery && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: THEME.primaryLight }}>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Student</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Fee</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Amount</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Paid</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Status</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: THEME.textDark }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paySearchResults.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4, color: THEME.muted }}>
                            No student or fee record matches "{paySearch}".
                          </TableCell>
                        </TableRow>
                      ) : (
                        paySearchResults.map((r) => (
                          <TableRow key={r.id} sx={{ '&:hover': { backgroundColor: THEME.primaryLight } }}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600} sx={{ color: THEME.textDark }}>{r.studentName}</Typography>
                              <Typography variant="caption" sx={{ color: THEME.muted }}>{r.studentEmail}</Typography>
                            </TableCell>
                            <TableCell>{r.title}</TableCell>
                            <TableCell>Rs. {r.amount.toLocaleString()}</TableCell>
                            <TableCell>Rs. {r.paidAmount.toLocaleString()}</TableCell>
                            <TableCell>
                              <Chip size="small" label={r.status} sx={{ borderRadius: 0, bgcolor: statusColor(r.status).bg, color: statusColor(r.status).color }} />
                            </TableCell>
                            <TableCell align="right">
                              {r.status !== 'Paid' ? (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<PaymentsIcon fontSize="small" />}
                                  onClick={() => setPaymentRecord(r)}
                                  sx={{ textTransform: 'none', borderColor: THEME.primary, color: THEME.primary }}
                                >
                                  Pay
                                </Button>
                              ) : (
                                <CheckCircle fontSize="small" sx={{ color: '#15803d' }} />
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          {/* Every payment ever collected — fees, items and after-school classes. */}
          <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${THEME.primaryBorder}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReceiptLong fontSize="small" sx={{ color: THEME.primary }} />
                <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>Payment History</Typography>
              </Box>
              <Box sx={{ p: 2.5, pb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by student, receipt number, or what was paid for..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  InputProps={{ startAdornment: <Search fontSize="small" sx={{ color: THEME.muted, mr: 1 }} /> }}
                />
              </Box>
              {filteredHistory.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: THEME.muted }}>
                    {transactions.length === 0 ? 'No payments recorded yet.' : 'No payments match your search.'}
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: THEME.primaryLight }}>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Receipt No.</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Student</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>For</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Amount</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Mode</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Proof</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pagedHistory.map((t) => (
                        <TableRow key={t.id} sx={{ '&:hover': { backgroundColor: THEME.primaryLight } }}>
                          <TableCell sx={{ color: THEME.muted }}>{t.receiptNumber}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} sx={{ color: THEME.textDark }}>{t.studentName || '—'}</Typography>
                            <Typography variant="caption" sx={{ color: THEME.muted }}>{t.studentEmail}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={t.type} sx={{ borderRadius: 0, bgcolor: THEME.primaryLight, color: THEME.primary }} />
                          </TableCell>
                          <TableCell>{t.label}</TableCell>
                          <TableCell>Rs. {t.amount.toLocaleString()}</TableCell>
                          <TableCell>{t.paymentDate}</TableCell>
                          <TableCell>{t.paymentMode}</TableCell>
                          <TableCell>
                            {t.proofImageUrl ? (
                              <Link href={resolveUploadUrl(t.proofImageUrl)} target="_blank" rel="noopener noreferrer">
                                View
                              </Link>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {filteredHistory.length > 0 && (
                <TablePagination
                  component="div"
                  count={filteredHistory.length}
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

      <RecordPaymentDialog
        open={!!paymentRecord}
        record={paymentRecord}
        onClose={() => setPaymentRecord(null)}
        onSaved={loadAll}
      />
    </Box>
  )
}

export default Payments
