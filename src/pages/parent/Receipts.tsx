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
  CircularProgress,
  TextField,
  TablePagination,
} from '@mui/material'
import { getChildReceipts, type ChildReceipt } from '../../lib/api'
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

const ParentReceipts: React.FC = () => {
  const { loading, children, selectedChildId, setSelectedChildId } = useParentChildren()
  const [receipts, setReceipts] = useState<ChildReceipt[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [search, setSearch] = useState('')

  const filteredReceipts = receipts.filter((r) =>
    `${r.receiptNumber} ${r.type} ${r.paymentMode}`.toLowerCase().includes(search.toLowerCase())
  )

  const { page, rowsPerPage, pageItems: pagedReceipts, handleChangePage, handleChangeRowsPerPage } = usePagination(filteredReceipts, 10)

  useEffect(() => {
    if (!selectedChildId) return
    setDetailLoading(true)
    getChildReceipts(selectedChildId).then((r) => {
      setReceipts(r)
      setDetailLoading(false)
    })
  }, [selectedChildId])

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          Receipts
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Payment receipts on file
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

          <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
            <CardContent>
              <Box mb={2}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search receipts by number, type, or mode..."
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
                        <TableCell sx={{ fontWeight: 600 }}>Receipt No.</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Mode</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredReceipts.length === 0 && (
                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: THEME.muted }}>No receipts found.</TableCell></TableRow>
                      )}
                      {pagedReceipts.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.receiptNumber}</TableCell>
                          <TableCell>{r.type}</TableCell>
                          <TableCell>Rs. {r.amount.toLocaleString()}</TableCell>
                          <TableCell>{r.paymentDate}</TableCell>
                          <TableCell>{r.paymentMode}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {!detailLoading && filteredReceipts.length > 0 && (
                <TablePagination
                  component="div"
                  count={filteredReceipts.length}
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

export default ParentReceipts
